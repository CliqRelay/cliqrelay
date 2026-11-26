import { describe, expect, test, vi } from "vitest";

import type { MediaAsset, Step } from "@repo/api-client";
import type { GuideArchiveContents, GuideArchiveManifest } from "@repo/data-commons";
import {
  GuideArchiveAction,
  GuideArchiveCanvasType,
  GuideArchiveStepType,
  GuideArchiveValue,
} from "@repo/data-commons";

import { createGuideArchiveImport } from "./import.service";

const now = new Date("2026-11-25T12:00:00.000Z");
const assetBytes = new Uint8Array([1, 2, 3, 4]);
const webpBytes = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const makeMedia = (assetPath: string) => ({
  assetPath,
  mimeType: GuideArchiveValue.WebpMimeType,
  altText: "Screenshot",
  thumbnail: "data:image/webp;base64,AAAA",
  width: 1280,
  height: 720,
  byteSize: assetBytes.byteLength,
  sha256: "a".repeat(64),
});

const makeManifest = (
  overrides: Partial<GuideArchiveManifest["guide"]> = {},
  steps: GuideArchiveManifest["steps"] = [],
): GuideArchiveManifest => ({
  format: GuideArchiveValue.Format,
  schemaVersion: 1,
  exportedAt: now.toISOString(),
  app: { name: "CliqRelay", version: "0.1.0" },
  guide: {
    title: "Checkout flow",
    description: "How to complete checkout",
    metadata: { source: "extension" },
    ...overrides,
  },
  steps,
});

const interactionStep = (media: GuideArchiveManifest["steps"][number]["media"] = []) => ({
  type: GuideArchiveStepType.Interaction,
  action: GuideArchiveAction.Click,
  actionText: "Click Checkout",
  url: "https://shop.example.com/cart",
  notes: "At the cart",
  targetElement: { selector: "#checkout" },
  canvasContent: null,
  media,
});

const contents = (manifest: GuideArchiveManifest, assets: Record<string, Uint8Array>) =>
  ({
    manifest,
    assets,
    assetErrors: {},
  }) satisfies GuideArchiveContents;

