import { describe, expect, test } from "vitest";
import { zipSync } from "fflate";

import {
  GuideArchiveAction,
  GuideArchiveErrorCode,
  GuideArchiveValue,
  type GuideArchiveManifest,
} from "../models/guide-archive";
import { computeSha256Hex, packGuideArchive, unpackGuideArchive } from "./guide-archive";

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

const assetBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 255]);

const makeManifest = async (
  overrides: Partial<GuideArchiveManifest> = {},
): Promise<GuideArchiveManifest> => ({
  format: GuideArchiveValue.Format,
  schemaVersion: 1,
  exportedAt: "2026-11-25T10:00:00.000Z",
  app: { name: "CliqRelay", version: "0.1.0" },
  guide: { title: "Checkout flow", description: "How to complete checkout", metadata: {} },
  steps: [
    {
      type: "interaction",
      action: "click",
      actionText: "Click Checkout",
      url: "https://shop.example.com/cart",
      notes: "At the cart",
      targetElement: { selector: "#checkout" },
      canvasContent: null,
      media: [
        {
          assetPath: "assets/shot.webp",
          mimeType: "image/webp",
          altText: "Cart",
          thumbnail: "data:image/webp;base64,AAAA",
          width: 1280,
          height: 720,
          byteSize: assetBytes.byteLength,
          sha256: await computeSha256Hex(assetBytes),
        },
      ],
    },
    {
      type: "canvas",
      action: null,
      actionText: null,
      url: null,
      notes: null,
      targetElement: null,
      canvasContent: {
        type: "code",
        headingText: null,
        bodyText: null,
        language: "ts",
        code: "await checkout();",
        caption: "Checkout call",
      },
      media: [],
    },
  ],
  ...overrides,
});

const zipWithManifest = (manifest: unknown, extra: Record<string, Uint8Array> = {}) =>
  zipSync({
    [GuideArchiveValue.ManifestFileName]: encode(manifest),
    ...extra,
  });

