// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCaptureService } from "./capture.service";
import type { CaptureEventPayload } from "@/models";

const createHarness = () => {
  const sink = vi.fn();
  const service = createCaptureService(sink);
  const stop = service.start(document);

  const input = document.createElement("input");
  document.body.append(input);

  const payloads = (): CaptureEventPayload[] =>
    sink.mock.calls.map(([message]) => message.payload as CaptureEventPayload);

  const typingPayloads = (): CaptureEventPayload[] =>
    payloads().filter((payload) => payload.typedText != null);

  const type = (key: string) => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    vi.advanceTimersByTime(500);
  };

  return { sink, stop, input, payloads, typingPayloads, type };
};

describe("capture service typing session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("reuses one typing session id within a typing burst", () => {
    const { typingPayloads, type } = createHarness();

    type("a");
    type("b");

    const [first, second] = typingPayloads();
    expect(first?.typedText).toBe("a");
    expect(second?.typedText).toBe("ab");
    expect(first?.typingSessionId).toEqual(expect.any(String));
    expect(second?.typingSessionId).toBe(first?.typingSessionId);
  });

  test("starts a new typing session after the field blurs", () => {
    const { input, typingPayloads, type } = createHarness();

    type("a");
    input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    type("b");

    const [first, second] = typingPayloads();
    expect(first?.typingSessionId).toEqual(expect.any(String));
    expect(second?.typingSessionId).toEqual(expect.any(String));
    expect(second?.typingSessionId).not.toBe(first?.typingSessionId);
  });

  test("starts a new typing session after Enter", () => {
    const { input, typingPayloads, type } = createHarness();

    type("a");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    vi.advanceTimersByTime(500);
    type("b");

    const [first, , afterEnter] = typingPayloads();
    expect(afterEnter?.typingSessionId).not.toBe(first?.typingSessionId);
  });

  test("starts a new typing session after clicking away", () => {
    const { typingPayloads, type } = createHarness();

    type("a");
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    type("b");

    const [first, second] = typingPayloads();
    expect(second?.typingSessionId).not.toBe(first?.typingSessionId);
  });

  test("starts a new typing session after navigation", () => {
    const { typingPayloads, type } = createHarness();

    type("a");
    window.dispatchEvent(new Event("pagehide"));
    type("b");

    const [first, second] = typingPayloads();
    expect(second?.typingSessionId).not.toBe(first?.typingSessionId);
  });

  test("ends the typing session when the field becomes empty", () => {
    const { input, typingPayloads, type } = createHarness();

    type("a");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
    vi.advanceTimersByTime(500);
    type("b");

    const [first, cleared, next] = typingPayloads();
    expect(cleared?.typedText).toBe("");
    expect(cleared?.typingSessionId).toBe(first?.typingSessionId);
    expect(next?.typingSessionId).not.toBe(first?.typingSessionId);
  });

  test("flushes and ends the session when the content script is invalidated", () => {
    const { input, stop, typingPayloads } = createHarness();

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
    expect(typingPayloads()).toHaveLength(0);

    stop();

    const [first] = typingPayloads();
    expect(first?.typedText).toBe("x");
    expect(first?.typingSessionId).toEqual(expect.any(String));
  });
});
