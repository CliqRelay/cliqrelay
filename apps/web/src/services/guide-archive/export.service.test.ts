import { describe, expect, test, vi } from "vitest";

import type { Guide, Step } from "@repo/api-client";
import { GuideArchiveStepType } from "@repo/data-commons";

import { GuideArchiveExportError, createGuideArchiveExport } from "./export.service";

const now = new Date("2026-11-25T10:11:12.000Z");
const bytes = new Uint8Array([1, 2, 3, 4]);

const guide: Guide = {
  id: "guide-1",
  title: "Checkout flow",
  description: "How to complete checkout",
  metadata: { source: "extension" },
  status: "draft",
  visibility: "private",
  teamId: "team-1",
  creatorId: "user-1",
  durationSeconds: 0,
  isStarred: false,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const makeStep = (overrides: Partial<Step>): Step => ({
  id: "step-1",
  guideId: guide.id,
  type: "interaction",
  sortOrder: "0",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  ...overrides,
});

const interactionStep = makeStep({
  id: "step-1",
  action: "click",
  actionText: "Click Checkout",
  url: "https://shop.example.com/cart",
  notes: "At the cart",
  targetElement: { selector: "#checkout" },
  mediaAssets: [
    {
      id: "media-1",
      stepId: "step-1",
      storagePath: "uploads/1.webp",
      url: "https://cdn.example.com/1.webp",
      mimeType: "image/webp",
      altText: "Cart",
      thumbnail: "data:image/webp;base64,AAAA",
      width: 1280,
      height: 720,
      byteSize: 4,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "media-2",
      stepId: "step-1",
      storagePath: "uploads/2.webp",
      url: "https://cdn.example.com/2.webp",
      mimeType: "image/webp",
      altText: null,
      thumbnail: null,
      width: 640,
      height: 360,
      byteSize: 4,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ],
});

const canvasStep = makeStep({
  id: "step-2",
  type: "canvas",
  action: null,
  actionText: null,
  url: null,
  notes: null,
  targetElement: null,
  canvasContent: {
    type: "code",
    language: "ts",
    code: "await checkout();",
    caption: "Checkout call",
    headingText: null,
    bodyText: null,
  },
  mediaAssets: [],
});

const makeDeps = () => ({
  fetchSteps: vi.fn().mockResolvedValue([interactionStep, canvasStep]),
  fetchAsset: vi.fn().mockResolvedValue({ bytes, mimeType: "image/webp" }),
  pack: vi.fn().mockResolvedValue(new Uint8Array([9, 9])),
  now: () => now,
});

describe("createGuideArchiveExport", () => {
  test("fetches the full step list directly instead of using cached pages", async () => {
    const deps = makeDeps();
    const exportArchive = createGuideArchiveExport(deps);

    await exportArchive({ guide });

    expect(deps.fetchSteps).toHaveBeenCalledWith(guide.id, undefined);
    expect(deps.fetchSteps).toHaveBeenCalledTimes(1);
  });

  test("includes canvas steps, notes, target elements, metadata and every media asset", async () => {
    const deps = makeDeps();
    const exportArchive = createGuideArchiveExport(deps);

    await exportArchive({ guide });

    const [manifest, assets] = deps.pack.mock.calls[0];
    expect(manifest.guide).toEqual({
      title: guide.title,
      description: guide.description,
      metadata: guide.metadata,
    });
    expect(manifest.steps).toHaveLength(2);
    expect(manifest.steps[0]).toMatchObject({
      type: GuideArchiveStepType.Interaction,
      action: "click",
      actionText: "Click Checkout",
      url: "https://shop.example.com/cart",
      notes: "At the cart",
      targetElement: { selector: "#checkout" },
    });
    expect(manifest.steps[0].media).toHaveLength(2);
    expect(manifest.steps[1]).toMatchObject({
      type: GuideArchiveStepType.Canvas,
      canvasContent: {
        type: "code",
        language: "ts",
        code: "await checkout();",
        caption: "Checkout call",
      },
    });
    expect(Object.keys(assets)).toHaveLength(2);
    expect(Object.values(assets)).toEqual([bytes, bytes]);
  });

  test("fails closed with the affected steps when a screenshot cannot be fetched", async () => {
    const deps = makeDeps();
    deps.fetchAsset.mockRejectedValueOnce(new Error("CDN exploded"));
    const exportArchive = createGuideArchiveExport(deps);

    const error = await exportArchive({ guide }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GuideArchiveExportError);
    expect((error as GuideArchiveExportError).failures).toEqual([
      { stepNumber: 1, message: "CDN exploded" },
    ]);
    expect(deps.pack).not.toHaveBeenCalled();
  });

  test("can skip missing screenshots and still pack the remaining guide", async () => {
    const deps = makeDeps();
    deps.fetchAsset.mockRejectedValueOnce(new Error("CDN exploded"));
    const exportArchive = createGuideArchiveExport(deps);

    const result = await exportArchive({ guide, downloadWithoutMissingScreenshots: true });

    const [manifest, assets] = deps.pack.mock.calls[0];
    expect(result.skipped).toHaveLength(1);
    expect(manifest.steps[0].media).toHaveLength(1);
    expect(manifest.steps[1]).toBeDefined();
    expect(Object.keys(assets)).toHaveLength(1);
  });

  test("reports fetch and packing progress", async () => {
    const deps = makeDeps();
    const onProgress = vi.fn();

    await createGuideArchiveExport(deps)({ guide, onProgress });

    expect(onProgress).toHaveBeenCalledWith({ phase: "fetching", completed: 0, total: 2 });
    expect(onProgress).toHaveBeenCalledWith({ phase: "fetching", completed: 2, total: 2 });
    expect(onProgress).toHaveBeenCalledWith({ phase: "packing", completed: 1, total: 1 });
  });
});
