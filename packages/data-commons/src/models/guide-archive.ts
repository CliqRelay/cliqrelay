// oxlint-disable typescript/no-duplicate-enum-values
import { z } from "zod";

export enum GuideArchiveValue {
  Format = "cliqrelay.guide-backup",
  ManifestFileName = "manifest.json",
  AssetsDirectoryName = "assets",
  ZipMimeType = "application/zip",
  WebpMimeType = "image/webp",
  PngMimeType = "image/png",
  JpegMimeType = "image/jpeg",
}

export enum GuideArchiveSchemaVersion {
  V1 = 1,
  Latest = 1,
}

export enum GuideArchiveLimit {
  MaxCompressedBytes = 262_144_000,
  MaxUncompressedBytes = 524_288_000,
  MaxEntries = 2_000,
  MaxAssetBytes = 10_485_760,
  MaxManifestBytes = 10_485_760,
  MaxSteps = 2_000,
  AssetIdRandomChars = 12,
}

export enum GuideArchiveErrorCode {
  InvalidFile = "invalid-file",
  TooLarge = "too-large",
  InvalidArchive = "invalid-archive",
  MissingManifest = "missing-manifest",
  UnsupportedVersion = "unsupported-version",
  InvalidManifest = "invalid-manifest",
  UnsafePath = "unsafe-path",
  TooManyEntries = "too-many-entries",
  AssetTooLarge = "asset-too-large",
}

export enum GuideArchiveStepType {
  Interaction = "interaction",
  Canvas = "canvas",
}

export enum GuideArchiveCanvasType {
  Header = "header",
  Tip = "tip",
  Callout = "callout",
  Alert = "alert",
  Code = "code",
}

export enum GuideArchiveAction {
  Click = "click",
  Input = "input",
  Navigation = "navigation",
  Keypress = "keypress",
}

const ERROR_MESSAGES: Record<GuideArchiveErrorCode, string> = {
  [GuideArchiveErrorCode.InvalidFile]: "This file is not a valid .zip archive.",
  [GuideArchiveErrorCode.TooLarge]: "This backup is too large. The maximum is 250 MB.",
  [GuideArchiveErrorCode.InvalidArchive]: "This file is not a valid .zip archive.",
  [GuideArchiveErrorCode.MissingManifest]: "This .zip does not contain manifest.json.",
  [GuideArchiveErrorCode.UnsupportedVersion]:
    "This backup was created by a newer version of CliqRelay.",
  [GuideArchiveErrorCode.InvalidManifest]: "This backup contains invalid guide data.",
  [GuideArchiveErrorCode.UnsafePath]: "This backup contains an unsafe file path.",
  [GuideArchiveErrorCode.TooManyEntries]: "This backup contains too many files.",
  [GuideArchiveErrorCode.AssetTooLarge]: "This backup contains a screenshot that is too large.",
};

export class GuideArchiveError extends Error {
  readonly code: GuideArchiveErrorCode;

  constructor(code: GuideArchiveErrorCode, message = ERROR_MESSAGES[code]) {
    super(message);
    this.name = "GuideArchiveError";
    this.code = code;
  }
}

export const isGuideArchiveError = (error: unknown): error is GuideArchiveError =>
  error instanceof GuideArchiveError;

const nullableString = z.string().nullable().default(null);
const nullablePositiveInteger = z.number().int().positive().nullable().default(null);

export const guideArchiveTargetElementSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .default(null);

export const guideArchiveCanvasContentSchema = z.object({
  type: z.enum(GuideArchiveCanvasType),
  headingText: nullableString,
  bodyText: nullableString,
  language: nullableString,
  code: nullableString,
  caption: nullableString,
});

export const guideArchiveMediaSchema = z.object({
  assetPath: z.string().regex(/^assets\/[^/]+$/),
  mimeType: z.string().min(1),
  altText: nullableString,
  thumbnail: nullableString,
  width: nullablePositiveInteger,
  height: nullablePositiveInteger,
  byteSize: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
});

