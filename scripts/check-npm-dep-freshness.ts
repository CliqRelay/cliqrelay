#!/usr/bin/env node

// Reads a package.json, resolves the latest published version of every entry in
// `dependencies` and `devDependencies` from the npm registry, and reports the
// packages whose latest release has been public for at least N hours (24 by default).

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const DEFAULT_REGISTRY = "https://registry.npmjs.org";
const DEFAULT_MIN_HOURS = 24;
const DEFAULT_CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 30_000;
const MS_PER_HOUR = 3_600_000;

// Ranges pointing at something other than the registry can never be resolved here.
const NON_REGISTRY_RANGE = /^(?:workspace:|file:|link:|portal:|git|https?:)/;

type CliOptions = {
  packageFile: string;
  minHours: number;
  concurrency: number;
  registry: string;
  asJson: boolean;
};

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type RegistryDocument = {
  "dist-tags"?: Record<string, string>;
  time?: Record<string, string>;
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

type Report = {
  minHours: number;
  checked: number;
  packages: PackageAge[];
  errors: FailedLookup[];
};

const USAGE = `Usage: pnpm run check-npm-deps-freshness [options] [path/to/package.json]

Options:
  -h, --hours <n>          Minimum age in hours of the latest release (default: ${DEFAULT_MIN_HOURS})
  -c, --concurrency <n>    Parallel registry requests (default: ${DEFAULT_CONCURRENCY})
  -j, --json               Emit raw JSON instead of a table
      --registry <url>     Registry base URL (default: $NPM_REGISTRY or ${DEFAULT_REGISTRY})
      --help               Show this help

Examples:
  pnpm run check-npm-deps-freshness apps/web/package.json
  pnpm run check-npm-deps-freshness --hours 72 --json package.json`;

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
  };
};

const readDependencyNames = async (packageFile: string): Promise<string[]> => {
  const manifest = JSON.parse(await readFile(packageFile, "utf8")) as Manifest;
  const ranges = { ...manifest.dependencies, ...manifest.devDependencies };

  const names = Object.entries(ranges)
    .filter(([, range]) => typeof range === "string" && !NON_REGISTRY_RANGE.test(range))
    .map(([name]) => name);

  return [...new Set(names)].sort();
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

const buildReport = (results: LookupResult[], minHours: number): Report => {
  const errors = results.filter(isFailedLookup).sort((a, b) => a.name.localeCompare(b.name));
  const packages = results
    .filter((result): result is PackageAge => !isFailedLookup(result))
    .filter((entry) => entry.ageHours >= minHours)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { minHours, checked: results.length, packages, errors };
};

const formatAge = (hours: number): string =>
  hours < 48 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;

const renderTable = (report: Report): string => {
  if (report.packages.length === 0) {
    return `No dependencies with a latest release older than ${report.minHours}h.`;
  }

  const nameWidth = Math.max(
    ...report.packages.map((entry) => entry.name.length),
    "PACKAGE".length,
  );
  const versionWidth = Math.max(
    ...report.packages.map((entry) => entry.version.length),
    "LATEST".length,
  );

  const rows = report.packages.map((entry) =>
    [
      entry.name.padEnd(nameWidth),
      entry.version.padEnd(versionWidth),
      formatAge(entry.ageHours).padEnd(6),
      entry.publishedAt,
    ].join("  "),
  );

  const header = [
    "PACKAGE".padEnd(nameWidth),
    "LATEST".padEnd(versionWidth),
    "AGE".padEnd(6),
    "PUBLISHED",
  ].join("  ");
  const summary = `${report.packages.length}/${report.checked} packages have a latest release at least ${report.minHours}h old.`;

  return [header, ...rows, "", summary].join("\n");
};

const main = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));
  const names = await readDependencyNames(options.packageFile);

  if (names.length === 0) {
    console.error(`No registry-backed dependencies found in ${options.packageFile}`);
    return;
  }

  console.error(
    `Checking ${names.length} dependencies from ${options.packageFile} against ${options.registry} ...`,
  );

  const now = Date.now();
  const results = await mapWithConcurrency(names, options.concurrency, (name) =>
    fetchPackageAge(name, options, now),
  );
  const report = buildReport(results, options.minHours);

  console.log(options.asJson ? JSON.stringify(report, null, 2) : renderTable(report));

  if (!options.asJson && report.errors.length > 0) {
    console.error("\nFailed lookups:");
    for (const failure of report.errors) {
      console.error(`  ${failure.name}: ${failure.error}`);
    }
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
