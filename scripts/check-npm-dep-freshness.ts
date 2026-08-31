#!/usr/bin/env node

// Reads a package.json, resolves the latest published version of every entry in
// `dependencies` and `devDependencies` from the npm registry, and writes the ones
// whose latest release has been public for at least N hours (24 by default) back
// into the manifest, keeping each range's existing operator (`^`, `~`, exact, ...).
// Releases younger than the threshold are held back, so the manifest never picks
// up a version that has not had time to be pulled from the registry.

import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

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

type Update = {
  name: string;
  section: DependencySection;
  from: string;
  to: string;
  publishedAt: string;
  ageHours: number;
};

type HeldBack = {
  name: string;
  section: DependencySection;
  from: string;
  to: string;
  publishedAt: string;
  ageHours: number;
};

type Skipped = {
  name: string;
  section: DependencySection;
  range: string;
  reason: string;
};

type Report = {
  minHours: number;
  checked: number;
  written: boolean;
  upToDate: number;
  updates: Update[];
  held: HeldBack[];
  skipped: Skipped[];
  errors: FailedLookup[];
};

const USAGE = `Usage: pnpm run check-npm-deps-freshness [options] [path/to/package.json]

Resolves the latest release of every registry-backed dependency and writes the ones
that have been published for at least --hours back into the package.json.

Options:
  -h, --hours <n>          Minimum age in hours of the latest release (default: ${DEFAULT_MIN_HOURS})
  -c, --concurrency <n>    Parallel registry requests (default: ${DEFAULT_CONCURRENCY})
  -n, --dry-run            Report the updates without touching the file
  -j, --json               Emit raw JSON instead of a table
      --registry <url>     Registry base URL (default: $NPM_REGISTRY or ${DEFAULT_REGISTRY})
      --help               Show this help

Examples:
  pnpm run check-npm-deps-freshness apps/web/package.json
  pnpm run check-npm-deps-freshness --hours 72 --dry-run package.json`;

const isFailedLookup = (result: LookupResult): result is FailedLookup => "error" in result;

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
    asJson: values.json,
    dryRun: values["dry-run"],
  };
};

const readDependencies = (source: string): Dependency[] => {
  const manifest = JSON.parse(source) as Manifest;

  return SECTIONS.flatMap((section) =>
    Object.entries(manifest[section] ?? {})
      .filter(([, range]) => typeof range === "string")
      .map(([name, range]) => ({ name, section, range })),
  );
};

const fetchPackageAge = async (
  name: string,
  options: CliOptions,
  now: number,
): Promise<LookupResult> => {
  const url = `${options.registry}/${name.replace("/", "%2F")}`;

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { name, error: `registry responded ${response.status} ${response.statusText}` };
    }

    const document = (await response.json()) as RegistryDocument;
    const version = document["dist-tags"]?.latest;
    const publishedAt = version ? document.time?.[version] : undefined;

    if (!version || !publishedAt) {
      return { name, error: "no latest version or publish time" };
    }

    const ageHours = (now - Date.parse(publishedAt)) / MS_PER_HOUR;
    return { name, version, publishedAt, ageHours: Math.round(ageHours * 100) / 100 };
  } catch (error) {
    return { name, error: error instanceof Error ? error.message : String(error) };
  }
};

// Runs `worker` over every item with at most `limit` requests in flight, by racing
// a fixed set of lanes that pull from a shared cursor until the queue drains.
const mapWithConcurrency = async <Item, Result>(
  items: readonly Item[],
  limit: number,
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
};

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