export const guideArchiveStepSchema = z
  .object({
    type: z.enum(GuideArchiveStepType),
    action: z.enum(GuideArchiveAction).nullable().default(null),
    actionText: nullableString,
    url: nullableString,
    notes: nullableString,
    targetElement: guideArchiveTargetElementSchema,
    canvasContent: guideArchiveCanvasContentSchema.nullable().default(null),
    media: z.array(guideArchiveMediaSchema).default([]),
  })
  .superRefine((step, ctx) => {
    if (step.type === GuideArchiveStepType.Interaction) {
      if (step.canvasContent !== null) {
        ctx.addIssue({
          code: "custom",
          message: "Interaction steps cannot have canvas content.",
          path: ["canvasContent"],
        });
      }
      return;
    }

    for (const field of ["action", "actionText", "url", "targetElement"] as const) {
      if (step[field] !== null) {
        ctx.addIssue({
          code: "custom",
          message: "Canvas steps cannot have interaction fields.",
          path: [field],
        });
      }
    }
  });

export const guideArchiveGuideSchema = z.object({
  title: z.string(),
  description: nullableString,
  metadata: z.record(z.string(), z.unknown()).nullable().default(null),
});

export const guideArchiveAppSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

export const guideArchiveManifestV1Schema = z.object({
  format: z.literal(GuideArchiveValue.Format),
  schemaVersion: z.literal(GuideArchiveSchemaVersion.V1),
  exportedAt: z.iso.datetime(),
  app: guideArchiveAppSchema,
  guide: guideArchiveGuideSchema,
  steps: z.array(guideArchiveStepSchema).max(GuideArchiveLimit.MaxSteps),
});

export type GuideArchiveTargetElement = z.infer<typeof guideArchiveTargetElementSchema>;
export type GuideArchiveCanvasContent = z.infer<typeof guideArchiveCanvasContentSchema>;
export type GuideArchiveMedia = z.infer<typeof guideArchiveMediaSchema>;
export type GuideArchiveStep = z.infer<typeof guideArchiveStepSchema>;
export type GuideArchiveGuide = z.infer<typeof guideArchiveGuideSchema>;
export type GuideArchiveManifest = z.infer<typeof guideArchiveManifestV1Schema>;
export type GuideArchiveAssetError = GuideArchiveErrorCode | "missing-asset" | "checksum-mismatch";

export type GuideArchiveContents = {
  manifest: GuideArchiveManifest;
  assets: Record<string, Uint8Array>;
  assetErrors: Record<string, GuideArchiveAssetError>;
};

const schemaVersionSchema = z.object({ schemaVersion: z.number().int() });

const migrations: Record<GuideArchiveSchemaVersion, (input: unknown) => GuideArchiveManifest> = {
  [GuideArchiveSchemaVersion.V1]: (input) => guideArchiveManifestV1Schema.parse(input),
};

export const parseGuideArchiveManifest = (input: unknown): GuideArchiveManifest => {
  const versionResult = schemaVersionSchema.safeParse(input);
  if (!versionResult.success) {
    throw new GuideArchiveError(GuideArchiveErrorCode.InvalidManifest);
  }

  const version = versionResult.data.schemaVersion;
  if (version > GuideArchiveSchemaVersion.Latest) {
    throw new GuideArchiveError(GuideArchiveErrorCode.UnsupportedVersion);
  }

  const migrate = migrations[version as GuideArchiveSchemaVersion];
  if (!migrate) {
    throw new GuideArchiveError(GuideArchiveErrorCode.InvalidManifest);
  }

  try {
    return migrate(input);
  } catch (error) {
    if (isGuideArchiveError(error)) {
      throw error;
    }
    throw new GuideArchiveError(GuideArchiveErrorCode.InvalidManifest);
  }
};
