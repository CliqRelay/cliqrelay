// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createHighlightOverlay } from "./highlight.service";
import type { HighlightOverlay } from "@/models";
import { HIGHLIGHT_HOST_ID } from "@/models";

let frameCallbacks: FrameRequestCallback[] = [];

const flushFrame = () => {
  const callbacks = frameCallbacks;
  frameCallbacks = [];
  for (const callback of callbacks) {
    callback(0);
  }
};

const attachShadowSpy = vi.spyOn(HTMLElement.prototype, "attachShadow");

let overlays: HighlightOverlay[] = [];

const setup = () => {
  const overlay = createHighlightOverlay();
  overlays.push(overlay);
  overlay.enable();
  return overlay;
};

const getBox = () => {
  const shadowRoot = attachShadowSpy.mock.results[0]?.value as ShadowRoot;
  return shadowRoot.querySelector("div") as HTMLDivElement;
};

const createTarget = (rect = { left: 10, top: 20, width: 100, height: 40 }) => {
  const element = document.createElement("button");
  document.body.append(element);
  const getBoundingClientRect = vi.fn(() => rect as DOMRect);
  element.getBoundingClientRect = getBoundingClientRect;
  return { element, getBoundingClientRect };
};

const hover = (element: Element, path: EventTarget[] = [element]) => {
  const event = new Event("pointerover", { bubbles: true, composed: true });
  event.composedPath = () => path;
  element.dispatchEvent(event);
};

describe("highlight overlay", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    frameCallbacks = [];
    attachShadowSpy.mockClear();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => frameCallbacks.push(callback)),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    for (const overlay of overlays) {
      overlay.disable();
    }
    overlays = [];
    vi.unstubAllGlobals();
  });

  describe("enable", () => {
    test("should attach an isolated, click-through host to the document element", () => {
      setup();

      const host = document.getElementById(HIGHLIGHT_HOST_ID);
      expect(host?.parentElement).toBe(document.documentElement);
      expect(attachShadowSpy).toHaveBeenCalledWith({ mode: "closed" });
      expect(host?.style.getPropertyValue("pointer-events")).toBe("none");
      expect(host?.style.getPropertyPriority("pointer-events")).toBe("important");
      expect(host?.style.getPropertyValue("z-index")).toBe("2147483647");
    });
  });

  describe("pointerover", () => {
    test("should position the box over the hovered element on the next frame", () => {
      setup();
      const { element } = createTarget();

      hover(element);
      expect(getBox().style.display).not.toBe("block");
      flushFrame();

      const box = getBox();
      expect(box.style.display).toBe("block");
      expect(box.style.width).toBe("100px");
      expect(box.style.height).toBe("40px");
      expect(box.style.transform).toBe("translate3d(10px, 20px, 0)");
    });

    test("should measure once per frame when several events arrive", () => {
      setup();
      const first = createTarget();
      const second = createTarget();

      hover(first.element);
      hover(second.element);
      flushFrame();

      expect(first.getBoundingClientRect).not.toHaveBeenCalled();
      expect(second.getBoundingClientRect).toHaveBeenCalledTimes(1);
    });

    test("should ignore repeat hovers on the same element", () => {
      setup();
      const { element } = createTarget();

      hover(element);
      flushFrame();
      hover(element);

      expect(frameCallbacks).toHaveLength(0);
    });

    test("should use the deepest element from the composed path", () => {
      setup();
      const shadowHost = document.createElement("div");
      document.body.append(shadowHost);
      const inner = document.createElement("span");
      shadowHost.attachShadow({ mode: "open" }).append(inner);
      const getBoundingClientRect = vi.fn(
        () => ({ left: 1, top: 2, width: 3, height: 4 }) as DOMRect,
      );
      inner.getBoundingClientRect = getBoundingClientRect;

      hover(shadowHost, [inner, shadowHost]);
      flushFrame();

      expect(getBoundingClientRect).toHaveBeenCalled();
      expect(getBox().style.transform).toBe("translate3d(1px, 2px, 0)");
    });

    test("should hide the box when hovering the body", () => {
      setup();
      const { element } = createTarget();
      hover(element);
      flushFrame();

      hover(document.body);
      flushFrame();

      expect(getBox().style.display).toBe("none");
    });

    test("should hide the box for zero-size elements", () => {
      setup();
      const { element } = createTarget({ left: 0, top: 0, width: 0, height: 0 });

      hover(element);
      flushFrame();

      expect(getBox().style.display).toBe("none");
    });
  });

  describe("pointerout", () => {
    test("should hide the box when the pointer leaves the window", () => {
      setup();
      const { element } = createTarget();
      hover(element);
      flushFrame();

      element.dispatchEvent(new Event("pointerout", { bubbles: true }));
      flushFrame();

      expect(getBox().style.display).toBe("none");
    });
  });

  describe("scroll and resize", () => {
    test("should re-measure on nested scroll and on window resize", () => {
      setup();
      const { element, getBoundingClientRect } = createTarget();
      hover(element);
      flushFrame();

      element.dispatchEvent(new Event("scroll"));
      flushFrame();
      window.dispatchEvent(new Event("resize"));
      flushFrame();

      expect(getBoundingClientRect).toHaveBeenCalledTimes(3);
    });
  });

  describe("disable", () => {
    test("should remove the host, listeners and pending frame", () => {
      const overlay = setup();
      const { element } = createTarget();
      hover(element);

      overlay.disable();

      expect(document.getElementById(HIGHLIGHT_HOST_ID)).toBeNull();
      expect(cancelAnimationFrame).toHaveBeenCalled();
      frameCallbacks = [];
      hover(createTarget().element);
      expect(frameCallbacks).toHaveLength(0);
    });

    test("should re-attach the host when enabled again", () => {
      const overlay = setup();
      overlay.disable();

      overlay.enable();

      expect(document.getElementById(HIGHLIGHT_HOST_ID)).not.toBeNull();
      expect(attachShadowSpy).toHaveBeenCalledTimes(1);
    });

    test("should re-attach a host removed by the page when rendering", () => {
      setup();
      document.getElementById(HIGHLIGHT_HOST_ID)?.remove();

      hover(createTarget().element);
      flushFrame();

      expect(document.getElementById(HIGHLIGHT_HOST_ID)).not.toBeNull();
    });
  });

  describe("suppress and restore", () => {
    test("should resolve immediately when the box is hidden", async () => {
      const overlay = setup();

      await expect(overlay.suppress()).resolves.toBeUndefined();
      expect(frameCallbacks).toHaveLength(0);
    });

    test("should hide a visible box and resolve after two frames", async () => {
      const overlay = setup();
      hover(createTarget().element);
      flushFrame();

      const resolved = vi.fn();
      void overlay.suppress().then(resolved);

      expect(getBox().style.display).toBe("none");
      flushFrame();
      await Promise.resolve();
      expect(resolved).not.toHaveBeenCalled();
      flushFrame();
      await Promise.resolve();
      expect(resolved).toHaveBeenCalled();
    });

    test("should keep the box hidden while suppressed and show it on restore", async () => {
      const overlay = setup();
      const { element } = createTarget();
      hover(element);
      flushFrame();
      void overlay.suppress();
      frameCallbacks = [];

      window.dispatchEvent(new Event("resize"));
      flushFrame();
      expect(getBox().style.display).toBe("none");

      overlay.restore();
      flushFrame();
      expect(getBox().style.display).toBe("block");
    });
  });
});
