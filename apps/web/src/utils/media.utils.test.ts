import { describe, expect, test } from "vitest";

import {
  readIndicatorPosition,
  resolveIndicatorViewport,
  resolveMediaLayout,
  withIndicatorPosition,
  withoutIndicator,
} from "./media.utils";

describe("resolveMediaLayout", () => {
  const target = {
    clickX: 640,
    clickY: 200,
    viewportWidth: 1280,
    viewportHeight: 800,
  };

  test("uses viewport shape and shows the dot when the asset has no dimensions", () => {
    const layout = resolveMediaLayout(target, { width: null, height: null });

    expect(layout.aspectRatio).toBe("1280 / 800");
    expect(layout.overlay).toEqual({ left: "50%", top: "25%" });
  });

  test("shows the dot when asset dimensions match at device pixel ratio 2", () => {
    const layout = resolveMediaLayout(target, { width: 2560, height: 1600 });

    expect(layout.aspectRatio).toBe("2560 / 1600");
    expect(layout.overlay).toEqual({ left: "50%", top: "25%" });
  });

  test("uses the asset shape and hides the dot when shapes disagree", () => {
    const layout = resolveMediaLayout(target, { width: 800, height: 1200 });

    expect(layout.aspectRatio).toBe("800 / 1200");
    expect(layout.overlay).toBeUndefined();
  });

  test("returns nothing when neither viewport nor asset dimensions exist", () => {
    expect(resolveMediaLayout(undefined, undefined)).toEqual({
      aspectRatio: undefined,
    });
    expect(resolveMediaLayout({ clickX: 1, clickY: 1 }, { width: null, height: null })).toEqual({
      aspectRatio: undefined,
    });
  });

  test("uses asset shape without a dot when the viewport is missing", () => {
    const layout = resolveMediaLayout({ clickX: 10, clickY: 10 }, { width: 400, height: 300 });

    expect(layout.aspectRatio).toBe("400 / 300");
    expect(layout.overlay).toBeUndefined();
  });

  test("hides the dot when the click position is missing", () => {
    const layout = resolveMediaLayout({ viewportWidth: 1280, viewportHeight: 800 }, undefined);

    expect(layout.aspectRatio).toBe("1280 / 800");
    expect(layout.overlay).toBeUndefined();
  });
});

describe("readIndicatorPosition", () => {
  test("reads camelCase click coordinates as normalised positions", () => {
    expect(
      readIndicatorPosition({
        clickX: 640,
        clickY: 200,
        viewportWidth: 1280,
        viewportHeight: 800,
      }),
    ).toEqual({ x: 0.5, y: 0.25 });
  });

  test("clamps positions outside the viewport", () => {
    expect(
      readIndicatorPosition({
        clickX: -40,
        clickY: 900,
        viewportWidth: 1280,
        viewportHeight: 800,
      }),
    ).toEqual({ x: 0, y: 1 });
  });

  test("returns null when the viewport dimensions are missing", () => {
    expect(readIndicatorPosition({ clickX: 10, clickY: 10 })).toBeNull();
  });

  test("returns null when the click coordinates are missing", () => {
    expect(readIndicatorPosition({ viewportWidth: 1280, viewportHeight: 800 })).toBeNull();
  });

  test("returns null for an empty target element", () => {
    expect(readIndicatorPosition(undefined)).toBeNull();
    expect(readIndicatorPosition(null)).toBeNull();
  });
});

describe("withIndicatorPosition", () => {
  test("converts normalised positions back to viewport pixels", () => {
    expect(
      withIndicatorPosition(
        { viewportWidth: 1280, viewportHeight: 800 },
        { x: 0.25, y: 0.75 },
        { width: 1280, height: 800 },
      ),
    ).toEqual({
      clickX: 320,
      clickY: 600,
      viewportWidth: 1280,
      viewportHeight: 800,
    });
  });

  test("keeps unrelated target element keys", () => {
    const target = {
      clickX: 1,
      clickY: 2,
      viewportWidth: 100,
      viewportHeight: 100,
      boundingBox: { x: 10, y: 20 },
    };

    expect(withIndicatorPosition(target, { x: 0.5, y: 0.5 }, { width: 200, height: 100 })).toEqual({
      clickX: 100,
      clickY: 50,
      viewportWidth: 200,
      viewportHeight: 100,
      boundingBox: { x: 10, y: 20 },
    });
  });

  test("rounds pixel values", () => {
    expect(
      withIndicatorPosition(undefined, { x: 1 / 3, y: 2 / 3 }, { width: 3, height: 3 }),
    ).toEqual({
      clickX: 1,
      clickY: 2,
      viewportWidth: 3,
      viewportHeight: 3,
    });
  });
});

describe("withoutIndicator", () => {
  test("removes only the click coordinates", () => {
    expect(
      withoutIndicator({
        clickX: 640,
        clickY: 200,
        viewportWidth: 1280,
        viewportHeight: 800,
        boundingBox: { x: 10, y: 20 },
      }),
    ).toEqual({
      viewportWidth: 1280,
      viewportHeight: 800,
      boundingBox: { x: 10, y: 20 },
    });
  });

  test("returns an empty object for a missing target element", () => {
    expect(withoutIndicator(undefined)).toEqual({});
    expect(withoutIndicator(null)).toEqual({});
  });

  test("does not mutate the source target element", () => {
    const target = { clickX: 1, clickY: 2, viewportWidth: 10, viewportHeight: 10 };

    withoutIndicator(target);

    expect(target).toEqual({
      clickX: 1,
      clickY: 2,
      viewportWidth: 10,
      viewportHeight: 10,
    });
  });
});

describe("resolveIndicatorViewport", () => {
  test("prefers the target element viewport", () => {
    expect(
      resolveIndicatorViewport(
        { viewportWidth: 1280, viewportHeight: 800 },
        { width: 2560, height: 1600 },
        { naturalWidth: 640, naturalHeight: 400 },
      ),
    ).toEqual({ width: 1280, height: 800 });
  });

  test("falls back to the media dimensions", () => {
    expect(
      resolveIndicatorViewport(
        { clickX: 1, clickY: 1 },
        { width: 2560, height: 1600 },
        { naturalWidth: 640, naturalHeight: 400 },
      ),
    ).toEqual({ width: 2560, height: 1600 });
  });

  test("falls back to the loaded image dimensions", () => {
    expect(
      resolveIndicatorViewport(
        undefined,
        { width: null, height: null },
        {
          naturalWidth: 640,
          naturalHeight: 400,
        },
      ),
    ).toEqual({ width: 640, height: 400 });
  });

  test("returns null when no dimensions are available", () => {
    expect(resolveIndicatorViewport(undefined, { width: null, height: null }, null)).toBeNull();
  });
});
