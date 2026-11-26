import { unzipSync, zipSync, type Zippable } from "fflate";

import {
  GuideArchiveError,
  GuideArchiveErrorCode,
  GuideArchiveLimit,
  GuideArchiveValue,
  isGuideArchiveError,
  parseGuideArchiveManifest,
  type GuideArchiveContents,
  type GuideArchiveManifest,
} from "../models/guide-archive";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const assetPathPattern = new RegExp(`^${GuideArchiveValue.AssetsDirectoryName}/[^/]+$`);

const isManifestEntry = (name: string) => name === GuideArchiveValue.ManifestFileName;

const isAssetEntry = (name: string) => assetPathPattern.test(name);

const isSafeEntryName = (name: string) => {
  if (!name || name.startsWith("/") || name.includes("\\")) {
    return false;
  }
  return !name.split("/").some((segment) => segment === "." || segment === "..");
};

const toBytes = (bytes: Uint8Array) => new Uint8Array(bytes);

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

export const computeSha256Hex = async (bytes: Uint8Array): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", toBytes(bytes)));

const randomAssetSuffix = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const extensionByMimeType: Record<string, string> = {
  [GuideArchiveValue.WebpMimeType]: "webp",
  [GuideArchiveValue.PngMimeType]: "png",
  [GuideArchiveValue.JpegMimeType]: "jpg",
};

const extensionForMimeType = (mimeType: string) => extensionByMimeType[mimeType] ?? "bin";

export const createGuideArchiveAssetPath = (mimeType: string, now = Date.now()): string => {
  const fileName = `${now}-${randomAssetSuffix()}.${extensionForMimeType(mimeType)}`;
  return `${GuideArchiveValue.AssetsDirectoryName}/${fileName}`;
};

export const buildGuideArchiveFileName = (title: string, date = new Date()): string => {
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "guide";
  const timestamp = date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  return `cliqrelay-${slug}-${timestamp}.zip`;
};

const validateManifestAssets = (
  manifest: GuideArchiveManifest,
  assets: Record<string, Uint8Array>,
) => {
  for (const step of manifest.steps) {
    for (const media of step.media) {
      if (!(media.assetPath in assets)) {
        throw new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive);
      }
    }
  }
};

export const packGuideArchive = (
  manifest: GuideArchiveManifest,
  assets: Record<string, Uint8Array>,
): Uint8Array => {
  validateManifestAssets(manifest, assets);

  const manifestBytes = textEncoder.encode(JSON.stringify(manifest, null, 2));
  const files: Zippable = {
    [GuideArchiveValue.ManifestFileName]: [manifestBytes, { level: 6 }],
  };

  for (const [path, bytes] of Object.entries(assets)) {
    if (!isAssetEntry(path)) {
      throw new GuideArchiveError(GuideArchiveErrorCode.UnsafePath);
    }
    files[path] = [toBytes(bytes), { level: 0 }];
  }

  return zipSync(files);
};

type EntryInfo = {
  name: string;
  uncompressedSize: number;
};

const collectEntries = (bytes: Uint8Array): EntryInfo[] => {
  const entries: EntryInfo[] = [];
  const seen = new Set<string>();
  let uncompressedTotal = 0;

  try {
    unzipSync(bytes, {
      filter: (file) => {
        const { name, originalSize } = file;

        if (!isSafeEntryName(name)) {
          throw new GuideArchiveError(GuideArchiveErrorCode.UnsafePath);
        }

        if (name.endsWith("/")) {
          return false;
        }

        if (!isManifestEntry(name) && !isAssetEntry(name)) {
          throw new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive);
        }

        if (seen.has(name)) {
          throw new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive);
        }
        seen.add(name);

        if (entries.length >= GuideArchiveLimit.MaxEntries) {
          throw new GuideArchiveError(GuideArchiveErrorCode.TooManyEntries);
        }

        if (isManifestEntry(name) && originalSize > GuideArchiveLimit.MaxManifestBytes) {
          throw new GuideArchiveError(GuideArchiveErrorCode.AssetTooLarge);
        }

        if (isAssetEntry(name) && originalSize > GuideArchiveLimit.MaxAssetBytes) {
          throw new GuideArchiveError(GuideArchiveErrorCode.AssetTooLarge);
        }

        uncompressedTotal += originalSize;
        if (uncompressedTotal > GuideArchiveLimit.MaxUncompressedBytes) {
          throw new GuideArchiveError(GuideArchiveErrorCode.TooLarge);
        }

        entries.push({ name, uncompressedSize: originalSize });
        return false;
      },
    });
  } catch (error) {
    if (isGuideArchiveError(error)) {
      throw error;
    }
    throw new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive);
  }

  return entries;
};

const readJson = (bytes: Uint8Array) => {
  try {
    return JSON.parse(textDecoder.decode(bytes));
  } catch {
    throw new GuideArchiveError(GuideArchiveErrorCode.InvalidManifest);
  }
};

export const unpackGuideArchive = async (bytes: Uint8Array): Promise<GuideArchiveContents> => {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new GuideArchiveError(GuideArchiveErrorCode.InvalidFile);
  }

  if (bytes.byteLength > GuideArchiveLimit.MaxCompressedBytes) {
    throw new GuideArchiveError(GuideArchiveErrorCode.TooLarge);
  }

  const entries = collectEntries(bytes);
  if (!entries.some((entry) => isManifestEntry(entry.name))) {
    throw new GuideArchiveError(GuideArchiveErrorCode.MissingManifest);
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) => !file.name.endsWith("/"),
    });
  } catch {
    throw new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive);
  }

  const manifestBytes = files[GuideArchiveValue.ManifestFileName];
  if (!manifestBytes) {
    throw new GuideArchiveError(GuideArchiveErrorCode.MissingManifest);
  }

  const manifest = parseGuideArchiveManifest(readJson(manifestBytes));

  const referenced = new Set<string>();
  for (const step of manifest.steps) {
    for (const media of step.media) {
      referenced.add(media.assetPath);
    }
  }

  for (const name of Object.keys(files)) {
    if (name.endsWith("/")) {
      continue;
    }
    if (!isManifestEntry(name) && !referenced.has(name)) {
      throw new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive);
    }
  }

  const assets: Record<string, Uint8Array> = {};
  const assetErrors: GuideArchiveContents["assetErrors"] = {};

  await Promise.all(
    manifest.steps.flatMap((step) =>
      step.media.map(async (media) => {
        if (assets[media.assetPath] || assetErrors[media.assetPath]) {
          return;
        }

        const assetBytes = files[media.assetPath];
        if (!assetBytes) {
          assetErrors[media.assetPath] = "missing-asset";
          return;
        }

        const checksum = await computeSha256Hex(assetBytes);
        if (checksum.toLowerCase() !== media.sha256.toLowerCase()) {
          assetErrors[media.assetPath] = "checksum-mismatch";
          return;
        }

        assets[media.assetPath] = assetBytes;
      }),
    ),
  );

  return { manifest, assets, assetErrors };
};