const buildReport = (
  dependencies: readonly Dependency[],
  lookups: ReadonlyMap<string, LookupResult>,
  minHours: number,
): Omit<Report, "written"> => {
  const updates: Update[] = [];
  const held: HeldBack[] = [];
  const skipped: Skipped[] = [];
  const errors: FailedLookup[] = [];
  let upToDate = 0;

  for (const { name, section, range } of dependencies) {
    if (NON_REGISTRY_RANGE.test(range)) {
      skipped.push({ name, section, range, reason: NOT_A_REGISTRY_RANGE });
      continue;
    }

    const lookup = lookups.get(name);
    if (!lookup) {
      continue;
    }
    if (isFailedLookup(lookup)) {
      errors.push(lookup);
      continue;
    }

    const parsed = SIMPLE_RANGE.exec(range);
    if (!parsed) {
      skipped.push({ name, section, range, reason: "unsupported range syntax" });
      continue;
    }

    const [, operator = "", current] = parsed;
    const comparison = compareVersions(lookup.version, current);

    if (comparison === 0) {
      upToDate += 1;
      continue;
    }
    if (comparison < 0) {
      skipped.push({
        name,
        section,
        range,
        reason: `pinned ahead of latest (${lookup.version})`,
      });
      continue;
    }

    const change = {
      name,
      section,
      from: range,
      to: `${operator}${lookup.version}`,
      publishedAt: lookup.publishedAt,
      ageHours: lookup.ageHours,
    };

    if (lookup.ageHours >= minHours) {
      updates.push(change);
    } else {
      held.push(change);
    }
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  return {
    minHours,
    checked: dependencies.length,
    upToDate,
    updates: updates.sort(byName),
    held: held.sort(byName),
    skipped: skipped.sort(byName),
    errors: errors.sort(byName),
  };
};

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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const applyUpdates = (source: string, updates: readonly Update[]): string => {
  if (updates.length === 0) {
    return source;
  }

  const spans = findSectionSpans(source);
  let result = source;

  // Rewrite the later sections first so earlier spans keep their offsets.
  const sections = [...new Set(updates.map((update) => update.section))].sort(
    (a, b) => (spans.get(b)?.start ?? 0) - (spans.get(a)?.start ?? 0),
  );

  for (const section of sections) {
    const span = spans.get(section);
    if (!span) {
      throw new Error(`could not locate the "${section}" object in the manifest`);
    }

    let block = result.slice(span.start, span.end);

    for (const update of updates.filter((entry) => entry.section === section)) {
      const pattern = new RegExp(
        `("${escapeRegExp(update.name)}"\\s*:\\s*)"${escapeRegExp(update.from)}"`,
      );
      if (!pattern.test(block)) {
        throw new Error(`could not locate "${update.name}" in "${section}"`);
      }
      block = block.replace(pattern, `$1"${update.to}"`);
    }

    result = result.slice(0, span.start) + block + result.slice(span.end);
  }

  return result;
};

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

const renderTable = (report: Report): string => {
  const sections: string[] = [];

  if (report.updates.length > 0) {
    const verb = report.written ? "Updated" : "Would update";
    sections.push(
      [
        `${verb} ${report.updates.length} of ${report.checked} dependencies:`,
        ...renderColumns([
          ["PACKAGE", "FROM", "TO", "AGE", "PUBLISHED"],
          ...report.updates.map((update) => [
            update.name,
            update.from,
            update.to,
            formatAge(update.ageHours),
            update.publishedAt,
          ]),
        ]),
      ].join("\n"),
    );
  } else {
    sections.push(`No dependencies to update (${report.upToDate} already at latest).`);
  }

  if (report.held.length > 0) {
    sections.push(
      [
        `Held back — latest release is younger than ${report.minHours}h:`,
        ...renderColumns(
          report.held.map((entry) => [
            `  ${entry.name}`,
            entry.from,
            `-> ${entry.to}`,
            formatAge(entry.ageHours),
          ]),
        ),
      ].join("\n"),
    );
  }

  // Workspace/file/git ranges are skipped by design and would only be noise here.
  const notable = report.skipped.filter((entry) => entry.reason !== NOT_A_REGISTRY_RANGE);
  if (notable.length > 0) {
    sections.push(
      [
        "Left alone:",
        ...renderColumns(notable.map((entry) => [`  ${entry.name}`, entry.range, entry.reason])),
      ].join("\n"),
    );
  }

  return sections.join("\n\n");
};

const main = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));
  const source = await readFile(options.packageFile, "utf8");
  const dependencies = readDependencies(source);

  if (dependencies.length === 0) {
    console.error(`No dependencies found in ${options.packageFile}`);
    return;
  }

  const names = [...new Set(dependencies.map((dependency) => dependency.name))].sort();

  console.error(
    `Checking ${names.length} dependencies from ${options.packageFile} against ${options.registry} ...`,
  );

  const now = Date.now();
  const results = await mapWithConcurrency(names, options.concurrency, (name) =>
    fetchPackageAge(name, options, now),
  );
  const lookups = new Map(results.map((result) => [result.name, result]));
  const report: Report = {
    ...buildReport(dependencies, lookups, options.minHours),
    written: false,
  };

  if (!options.dryRun && report.updates.length > 0) {
    await writeFile(options.packageFile, applyUpdates(source, report.updates));
    report.written = true;
  }

  console.log(options.asJson ? JSON.stringify(report, null, 2) : renderTable(report));

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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
