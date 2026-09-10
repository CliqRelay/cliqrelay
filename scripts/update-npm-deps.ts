#!/usr/bin/env node

// Reads a package.json, resolves the latest published version of every entry in
// `dependencies` and `devDependencies` from the npm registry, and writes the ones
// whose latest release has been public for at least N hours (24 by default) back
// into the manifest, keeping each range's existing operator (`^`, `~`, exact, ...).
// Releases younger than the threshold are held back, so the manifest never picks
// up a version that has not had time to be pulled from the registry.

import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

// Dependencies this script must never bump. Entries are matched against the package
// name and may use `*` as a wildcard, e.g. "@types/*" or "eslint-plugin-*".
const EXCLUDED_DEPENDENCIES: readonly string[] = [];

const DEFAULT_REGISTRY = "https://registry.npmjs.org";
const DEFAULT_MIN_HOURS = 24;
const DEFAULT_CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 30_000;
const MS_PER_HOUR = 3_600_000;

const SECTIONS = ["dependencies", "devDependencies"] as const;

// Ranges pointing at something other than the registry can never be resolved here.
const NON_REGISTRY_RANGE = /^(?:workspace:|file:|link:|portal:|git|https?:|catalog:|npm:)/;

const NOT_A_REGISTRY_RANGE = "not a registry range";

// Only single-comparator ranges can be rewritten without changing their meaning.
const SIMPLE_RANGE = /^(\^|~|>=|<=|>|<|=)?(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)$/;

type DependencySection = (typeof SECTIONS)[number];

type CliOptions = {
  packageFile: string;
  minHours: number;
  concurrency: number;
  registry: string;
  exclude: string[];
  asJson: boolean;
  dryRun: boolean;
};

type Manifest = Partial<Record<DependencySection, Record<string, string>>>;

type RegistryDocument = {
  "dist-tags"?: Record<string, string>;
  time?: Record<string, string>;
};

type Dependency = {
  name: string;
  section: DependencySection;
  range: string;
};

type PackageAge = {
  name: string;
  version: string;
  publishedAt: string;
  ageHours: number;
};

type FailedLookup = {
  name: string;
  error: string;
};

type LookupResult = PackageAge | FailedLookup;

type Lookups = ReadonlyMap<string, LookupResult>;

type Change = {
  name: string;
  section: DependencySection;
  from: string;
  to: string;
  publishedAt: string;
  ageHours: number;
};

type Excluded = {
  name: string;
  section: DependencySection;
  range: string;
  pattern: string;
};

type Skipped = {
  name: string;
  section: DependencySection;
  range: string;
  reason: string;
};

type Buckets = {
  upToDate: number;
  updates: Change[];
  held: Change[];
  excluded: Excluded[];
  skipped: Skipped[];
  errors: FailedLookup[];
};

type Report = Buckets & {
  minHours: number;
  checked: number;
  written: boolean;
};

type Classification =
  | { kind: "up-to-date" }
  | { kind: "update"; entry: Change }
  | { kind: "held"; entry: Change }
  | { kind: "excluded"; entry: Excluded }
  | { kind: "skipped"; entry: Skipped }
  | { kind: "error"; entry: FailedLookup };

const USAGE = `Usage: pnpm run update-npm-deps [options] [path/to/package.json]

Resolves the latest release of every registry-backed dependency and writes the ones
that have been published for at least --hours back into the package.json.

Options:
  -h, --hours <n>          Minimum age in hours of the latest release (default: ${DEFAULT_MIN_HOURS})
  -c, --concurrency <n>    Parallel registry requests (default: ${DEFAULT_CONCURRENCY})
  -x, --exclude <name>     Package to leave alone; repeatable, supports "*" wildcards
  -n, --dry-run            Report the updates without touching the file
  -j, --json               Emit raw JSON instead of a table
      --registry <url>     Registry base URL (default: $NPM_REGISTRY or ${DEFAULT_REGISTRY})
      --help               Show this help

Examples:
  pnpm run update-npm-deps apps/web/package.json
  pnpm run update-npm-deps --hours 72 --dry-run package.json
  pnpm run update-npm-deps --exclude typescript --exclude "@types/*"`;

// --- shared helpers ---------------------------------------------------------

const isFailedLookup = (result: LookupResult): result is FailedLookup => "error" in result;

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// Compares two release versions well enough to tell an upgrade from a downgrade:
// numeric core first, then any prerelease suffix, which always sorts below a release.
const compareVersions = (left: string, right: string): number => {
  const [leftCore = "", leftPre = ""] = left.split("-", 2);
  const [rightCore = "", rightPre = ""] = right.split("-", 2);
  const leftParts = leftCore.split(".").map(Number);
  const rightParts = rightCore.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  if (leftPre === rightPre) {
    return 0;
  }
  if (leftPre === "" || rightPre === "") {
    return leftPre === "" ? 1 : -1;
  }
  return leftPre < rightPre ? -1 : 1;
};

