import { beforeEach, describe, expect, test, vi } from "vitest";

import { CliqRelayEvents } from "@repo/data-commons";

import { createOutboxWriter } from "./outbox-writer.service";
import type {
  CaptureBridgeMessage,
  LocalSession,
  LocalStep,
  RecordingLifecycleStore,
} from "@/models";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";

const NOW = "2026-11-24T10:00:00.000Z";
const TAB_ID = 5;

const session: LocalSession = {
  id: "session-1",
  userId: "user-1",
  guideId: "guide-1",
  clientGuideId: "client-1",
  startedAt: NOW,
  lastActivityAt: NOW,
  nextStepIndex: 0,
};

const createMessage = (
  payload: Partial<CaptureBridgeMessage["payload"]>,
): CaptureBridgeMessage => ({
  source: "content-script",
  type: CliqRelayEvents.CAPTURE_EVENT,
  payload: {
    action: "click",
    url: "https://angular.dev",
    capturedAt: NOW,
    ...payload,
  },
});

const createStep = (overrides: Partial<LocalStep> = {}): LocalStep => ({
  id: "step-1",
  sessionId: session.id,
  guideId: session.guideId,
  stepIndex: 0,
  kind: "interaction",
  action: "click",
  url: "https://angular.dev",
  capturedAt: NOW,
  syncStatus: "pending",
  retryCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const setup = (status: "idle" | "recording" | "paused" | "stopped" = "recording") => {
  const lifecycleStore = {
    get: vi.fn().mockResolvedValue({ status, isSignedOut: false, sessionId: session.id }),
    set: vi.fn(),
    patch: vi.fn(),
  } as unknown as RecordingLifecycleStore;

  const repository = {
    getSession: vi.fn().mockResolvedValue(session),
    getLastStep: vi.fn().mockResolvedValue(undefined),
    appendStep: vi.fn().mockResolvedValue(createStep()),
    appendStepWithBlobs: vi.fn().mockResolvedValue(createStep()),
    upsertTypingStep: vi.fn().mockResolvedValue(createStep({ action: "input" })),
    deleteTypingStep: vi.fn().mockResolvedValue(true),
  } as unknown as OutboxRepository;

  const screenshotService = {
    captureWithThrottle: vi.fn().mockResolvedValue("data:image/png;base64,abc123"),
  };

  const processScreenshot = vi.fn().mockResolvedValue({
    screenshotBlob: new Blob(["screenshot"]),
    thumbnailBlob: new Blob(["thumbnail"]),
    width: 100,
    height: 50,
  });

  const writer = createOutboxWriter({
    repository,
    lifecycleStore,
    screenshotService,
    processScreenshot,
  });

  return { writer, repository, lifecycleStore, screenshotService, processScreenshot };
};

describe("outbox writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("writeCapture", () => {
    test("writes the initial navigation and the capture with the same screenshot blobs", async () => {
      const { writer, repository, screenshotService, processScreenshot } = setup();
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const message = createMessage({
        targetElement: { tagName: "BUTTON", innerText: "Sign in" },
      });

      await writer.writeCapture(message, TAB_ID);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(repository.getSession).toHaveBeenCalledWith(session.id);
      expect(screenshotService.captureWithThrottle).toHaveBeenCalledWith(TAB_ID, undefined);
      expect(processScreenshot).toHaveBeenCalledWith("data:image/png;base64,abc123");
      expect(repository.appendStep).not.toHaveBeenCalled();

      const calls = vi.mocked(repository.appendStepWithBlobs).mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0]?.[0]).toEqual({
        sessionId: session.id,
        guideId: session.guideId,
        kind: "navigation",
        action: "navigation",
        actionText: 'Navigate to "https://angular.dev"',
        url: "https://angular.dev",
        capturedAt: NOW,
      });
      expect(calls[1]?.[0]).toEqual(
        expect.objectContaining({
          sessionId: session.id,
          guideId: session.guideId,
          kind: "interaction",
          action: "click",
          actionText: 'Click "Sign in"',
          url: "https://angular.dev",
          capturedAt: NOW,
          targetElement: { tagName: "BUTTON", innerText: "Sign in" },
        }),
      );
      expect(calls[0]?.[1]).toBe(calls[1]?.[1]);

      fetchSpy.mockRestore();
    });

    test("does not add an initial navigation when steps already exist", async () => {
      const { writer, repository } = setup();
      vi.mocked(repository.getLastStep).mockResolvedValue(createStep());

      await writer.writeCapture(createMessage({}), TAB_ID);

      expect(repository.appendStep).not.toHaveBeenCalled();
      expect(repository.appendStepWithBlobs).toHaveBeenCalledTimes(1);
    });

    test("does not write when recording is not active", async () => {
      const { writer, repository, screenshotService } = setup("paused");

      await writer.writeCapture(createMessage({}), TAB_ID);

      expect(repository.getSession).not.toHaveBeenCalled();
      expect(screenshotService.captureWithThrottle).not.toHaveBeenCalled();
    });

    test("writes a screenshot-less navigation step when the screenshot fails", async () => {
      const { writer, repository, screenshotService } = setup();
      screenshotService.captureWithThrottle.mockResolvedValue(null);

      await writer.writeCapture(createMessage({}), TAB_ID);

      expect(repository.appendStep).toHaveBeenCalledWith({
        sessionId: session.id,
        guideId: session.guideId,
        kind: "navigation",
        action: "navigation",
        actionText: 'Navigate to "https://angular.dev"',
        url: "https://angular.dev",
        capturedAt: NOW,
      });
      expect(repository.appendStepWithBlobs).not.toHaveBeenCalled();
    });
  });

  describe("writeTyping", () => {
    test("upserts one local step per typing session", async () => {
      const { writer, repository, screenshotService } = setup();
      vi.mocked(repository.getLastStep).mockResolvedValue(createStep());
      const message = createMessage({
        action: "input",
        typedText: "helo",
        typingSessionId: "typing-1",
      });

      await writer.writeTyping(message, TAB_ID);

      expect(screenshotService.captureWithThrottle).not.toHaveBeenCalled();
      expect(repository.upsertTypingStep).toHaveBeenCalledWith({
        sessionId: session.id,
        guideId: session.guideId,
        kind: "interaction",
        action: "input",
        actionText: 'Type "helo"',
        url: "https://angular.dev",
        capturedAt: NOW,
        typingSessionId: "typing-1",
      });
    });

    test("writes the initial navigation with a screenshot before the typing step", async () => {
      const { writer, repository, screenshotService, processScreenshot } = setup();
      vi.mocked(repository.getLastStep).mockResolvedValue(undefined);
      const message = createMessage({
        action: "input",
        typedText: "helo",
        typingSessionId: "typing-1",
      });

      await writer.writeTyping(message, TAB_ID);

      expect(screenshotService.captureWithThrottle).toHaveBeenCalledWith(TAB_ID, undefined);
      expect(processScreenshot).toHaveBeenCalledWith("data:image/png;base64,abc123");
      expect(repository.appendStepWithBlobs).toHaveBeenCalledWith(
        {
          sessionId: session.id,
          guideId: session.guideId,
          kind: "navigation",
          action: "navigation",
          actionText: 'Navigate to "https://angular.dev"',
          url: "https://angular.dev",
          capturedAt: NOW,
        },
        {
          screenshot: expect.any(Blob),
          thumbnail: expect.any(Blob),
        },
      );
      expect(repository.upsertTypingStep).toHaveBeenCalledWith({
        sessionId: session.id,
        guideId: session.guideId,
        kind: "interaction",
        action: "input",
        actionText: 'Type "helo"',
        url: "https://angular.dev",
        capturedAt: NOW,
        typingSessionId: "typing-1",
      });
    });

    test("deletes the typing step when the field becomes empty", async () => {
      const { writer, repository } = setup();
      const message = createMessage({
        action: "input",
        typedText: "",
        typingSessionId: "typing-1",
      });

      await writer.writeTyping(message, TAB_ID);

      expect(repository.deleteTypingStep).toHaveBeenCalledWith(session.id, "typing-1");
      expect(repository.upsertTypingStep).not.toHaveBeenCalled();
    });

    test("drops an input capture without a typing session id", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { writer, repository } = setup();

      await writer.writeTyping(createMessage({ action: "input", typedText: "hello" }), TAB_ID);

      expect(repository.upsertTypingStep).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        "[background] Dropped typing capture without a typing session id",
      );
      warn.mockRestore();
    });
  });

  describe("writeNavigation", () => {
    test("skips a consecutive navigation to the same URL", async () => {
      const { writer, repository } = setup();
      vi.mocked(repository.getLastStep).mockResolvedValue(
        createStep({ kind: "navigation", action: "navigation" }),
      );

      await writer.writeNavigation({
        url: "https://angular.dev",
        capturedAt: NOW,
        tabId: TAB_ID,
      });

      expect(repository.appendStep).not.toHaveBeenCalled();
      expect(repository.appendStepWithBlobs).not.toHaveBeenCalled();
    });

    test("writes a screenshot-less navigation record without a tab", async () => {
      const { writer, repository, screenshotService } = setup();

      await writer.writeNavigation({ url: "https://angular.dev/guide", capturedAt: NOW });

      expect(screenshotService.captureWithThrottle).not.toHaveBeenCalled();
      expect(repository.appendStep).toHaveBeenCalledWith({
        sessionId: session.id,
        guideId: session.guideId,
        kind: "navigation",
        action: "navigation",
        actionText: 'Navigate to "https://angular.dev/guide"',
        url: "https://angular.dev/guide",
        capturedAt: NOW,
      });
    });

    test("captures a navigation screenshot when a tab is available", async () => {
      const { writer, repository, screenshotService, processScreenshot } = setup();
      vi.mocked(repository.getLastStep).mockResolvedValue(undefined);

      await writer.writeNavigation({
        url: "https://angular.dev/guide",
        capturedAt: NOW,
        tabId: TAB_ID,
      });

      expect(screenshotService.captureWithThrottle).toHaveBeenCalledWith(TAB_ID, {
        hideHighlightFirst: true,
      });
      expect(processScreenshot).toHaveBeenCalled();
      expect(repository.appendStepWithBlobs).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "navigation",
          action: "navigation",
          url: "https://angular.dev/guide",
        }),
        {
          screenshot: expect.any(Blob),
          thumbnail: expect.any(Blob),
        },
      );
    });

    test("still records the navigation when the screenshot fails", async () => {
      const { writer, repository, screenshotService } = setup();
      screenshotService.captureWithThrottle.mockResolvedValue(null);

      await writer.writeNavigation({
        url: "https://angular.dev/guide",
        capturedAt: NOW,
        tabId: TAB_ID,
      });

      expect(repository.appendStepWithBlobs).not.toHaveBeenCalled();
      expect(repository.appendStep).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "navigation", action: "navigation" }),
      );
    });
  });
});