describe("guide archive manifest", () => {
  test("round-trips every field and binary asset", async () => {
    const manifest = await makeManifest();
    const bytes = packGuideArchive(manifest, { "assets/shot.webp": assetBytes });

    const unpacked = await unpackGuideArchive(bytes);

    expect(unpacked.manifest).toEqual(manifest);
    expect(unpacked.assets["assets/shot.webp"]).toEqual(assetBytes);
    expect(unpacked.assetErrors).toEqual({});
  });

  test("accepts a zero-step backup", async () => {
    const manifest = await makeManifest({ steps: [] });
    const unpacked = await unpackGuideArchive(packGuideArchive(manifest, {}));

    expect(unpacked.manifest.steps).toEqual([]);
  });

  test("accepts a minimal V1 backup", async () => {
    const manifest = await makeManifest({ steps: [] });
    const unpacked = await unpackGuideArchive(
      zipWithManifest({
        format: GuideArchiveValue.Format,
        schemaVersion: 1,
        exportedAt: manifest.exportedAt,
        app: manifest.app,
        guide: { title: "Minimal", description: null, metadata: null },
        steps: [],
      }),
    );

    expect(unpacked.manifest.guide.title).toBe("Minimal");
  });

  test("rejects a missing manifest", async () => {
    const bytes = zipSync({ "assets/shot.webp": assetBytes });

    await expect(unpackGuideArchive(bytes)).rejects.toMatchObject({
      code: GuideArchiveErrorCode.MissingManifest,
    });
  });

  test("rejects an unknown schema version", async () => {
    const manifest = await makeManifest({ schemaVersion: 2 as 1 });

    await expect(unpackGuideArchive(zipWithManifest(manifest))).rejects.toMatchObject({
      code: GuideArchiveErrorCode.UnsupportedVersion,
    });
  });

  test("rejects an unknown step type", async () => {
    const manifest = await makeManifest();
    manifest.steps[0].type = "unknown" as "interaction";

    await expect(unpackGuideArchive(zipWithManifest(manifest))).rejects.toMatchObject({
      code: GuideArchiveErrorCode.InvalidManifest,
    });
  });

  test("rejects an unknown canvas type", async () => {
    const manifest = await makeManifest();
    manifest.steps[1].canvasContent = { type: "video" } as never;

    await expect(unpackGuideArchive(zipWithManifest(manifest))).rejects.toMatchObject({
      code: GuideArchiveErrorCode.InvalidManifest,
    });
  });

  test("ignores directory entries", async () => {
    const manifest = await makeManifest({ steps: [] });
    const unpacked = await unpackGuideArchive(
      zipWithManifest(manifest, { "assets/": new Uint8Array(0) }),
    );

    expect(unpacked.manifest.steps).toEqual([]);
    expect(unpacked.assets).toEqual({});
  });

  test("accepts a canvas step without canvas content", async () => {
    const manifest = await makeManifest();
    manifest.steps[1].canvasContent = null;

    const unpacked = await unpackGuideArchive(
      zipWithManifest(manifest, { "assets/shot.webp": assetBytes }),
    );

    expect(unpacked.manifest.steps[1]?.canvasContent).toBeNull();
  });

  test("rejects an interaction step with canvas content", async () => {
    const manifest = await makeManifest();
    manifest.steps[0].canvasContent = {
      type: "tip",
      headingText: null,
      bodyText: null,
      language: null,
      code: null,
      caption: null,
    };

    await expect(unpackGuideArchive(zipWithManifest(manifest))).rejects.toMatchObject({
      code: GuideArchiveErrorCode.InvalidManifest,
    });
  });

  test("rejects a canvas step with interaction fields", async () => {
    const manifest = await makeManifest();
    manifest.steps[1].action = GuideArchiveAction.Click;
    manifest.steps[1].actionText = "Click";
    manifest.steps[1].url = "https://example.com";
    manifest.steps[1].targetElement = { selector: "#target" };

    await expect(
      unpackGuideArchive(zipWithManifest(manifest, { "assets/shot.webp": assetBytes })),
    ).rejects.toMatchObject({
      code: GuideArchiveErrorCode.InvalidManifest,
    });
  });

  test("rejects an unsafe entry path", async () => {
    const manifest = await makeManifest();
    const bytes = zipSync({
      [GuideArchiveValue.ManifestFileName]: encode(manifest),
      "../evil.webp": assetBytes,
    });

    await expect(unpackGuideArchive(bytes)).rejects.toMatchObject({
      code: GuideArchiveErrorCode.UnsafePath,
    });
  });

  test("rejects unknown entries", async () => {
    const manifest = await makeManifest();
    const bytes = zipWithManifest(manifest, {
      "assets/shot.webp": assetBytes,
      "readme.txt": new Uint8Array([1]),
    });

    await expect(unpackGuideArchive(bytes)).rejects.toMatchObject({
      code: GuideArchiveErrorCode.InvalidArchive,
    });
  });

  test("detects a checksum mismatch without failing the archive", async () => {
    const manifest = await makeManifest();
    manifest.steps[0].media[0].sha256 = "0".repeat(64);

    const unpacked = await unpackGuideArchive(
      zipWithManifest(manifest, { "assets/shot.webp": assetBytes }),
    );

    expect(unpacked.assetErrors["assets/shot.webp"]).toBe("checksum-mismatch");
    expect(unpacked.assets["assets/shot.webp"]).toBeUndefined();
  });

  test("marks a missing referenced asset", async () => {
    const manifest = await makeManifest();
    const unpacked = await unpackGuideArchive(zipWithManifest(manifest));

    expect(unpacked.assetErrors["assets/shot.webp"]).toBe("missing-asset");
  });

  test("rejects more entries than the limit", async () => {
    const manifest = await makeManifest({ steps: [] });
    const extra: Record<string, Uint8Array> = {};
    for (let index = 0; index < 2_001; index += 1) {
      extra[`assets/${index}.webp`] = new Uint8Array([0]);
    }
    const bytes = zipWithManifest(manifest, extra);

    await expect(unpackGuideArchive(bytes)).rejects.toMatchObject({
      code: GuideArchiveErrorCode.TooManyEntries,
    });
  });

  test("rejects an asset over the per-asset limit before decompressing", async () => {
    const manifest = await makeManifest({ steps: [] });
    const bytes = zipSync({
      [GuideArchiveValue.ManifestFileName]: encode(manifest),
      "assets/huge.webp": new Uint8Array(10_485_761),
    });

    await expect(unpackGuideArchive(bytes)).rejects.toMatchObject({
      code: GuideArchiveErrorCode.AssetTooLarge,
    });
  });
});