const guideResponse = {
  id: "new-guide",
  title: "Checkout flow",
  status: "draft",
  visibility: "private",
  teamId: "team-1",
  creatorId: "user-1",
  durationSeconds: 0,
  isStarred: false,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const makeStep = (id: string): Step => ({
  id,
  guideId: "new-guide",
  type: "interaction",
  sortOrder: id,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

const makeDeps = (parsed: GuideArchiveContents) => {
  let stepIndex = 0;
  const uuids = ["client-guide", "client-step-1", "client-step-2", "client-step-3"];

  return {
    parseArchive: vi.fn().mockResolvedValue(parsed),
    createGuide: vi.fn().mockResolvedValue(guideResponse),
    createStep: vi.fn().mockImplementation(async () => makeStep(`step-${++stepIndex}`)),
    presignUpload: vi.fn().mockResolvedValue({
      presignedUrl: "https://s3.test/put",
      storagePath: "uploads/guide/step.webp",
    }),
    putObject: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    createMediaAsset: vi.fn().mockResolvedValue({} as MediaAsset),
    processImage: vi.fn().mockResolvedValue({
      webpBlob: new Blob([new Uint8Array([9, 9])], { type: "image/webp" }),
      thumbnailBase64: "data:image/webp;base64,BBBB",
      width: 800,
      height: 600,
    }),
    readDimensions: vi.fn().mockResolvedValue({ width: 1280, height: 720 }),
    randomUUID: vi.fn().mockImplementation(() => uuids.shift() ?? "client-fallback"),
    now: () => now,
  };
};

const file = new File([new Uint8Array([1])], "backup.zip", { type: "application/zip" });

describe("createGuideArchiveImport", () => {
  test("creates fresh guide and step client IDs", async () => {
    const manifest = makeManifest({}, [interactionStep(), interactionStep()]);
    const deps = makeDeps(contents(manifest, {}));

    const result = await createGuideArchiveImport(deps)({ file, teamId: "team-1" });

    expect(deps.createGuide).toHaveBeenCalledWith(
      expect.objectContaining({ clientGuideId: "client-guide", teamId: "team-1" }),
    );
    expect(deps.createStep.mock.calls.map(([data]) => data.clientStepId)).toEqual([
      "client-step-1",
      "client-step-2",
    ]);
    expect(result.importedSteps).toBe(2);
  });

  test("restores guide metadata and multiple media assets", async () => {
    const manifest = makeManifest({}, [
      interactionStep([makeMedia("assets/a.webp"), makeMedia("assets/b.webp")]),
    ]);
    const deps = makeDeps(
      contents(manifest, {
        "assets/a.webp": webpBytes,
        "assets/b.webp": webpBytes,
      }),
    );

    const result = await createGuideArchiveImport(deps)({ file, teamId: "team-1" });

    expect(deps.createGuide).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { source: "extension" },
        description: "How to complete checkout",
      }),
    );
    expect(deps.createMediaAsset).toHaveBeenCalledTimes(2);
    expect(deps.createMediaAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        stepId: "step-1",
        altText: "Screenshot",
        thumbnail: "data:image/webp;base64,AAAA",
        width: 1280,
        height: 720,
        mimeType: "image/webp",
      }),
    );
    expect(result.importedMedia).toBe(2);
    expect(result.partial).toBe(false);
  });

  test("regenerates an invalid exported thumbnail", async () => {
    const manifest = makeManifest({}, [interactionStep([makeMedia("assets/a.webp")])]);
    const deps = makeDeps(contents(manifest, { "assets/a.webp": webpBytes }));
    deps.readDimensions
      .mockResolvedValueOnce({ width: 1280, height: 720 })
      .mockRejectedValueOnce(new Error("Invalid thumbnail"));

    await createGuideArchiveImport(deps)({ file, teamId: "team-1" });

    expect(deps.processImage).toHaveBeenCalled();
    expect(deps.createMediaAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnail: "data:image/webp;base64,BBBB",
        width: 1280,
        height: 720,
      }),
    );
  });

  test("skips a broken screenshot and continues importing the rest", async () => {
    const manifest = makeManifest({}, [
      interactionStep([makeMedia("assets/a.webp")]),
      interactionStep([makeMedia("assets/broken.webp")]),
    ]);
    const deps = makeDeps(contents(manifest, { "assets/a.webp": webpBytes }));

    const result = await createGuideArchiveImport(deps)({ file, teamId: "team-1" });

    expect(result.importedSteps).toBe(2);
    expect(result.importedMedia).toBe(1);
    expect(result.skippedMedia).toBe(1);
    expect(result.warnings).toContain(
      "Step 2 screenshot could not be restored. The step was imported without an image.",
    );
    expect(result.partial).toBe(true);
  });

  test("skips a corrupt raw WebP screenshot", async () => {
    const manifest = makeManifest({}, [interactionStep([makeMedia("assets/a.webp")])]);
    const deps = makeDeps(contents(manifest, { "assets/a.webp": webpBytes }));
    deps.readDimensions.mockRejectedValue(new Error("decode failed"));

    const result = await createGuideArchiveImport(deps)({
      file,
      teamId: "team-1",
    });

    expect(deps.createMediaAsset).not.toHaveBeenCalled();
    expect(result.importedSteps).toBe(1);
    expect(result.importedMedia).toBe(0);
    expect(result.skippedMedia).toBe(1);
    expect(result.warnings).toContain(
      "Step 1 screenshot could not be restored. The step was imported without an image.",
    );
  });

  test("transcodes bytes that are mislabeled as WebP", async () => {
    const manifest = makeManifest({}, [interactionStep([makeMedia("assets/a.webp")])]);
    const deps = makeDeps(contents(manifest, { "assets/a.webp": pngBytes }));

    await createGuideArchiveImport(deps)({ file, teamId: "team-1" });

    const processedFile = deps.processImage.mock.calls[0][0] as File;
    expect(processedFile.type).toBe("image/png");
    expect(deps.createMediaAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "image/webp",
        thumbnail: "data:image/webp;base64,BBBB",
      }),
    );
  });

  test("uses decoded dimensions for raw WebP instead of manifest dimensions", async () => {
    const manifest = makeManifest({}, [interactionStep([makeMedia("assets/a.webp")])]);
    const deps = makeDeps(contents(manifest, { "assets/a.webp": webpBytes }));
    deps.readDimensions.mockResolvedValue({ width: 640, height: 480 });

    await createGuideArchiveImport(deps)({ file, teamId: "team-1" });

    expect(deps.createMediaAsset).toHaveBeenCalledWith(
      expect.objectContaining({ width: 640, height: 480 }),
    );
  });

  test("normalises an empty title and truncates long titles", async () => {
    const emptyDeps = makeDeps(contents(makeManifest({ title: "   " }), {}));
    await createGuideArchiveImport(emptyDeps)({ file, teamId: "team-1" });
    expect(emptyDeps.createGuide.mock.calls[0][0].title).toBe("Imported guide 2026-11-25");

    const longDeps = makeDeps(contents(makeManifest({ title: "x".repeat(300) }), {}));
    await createGuideArchiveImport(longDeps)({ file, teamId: "team-1" });
    expect(longDeps.createGuide.mock.calls[0][0].title).toHaveLength(255);
  });

  test("skips media on code canvas steps with a warning", async () => {
    const manifest = makeManifest({}, [
      {
        ...interactionStep([makeMedia("assets/a.webp")]),
        type: GuideArchiveStepType.Canvas,
        canvasContent: {
          type: GuideArchiveCanvasType.Code,
          headingText: null,
          bodyText: null,
          language: "ts",
          code: "await checkout();",
          caption: null,
        },
      },
    ]);
    const deps = makeDeps(contents(manifest, { "assets/a.webp": assetBytes }));

    const result = await createGuideArchiveImport(deps)({ file, teamId: "team-1" });

    expect(deps.createMediaAsset).not.toHaveBeenCalled();
    expect(result.skippedMedia).toBe(1);
    expect(result.warnings).toContain(
      "Step 1 screenshot could not be restored. The step was imported without an image.",
    );
  });

  test("transcodes non-WebP screenshots before uploading", async () => {
    const manifest = makeManifest({}, [
      interactionStep([{ ...makeMedia("assets/a.png"), mimeType: "image/png" }]),
    ]);
    const deps = makeDeps(contents(manifest, { "assets/a.png": assetBytes }));

    await createGuideArchiveImport(deps)({ file, teamId: "team-1" });

    expect(deps.processImage).toHaveBeenCalledWith(expect.any(File), { maxBytes: 5 * 1024 * 1024 });
    expect(deps.createMediaAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "image/webp",
        thumbnail: "data:image/webp;base64,BBBB",
        width: 800,
        height: 600,
      }),
    );
  });
});