// --- exclusions -------------------------------------------------------------

const toWildcardPattern = (pattern: string): RegExp =>
  new RegExp(`^${pattern.split("*").map(escapeRegExp).join(".*")}$`);

const createExclusionMatcher = (patterns: readonly string[]) => {
  const matchers = patterns.map((pattern) => ({ pattern, matches: toWildcardPattern(pattern) }));

  return {
    // The pattern that excludes `name`, or undefined when the package is fair game.
    find: (name: string): string | undefined =>
      matchers.find((matcher) => matcher.matches.test(name))?.pattern,
  };
};

type ExclusionMatcher = ReturnType<typeof createExclusionMatcher>;

// --- registry ---------------------------------------------------------------

const createRegistryClient = (registry: string, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const documentUrl = (name: string) => `${registry}/${name.replace("/", "%2F")}`;

  const readDocument = async (name: string): Promise<RegistryDocument> => {
    const response = await fetch(documentUrl(name), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`registry responded ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as RegistryDocument;
  };

  const fetchLatest = async (name: string, now: number): Promise<LookupResult> => {
    try {
      const document = await readDocument(name);
      const version = document["dist-tags"]?.latest;
      const publishedAt = version ? document.time?.[version] : undefined;

      if (!version || !publishedAt) {
        return { name, error: "no latest version or publish time" };
      }

      const ageHours = (now - Date.parse(publishedAt)) / MS_PER_HOUR;
      return { name, version, publishedAt, ageHours: Math.round(ageHours * 100) / 100 };
    } catch (error) {
      return { name, error: toMessage(error) };
    }
  };

  return { fetchLatest };
};

// Runs `worker` over every item with at most `limit` calls in flight, by racing
// a fixed set of lanes that pull from a shared cursor until the queue drains.
const createTaskPool = (limit: number) => ({
  map: async <Item, Result>(
    items: readonly Item[],
    worker: (item: Item) => Promise<Result>,
  ): Promise<Result[]> => {
    const results = Array.from<Result>({ length: items.length });
    let cursor = 0;

    const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index]);
      }
    });

    await Promise.all(lanes);
    return results;
  },
});

// --- manifest ---------------------------------------------------------------

type Span = { start: number; end: number };

const findStringEnd = (source: string, start: number): number => {
  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === "\\") {
      index += 1;
      continue;
    }
    if (source[index] === '"') {
      return index;
    }
  }
  throw new Error("unterminated string in package.json");
};

// Locates the exact byte range of each top-level dependency object so the rewrite can
// be surgical: everything outside those braces (key order, indentation, blank lines,
// trailing newline) survives untouched, which a JSON.parse/stringify round-trip loses.
const findSectionSpans = (source: string): Map<string, Span> => {
  const spans = new Map<string, Span>();
  const stack: { key: string | undefined; start: number; depth: number }[] = [];
  let pendingKey: string | undefined;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '"') {
      const end = findStringEnd(source, index);
      let next = end + 1;
      while (next < source.length && /\s/.test(source[next])) {
        next += 1;
      }
      pendingKey = source[next] === ":" ? source.slice(index + 1, end) : undefined;
      index = end;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push({ key: pendingKey, start: index, depth: stack.length });
      pendingKey = undefined;
      continue;
    }

    if (char === "}" || char === "]") {
      const frame = stack.pop();
      if (frame?.key && frame.depth === 1 && char === "}") {
        spans.set(frame.key, { start: frame.start, end: index + 1 });
      }
    }
  }

  return spans;
};

const rewriteSection = (block: string, updates: readonly Change[], section: string): string =>
  updates.reduce((current, update) => {
    const pattern = new RegExp(
      `("${escapeRegExp(update.name)}"\\s*:\\s*)"${escapeRegExp(update.from)}"`,
    );
    if (!pattern.test(current)) {
      throw new Error(`could not locate "${update.name}" in "${section}"`);
    }
    return current.replace(pattern, `$1"${update.to}"`);
  }, block);

const createManifest = (source: string) => {
  const dependencies = (): Dependency[] => {
    const manifest = JSON.parse(source) as Manifest;

    return SECTIONS.flatMap((section) =>
      Object.entries(manifest[section] ?? {})
        .filter(([, range]) => typeof range === "string")
        .map(([name, range]) => ({ name, section, range })),
    );
  };

  const withUpdates = (updates: readonly Change[]): string => {
    if (updates.length === 0) {
      return source;
    }

    const spans = findSectionSpans(source);

    // Rewrite the later sections first so earlier spans keep their offsets.
    const sections = [...new Set(updates.map((update) => update.section))].sort(
      (a, b) => (spans.get(b)?.start ?? 0) - (spans.get(a)?.start ?? 0),
    );

    return sections.reduce((result, section) => {
      const span = spans.get(section);
      if (!span) {
        throw new Error(`could not locate the "${section}" object in the manifest`);
      }

      const block = rewriteSection(
        result.slice(span.start, span.end),
        updates.filter((update) => update.section === section),
        section,
      );

      return result.slice(0, span.start) + block + result.slice(span.end);
    }, source);
  };

  return { dependencies, withUpdates };
};

// --- report -----------------------------------------------------------------

const emptyBuckets = (): Buckets => ({
  upToDate: 0,
  updates: [],
  held: [],
  excluded: [],
  skipped: [],
  errors: [],
});

const collect = (buckets: Buckets, classification: Classification): Buckets => {
  switch (classification.kind) {
    case "up-to-date":
      return { ...buckets, upToDate: buckets.upToDate + 1 };
    case "update":
      return { ...buckets, updates: [...buckets.updates, classification.entry] };
    case "held":
      return { ...buckets, held: [...buckets.held, classification.entry] };
    case "excluded":
      return { ...buckets, excluded: [...buckets.excluded, classification.entry] };
    case "skipped":
      return { ...buckets, skipped: [...buckets.skipped, classification.entry] };
    case "error":
      return { ...buckets, errors: [...buckets.errors, classification.entry] };
  }
};

const sortBuckets = (buckets: Buckets): Buckets => ({
  ...buckets,
  updates: [...buckets.updates].sort(byName),
  held: [...buckets.held].sort(byName),
  excluded: [...buckets.excluded].sort(byName),
  skipped: [...buckets.skipped].sort(byName),
  errors: [...buckets.errors].sort(byName),
});

const createReportBuilder = (minHours: number, exclusions: ExclusionMatcher) => {
  const classify = (
    { name, section, range }: Dependency,
    lookup: LookupResult | undefined,
  ): Classification => {
    const skip = (reason: string): Classification => ({
      kind: "skipped",
      entry: { name, section, range, reason },
    });

    const pattern = exclusions.find(name);
    if (pattern) {
      return { kind: "excluded", entry: { name, section, range, pattern } };
    }
    if (NON_REGISTRY_RANGE.test(range)) {
      return skip(NOT_A_REGISTRY_RANGE);
    }
    if (!lookup) {
      return skip("not resolved against the registry");
    }
    if (isFailedLookup(lookup)) {
      return { kind: "error", entry: lookup };
    }

    const parsed = SIMPLE_RANGE.exec(range);
    if (!parsed) {
      return skip("unsupported range syntax");
    }

    const [, operator = "", current = ""] = parsed;
    const comparison = compareVersions(lookup.version, current);

    if (comparison === 0) {
      return { kind: "up-to-date" };
    }
    if (comparison < 0) {
      return skip(`pinned ahead of latest (${lookup.version})`);
    }

    const entry: Change = {
      name,
      section,
      from: range,
      to: `${operator}${lookup.version}`,
      publishedAt: lookup.publishedAt,
      ageHours: lookup.ageHours,
    };

    return lookup.ageHours >= minHours ? { kind: "update", entry } : { kind: "held", entry };
  };

  const build = (
    dependencies: readonly Dependency[],
    lookups: Lookups,
  ): Omit<Report, "written"> => {
    const buckets = dependencies.reduce(
      (accumulated, dependency) =>
        collect(accumulated, classify(dependency, lookups.get(dependency.name))),
      emptyBuckets(),
    );

    return { ...sortBuckets(buckets), minHours, checked: dependencies.length };
  };

  return { build };
};

// --- rendering --------------------------------------------------------------

const formatAge = (hours: number): string =>
  hours < 48 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;

const renderColumns = (rows: readonly string[][]): string[] => {
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => row[column]?.length ?? 0)),
  );
  return rows.map((row) =>
    row
      .map((cell, column) => cell.padEnd(widths[column]))
      .join("  ")
      .trimEnd(),
  );
};

const renderBlock = (heading: string, rows: readonly string[][]): string =>
  [heading, ...renderColumns(rows)].join("\n");

const renderUpdates = (report: Report): string =>
  report.updates.length === 0
    ? `No dependencies to update (${report.upToDate} already at latest).`
    : renderBlock(
        `${report.written ? "Updated" : "Would update"} ${report.updates.length} of ${report.checked} dependencies:`,
        [
          ["PACKAGE", "FROM", "TO", "AGE", "PUBLISHED"],
          ...report.updates.map((update) => [
            update.name,
            update.from,
            update.to,
            formatAge(update.ageHours),
            update.publishedAt,
          ]),
        ],
      );

const renderHeld = (report: Report): string | undefined =>
  report.held.length === 0
    ? undefined
    : renderBlock(
        `Held back — latest release is younger than ${report.minHours}h:`,
        report.held.map((entry) => [
          `  ${entry.name}`,
          entry.from,
          `-> ${entry.to}`,
          formatAge(entry.ageHours),
        ]),
      );

const renderExcluded = (report: Report): string | undefined =>
  report.excluded.length === 0
    ? undefined
    : renderBlock(
        "Excluded:",
        report.excluded.map((entry) => [
          `  ${entry.name}`,
          entry.range,
          entry.name === entry.pattern ? "" : `matched "${entry.pattern}"`,
        ]),
      );

// Workspace/file/git ranges are skipped by design and would only be noise here.
const renderSkipped = (report: Report): string | undefined => {
  const notable = report.skipped.filter((entry) => entry.reason !== NOT_A_REGISTRY_RANGE);

  return notable.length === 0
    ? undefined
    : renderBlock(
        "Left alone:",
        notable.map((entry) => [`  ${entry.name}`, entry.range, entry.reason]),
      );
};

const createReportRenderer = (asJson: boolean) => ({
  render: (report: Report): string =>
    asJson
      ? JSON.stringify(report, null, 2)
      : [renderUpdates(report), renderHeld(report), renderExcluded(report), renderSkipped(report)]
          .filter((section) => section !== undefined)
          .join("\n\n"),
});

// --- cli --------------------------------------------------------------------

const parsePositiveInteger = (value: string, flag: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} expects a positive integer, got: ${value}`);
  }
  return parsed;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      hours: { type: "string", short: "h", default: String(DEFAULT_MIN_HOURS) },
      concurrency: { type: "string", short: "c", default: String(DEFAULT_CONCURRENCY) },
      exclude: { type: "string", short: "x", multiple: true, default: [] },
      "dry-run": { type: "boolean", short: "n", default: false },
      json: { type: "boolean", short: "j", default: false },
      registry: { type: "string", default: process.env.NPM_REGISTRY ?? DEFAULT_REGISTRY },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  return {
    packageFile: positionals[0] ?? "package.json",
    minHours: parsePositiveInteger(values.hours, "--hours"),
    concurrency: parsePositiveInteger(values.concurrency, "--concurrency"),
    registry: values.registry.replace(/\/+$/, ""),
    exclude: [...EXCLUDED_DEPENDENCIES, ...values.exclude],
    asJson: values.json,
    dryRun: values["dry-run"],
  };
};

