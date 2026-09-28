import type { HighlightOverlay } from "@/models";
import { HIGHLIGHT_HOST_ID, HIGHLIGHT_STYLE } from "@/models";
import { HIGHLIGHT_RESTORE_FALLBACK_MS } from "@/utils/constants";

const HOST_STYLE = [
  "all: initial",
  "position: fixed",
  "top: 0",
  "left: 0",
  "width: 0",
  "height: 0",
  "z-index: 2147483647",
  "pointer-events: none",
]
  .map((declaration) => `${declaration} !important;`)
  .join("");

const SHADOW_STYLE = `
:host { all: initial; }
div {
	position: fixed;
	top: 0;
	left: 0;
	box-sizing: border-box;
	pointer-events: none;
	will-change: transform;
	border: ${HIGHLIGHT_STYLE.borderWidth}px solid ${HIGHLIGHT_STYLE.color};
	background: ${HIGHLIGHT_STYLE.fill};
	border-radius: ${HIGHLIGHT_STYLE.radius}px;
	display: none;
}`;

const LISTENER_OPTIONS = { capture: true, passive: true } as const;

export const createHighlightOverlay = (root: Document = document): HighlightOverlay => {
  const win = root.defaultView ?? window;
  let host: HTMLDivElement | null = null;
  let box: HTMLDivElement | null = null;
  let target: Element | null = null;
  let frame = 0;
  let enabled = false;
  let suppressed = false;
  let restoreFallback: ReturnType<typeof setTimeout> | undefined;

  const ensureHost = () => {
    if (!host) {
      host = root.createElement("div");
      host.id = HIGHLIGHT_HOST_ID;
      host.style.cssText = HOST_STYLE;

      const shadowRoot = host.attachShadow({ mode: "closed" });
      const style = root.createElement("style");
      style.textContent = SHADOW_STYLE;
      box = root.createElement("div");
      shadowRoot.append(style, box);
    }

    if (!host.isConnected) {
      root.documentElement.append(host);
    }
  };

  const hideBox = () => {
    if (box) {
      box.style.display = "none";
    }
  };

  const render = () => {
    frame = 0;
    if (!box) {
      return;
    }

    const rect = !suppressed && target?.isConnected ? target.getBoundingClientRect() : null;
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      hideBox();
      return;
    }

    ensureHost();
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    box.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    box.style.display = "block";
  };

  const scheduleRender = () => {
    if (!frame) {
      frame = win.requestAnimationFrame(render);
    }
  };

  const setTarget = (next: Element | null) => {
    if (next === target) {
      return;
    }
    target = next;
    scheduleRender();
  };

  const handlePointerOver = (event: PointerEvent) => {
    const [element] = event.composedPath();
    const isHighlightable =
      element instanceof Element && element !== root.documentElement && element !== root.body;
    setTarget(isHighlightable ? element : null);
  };

  const handlePointerOut = (event: PointerEvent) => {
    if (!event.relatedTarget) {
      setTarget(null);
    }
  };

  const restore = () => {
    clearTimeout(restoreFallback);
    suppressed = false;
    if (enabled) {
      scheduleRender();
    }
  };

  // Hides synchronously so the frame captured for a click or key step never includes the box.
  // The background restores it once the screenshot is taken; the fallback covers uncaptured input.
  const hideUntilRestored = () => {
    suppressed = true;
    hideBox();
    clearTimeout(restoreFallback);
    restoreFallback = setTimeout(restore, HIGHLIGHT_RESTORE_FALLBACK_MS);
  };

  return {
    enable: () => {
      if (enabled) {
        return;
      }
      enabled = true;
      ensureHost();
      root.addEventListener("pointerover", handlePointerOver, LISTENER_OPTIONS);
      root.addEventListener("pointerout", handlePointerOut, LISTENER_OPTIONS);
      root.addEventListener("pointerdown", hideUntilRestored, LISTENER_OPTIONS);
      root.addEventListener("keydown", hideUntilRestored, LISTENER_OPTIONS);
      win.addEventListener("scroll", scheduleRender, LISTENER_OPTIONS);
      win.addEventListener("resize", scheduleRender, { passive: true });
    },
    disable: () => {
      if (!enabled) {
        return;
      }
      enabled = false;
      root.removeEventListener("pointerover", handlePointerOver, true);
      root.removeEventListener("pointerout", handlePointerOut, true);
      root.removeEventListener("pointerdown", hideUntilRestored, true);
      root.removeEventListener("keydown", hideUntilRestored, true);
      win.removeEventListener("scroll", scheduleRender, true);
      win.removeEventListener("resize", scheduleRender);
      if (frame) {
        win.cancelAnimationFrame(frame);
        frame = 0;
      }
      clearTimeout(restoreFallback);
      target = null;
      suppressed = false;
      hideBox();
      host?.remove();
    },
    suppress: () => {
      const wasVisible = box?.style.display === "block";
      hideUntilRestored();

      if (!wasVisible || root.hidden) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
      });
    },
    restore,
  };
};
