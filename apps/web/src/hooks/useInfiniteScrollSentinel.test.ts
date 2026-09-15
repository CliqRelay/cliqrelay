// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useInfiniteScrollSentinel } from "./useInfiniteScrollSentinel";

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

const observers: FakeObserver[] = [];

class FakeObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(
    public callback: ObserverCallback,
    public options: IntersectionObserverInit | undefined,
  ) {
    observers.push(this);
  }
}

const renderSentinel = (options: Partial<Parameters<typeof useInfiniteScrollSentinel>[0]> = {}) => {
  const onIntersect = vi.fn();
  const element = document.createElement("div");
  const hook = renderHook(
    (props: Partial<Parameters<typeof useInfiniteScrollSentinel>[0]>) =>
      useInfiniteScrollSentinel({
        enabled: true,
        onIntersect,
        ...options,
        ...props,
      }),
    {
      initialProps: {},
      wrapper: undefined,
    },
  );
  return { ...hook, onIntersect, element };
};

describe("useInfiniteScrollSentinel", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("does not observe until the ref is attached", () => {
    renderSentinel();

    expect(observers).toHaveLength(0);
  });

  test("does not observe when disabled", () => {
    const { result, rerender, element } = renderSentinel({ enabled: false });
    result.current.current = element;

    rerender({ enabled: false });

    expect(observers).toHaveLength(0);
  });

  test("observes the sentinel and reports intersections", () => {
    const { result, rerender, element, onIntersect } = renderSentinel();
    result.current.current = element;

    rerender({ enabled: true, rootMargin: "100px 0px" });

    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledWith(element);
    expect(observers[0].options).toEqual({ root: null, rootMargin: "100px 0px" });

    observers[0].callback([{ isIntersecting: false }]);
    expect(onIntersect).not.toHaveBeenCalled();

    observers[0].callback([{ isIntersecting: true }]);
    expect(onIntersect).toHaveBeenCalledTimes(1);
  });

  test("uses the provided root element", () => {
    const root = document.createElement("div");
    const { result, rerender, element } = renderSentinel();
    result.current.current = element;

    rerender({ rootRef: { current: root } });

    expect(observers[0].options?.root).toBe(root);
  });

  test("disconnects on unmount and re-subscribes when re-enabled", () => {
    const { result, rerender, element, unmount } = renderSentinel({
      enabled: false,
    });
    result.current.current = element;
    rerender({ enabled: true });
    expect(observers).toHaveLength(1);

    rerender({ enabled: false });
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);

    rerender({ enabled: true });
    expect(observers).toHaveLength(2);

    unmount();
    expect(observers[1].disconnect).toHaveBeenCalledTimes(1);
  });
});
