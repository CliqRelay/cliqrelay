import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { createHighlightOverlay } from "./highlight.service";
import type { HighlightOverlay } from "@/models";
import { HIGHLIGHT_HOST_ID } from "@/models";

const FIXTURE = `
  <main style="padding: 24px; display: grid; gap: 24px; max-width: 360px">
    <button id="save" style="width: 120px; height: 40px">Save</button>
    <ul id="rows" style="height: 120px; overflow: auto; margin: 0; padding: 0; list-style: none">
      ${Array.from({ length: 20 }, (_, index) => `<li style="height: 32px">Row ${index + 1}</li>`).join("")}
    </ul>
    <div id="shadow-host"></div>
  </main>
`;

let overlay: HighlightOverlay;
let box: HTMLElement;

const getById = (id: string) => document.getElementById(id) as HTMLElement;
const getRow = (index: number) => getById("rows").children[index] as HTMLElement;
const getHost = () => document.getElementById(HIGHLIGHT_HOST_ID);
const isBoxVisible = () => getComputedStyle(box).display === "block";

const roundRect = (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
  };
};

const movePointerTo = async (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  await commands.movePointer(left + width / 2, top + height / 2);
};

const expectBoxOver = (element: Element) =>
  vi.waitFor(() => {
    expect(isBoxVisible()).toBe(true);
    expect(roundRect(box)).toEqual(roundRect(element));
  });

const expectBoxHidden = () => vi.waitFor(() => expect(isBoxVisible()).toBe(false));

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const enableOverlay = () => {
  const attachShadow = vi.spyOn(HTMLElement.prototype, "attachShadow");
  overlay = createHighlightOverlay();
  overlay.enable();
  const shadowRoot = attachShadow.mock.results[0]?.value as ShadowRoot;
  box = shadowRoot.querySelector("div") as HTMLElement;
  attachShadow.mockRestore();
};

