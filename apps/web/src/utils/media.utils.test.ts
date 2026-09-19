import { describe, expect, test } from "vitest";

import { resolveMediaLayout } from "./media.utils";

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
    expect(
      resolveMediaLayout(
        { clickX: 1, clickY: 1 },
        { width: null, height: null },
      ),
    ).toEqual({
      aspectRatio: undefined,
    });
  });

  test("uses asset shape without a dot when the viewport is missing", () => {
    const layout = resolveMediaLayout(
      { clickX: 10, clickY: 10 },
      { width: 400, height: 300 },
    );

    expect(layout.aspectRatio).toBe("400 / 300");
    expect(layout.overlay).toBeUndefined();
  });

  test("hides the dot when the click position is missing", () => {
    const layout = resolveMediaLayout(
      { viewportWidth: 1280, viewportHeight: 800 },
      undefined,
    );

    expect(layout.aspectRatio).toBe("1280 / 800");
    expect(layout.overlay).toBeUndefined();
  });
});