// --- runner -----------------------------------------------------------------

const createUpdateRunner = (options: CliOptions) => {
  const exclusions = createExclusionMatcher(options.exclude);
  const registry = createRegistryClient(options.registry);
  const pool = createTaskPool(options.concurrency);
  const reportBuilder = createReportBuilder(options.minHours, exclusions);
  const renderer = createReportRenderer(options.asJson);

  const isResolvable = ({ name, range }: Dependency): boolean =>
    !exclusions.find(name) && !NON_REGISTRY_RANGE.test(range);

  const resolveLatest = async (dependencies: readonly Dependency[]): Promise<Lookups> => {
    const names = [...new Set(dependencies.filter(isResolvable).map(({ name }) => name))].sort();

    console.error(
      `Checking ${names.length} dependencies from ${options.packageFile} against ${options.registry} ...`,
    );

    const now = Date.now();
    const results = await pool.map(names, (name) => registry.fetchLatest(name, now));

    return new Map(results.map((result) => [result.name, result]));
  };

  const run = async (): Promise<void> => {
    const source = await readFile(options.packageFile, "utf8");
    const manifest = createManifest(source);
    const dependencies = manifest.dependencies();

    if (dependencies.length === 0) {
      console.error(`No dependencies found in ${options.packageFile}`);
      return;
    }

    const summary = reportBuilder.build(dependencies, await resolveLatest(dependencies));
    const written = !options.dryRun && summary.updates.length > 0;

    if (written) {
      await writeFile(options.packageFile, manifest.withUpdates(summary.updates));
    }

    const report: Report = { ...summary, written };
    console.log(renderer.render(report));

    if (!options.asJson && report.errors.length > 0) {
      console.error("\nFailed lookups:");
      for (const failure of report.errors) {
        console.error(`  ${failure.name}: ${failure.error}`);
      }
    }

    if (report.written) {
      console.error(`\nWrote ${report.updates.length} version(s) to ${options.packageFile}.`);
      console.error("Run your package manager's install to refresh the lockfile.");
    }
  };

  return { run };
};

createUpdateRunner(parseCliOptions(process.argv.slice(2)))
  .run()
  .catch((error: unknown) => {
    console.error(toMessage(error));
    process.exitCode = 1;
  });