describe("highlight overlay", () => {
  beforeEach(async () => {
    await commands.movePointer(0, 0);
    document.body.style.margin = "0";
    document.body.innerHTML = FIXTURE;
    getById("shadow-host").attachShadow({ mode: "open" }).innerHTML =
      "<button>Inside shadow</button>";
    enableOverlay();
  });

  afterEach(() => {
    overlay.disable();
    document.head.querySelector("style[data-hostile]")?.remove();
  });

  describe("enable", () => {
    test("should attach a closed, click-through host above everything", () => {
      const host = getHost() as HTMLElement;
      const hostStyle = getComputedStyle(host);

      expect(host.parentElement).toBe(document.documentElement);
      expect(host.shadowRoot).toBeNull();
      expect(hostStyle.position).toBe("fixed");
      expect(hostStyle.zIndex).toBe("2147483647");
      expect(hostStyle.pointerEvents).toBe("none");
    });
  });

  describe("pointer tracking", () => {
    test("should outline the element under the pointer", async () => {
      await movePointerTo(getById("save"));
      await expectBoxOver(getById("save"));

      await movePointerTo(getRow(1));
      await expectBoxOver(getRow(1));
    });

    test("should let clicks reach the page", async () => {
      const save = getById("save");
      const onClick = vi.fn();
      save.addEventListener("click", onClick);

      await movePointerTo(save);
      await expectBoxOver(save);
      const { left, top, width, height } = save.getBoundingClientRect();

      expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(save);
      await userEvent.click(save);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("should outline elements inside open shadow roots", async () => {
      const innerButton = getById("shadow-host").shadowRoot?.querySelector("button") as Element;

      await movePointerTo(innerButton);

      await expectBoxOver(innerButton);
    });

    test("should hide when the pointer moves onto the body", async () => {
      await movePointerTo(getById("save"));
      await expectBoxOver(getById("save"));

      await commands.movePointer(window.innerWidth - 5, window.innerHeight - 5);

      await expectBoxHidden();
    });

    test("should hide when the pointer leaves the page", async () => {
      await movePointerTo(getById("save"));
      await expectBoxOver(getById("save"));

      await commands.movePointer(-10, -10);

      await expectBoxHidden();
    });
  });

  describe("layout changes", () => {
    test("should outline whatever is under the pointer after a nested scroll", async () => {
      const rowUnderPointer = getRow(2);
      const { left, top, width, height } = rowUnderPointer.getBoundingClientRect();
      const pointer = { x: left + width / 2, y: top + height / 2 };
      await commands.movePointer(pointer.x, pointer.y);
      await expectBoxOver(rowUnderPointer);

      getById("rows").scrollTop = 64;

      await vi.waitFor(() =>
        expect(document.elementFromPoint(pointer.x, pointer.y)).toBe(getRow(4)),
      );
      await expectBoxOver(getRow(4));
    });

    test("should follow the element when the viewport resizes", async () => {
      const save = getById("save");
      save.style.width = "100%";
      await movePointerTo(save);
      await expectBoxOver(save);
      const widthBeforeResize = roundRect(save).width;

      try {
        await page.viewport(360, 700);

        await vi.waitFor(() => expect(roundRect(save).width).toBeLessThan(widthBeforeResize));
        await expectBoxOver(save);
      } finally {
        await page.viewport(414, 896);
      }
    });

    test("should stay isolated from hostile page CSS", async () => {
      const style = document.createElement("style");
      style.dataset.hostile = "";
      style.textContent = `
        div { position: relative !important; z-index: 1 !important; pointer-events: auto !important; display: block !important; }
        * { transition: all 1s !important; }
      `;
      document.head.append(style);

      await movePointerTo(getById("save"));

      await expectBoxOver(getById("save"));
      const hostStyle = getComputedStyle(getHost() as HTMLElement);
      expect(hostStyle.position).toBe("fixed");
      expect(hostStyle.pointerEvents).toBe("none");
    });

    test("should re-attach the host if the page removes it", async () => {
      getHost()?.remove();

      await movePointerTo(getById("save"));

      await expectBoxOver(getById("save"));
      expect(getHost()).not.toBeNull();
    });
  });

  describe("suppress and restore", () => {
    test("should keep the box hidden until restored", async () => {
      const save = getById("save");
      await movePointerTo(save);
      await expectBoxOver(save);

      await overlay.suppress();
      expect(isBoxVisible()).toBe(false);

      await movePointerTo(getRow(0));
      await nextFrame();
      expect(isBoxVisible()).toBe(false);

      overlay.restore();
      await expectBoxOver(getRow(0));
    });

    test("should resolve straight away when nothing is highlighted", async () => {
      const onResolved = vi.fn();

      void overlay.suppress().then(onResolved);
      await Promise.resolve();

      expect(onResolved).toHaveBeenCalled();
    });
  });

  describe("user input", () => {
    test("should hide the moment the pointer is pressed, before the click lands", async () => {
      const save = getById("save");
      const visibleOnClick = vi.fn();
      save.addEventListener("click", () => visibleOnClick(isBoxVisible()));
      await movePointerTo(save);
      await expectBoxOver(save);

      await commands.pressPointer();
      expect(isBoxVisible()).toBe(false);
      await commands.releasePointer();

      expect(visibleOnClick).toHaveBeenCalledWith(false);
      overlay.restore();
      await expectBoxOver(save);
    });

    test("should hide when a key is pressed", async () => {
      await movePointerTo(getById("save"));
      await expectBoxOver(getById("save"));

      await userEvent.keyboard("{Enter}");

      expect(isBoxVisible()).toBe(false);
    });

    test("should show again on its own when no screenshot restores it", async () => {
      const save = getById("save");
      await movePointerTo(save);
      await expectBoxOver(save);

      await commands.pressPointer();
      await commands.releasePointer();
      expect(isBoxVisible()).toBe(false);

      await vi.waitFor(() => expect(isBoxVisible()).toBe(true), { timeout: 3000 });
    });
  });

  describe("disable", () => {
    test("should remove the host and stop tracking", async () => {
      overlay.disable();

      await movePointerTo(getById("save"));
      await nextFrame();

      expect(getHost()).toBeNull();
    });

    test("should track again when re-enabled", async () => {
      overlay.disable();
      overlay.enable();

      await movePointerTo(getRow(0));

      expect(getHost()?.parentElement).toBe(document.documentElement);
      await expectBoxOver(getRow(0));
    });
  });
});
