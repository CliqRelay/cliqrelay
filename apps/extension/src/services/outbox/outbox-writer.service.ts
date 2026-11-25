import type {
  AppendStepInput,
  CaptureBlobsInput,
  CaptureBridgeMessage,
  CaptureScreenshotOptions,
  LocalSession,
  LocalStep,
  ProcessedScreenshot,
  RecordingLifecycleStore,
} from "@/models";
import type { ScreenshotService } from "@/models";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";
import { buildActionText } from "@/utils/action-text";
import { processScreenshot as defaultProcessScreenshot } from "@/utils/image";

type NavigationWriteInput = {
  url: string;
  capturedAt: string;
  tabId?: number;
};

type OutboxWriterDeps = {
  repository: OutboxRepository;
  lifecycleStore: RecordingLifecycleStore;
  screenshotService: ScreenshotService;
  processScreenshot?: (dataUrl: string) => Promise<ProcessedScreenshot>;
};

const navigationActionText = (url: string) => `Navigate to "${url}"`;

/**
 * The only writer for locally captured steps. It never talks to the API: a
 * capture becomes a Dexie row (plus blobs) and the drainer owns the network.
 *
 * Compression is serialised on purpose. `captureVisibleTab` allows two calls
 * per second and every capture costs roughly half a second of CPU, so a single
 * queue keeps rapid clicks both ordered and inside the quota.
 */
export const createOutboxWriter = ({
  repository,
  lifecycleStore,
  screenshotService,
  processScreenshot = defaultProcessScreenshot,
}: OutboxWriterDeps) => {
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const getRecordingSession = async (): Promise<LocalSession | null> => {
    const lifecycle = await lifecycleStore.get();
    if (lifecycle.status !== "recording" || !lifecycle.sessionId) {
      return null;
    }
    return (await repository.getSession(lifecycle.sessionId)) ?? null;
  };

  const captureBlobsFor = async (
    tabId: number,
    options?: CaptureScreenshotOptions,
  ): Promise<CaptureBlobsInput | undefined> => {
    const dataUrl = await screenshotService.captureWithThrottle(tabId, options);
    if (!dataUrl) {
      return undefined;
    }

    const { screenshotBlob, thumbnailBlob } = await processScreenshot(dataUrl);
    return { screenshot: screenshotBlob, thumbnail: thumbnailBlob };
  };

  const navigationStepInput = (
    session: LocalSession,
    url: string,
    capturedAt: string,
  ): AppendStepInput => ({
    sessionId: session.id,
    guideId: session.guideId,
    kind: "navigation",
    action: "navigation",
    actionText: navigationActionText(url),
    url,
    capturedAt,
  });

  const ensureInitialNavigation = async (
    session: LocalSession,
    url: string,
    capturedAt: string,
    blobs?: CaptureBlobsInput,
  ): Promise<void> => {
    if (await repository.getLastStep(session.id)) {
      return;
    }

    const input = navigationStepInput(session, url, capturedAt);
    if (blobs) {
      await repository.appendStepWithBlobs(input, blobs);
      return;
    }

    await repository.appendStep(input);
  };

  const writeCapture = (message: CaptureBridgeMessage, tabId: number): Promise<LocalStep | null> =>
    enqueue(async () => {
      const session = await getRecordingSession();
      if (!session) {
        return null;
      }

      const payload = message.payload;
      const blobs = await captureBlobsFor(tabId);
      await ensureInitialNavigation(session, payload.url, payload.capturedAt, blobs);
      if (!blobs) {
        return null;
      }

      return repository.appendStepWithBlobs(
        {
          sessionId: session.id,
          guideId: session.guideId,
          kind: "interaction",
          action: payload.action,
          actionText: buildActionText(
            payload.action,
            payload.targetElement,
            payload.typedText,
            payload.keyCombo,
          ),
          url: payload.url,
          capturedAt: payload.capturedAt,
          ...(payload.targetElement
            ? { targetElement: payload.targetElement as Record<string, unknown> }
            : {}),
          ...(payload.typingSessionId ? { typingSessionId: payload.typingSessionId } : {}),
        },
        blobs,
      );
    });

  const writeTyping = (message: CaptureBridgeMessage, tabId: number): Promise<LocalStep | null> =>
    enqueue(async () => {
      const session = await getRecordingSession();
      if (!session) {
        return null;
      }

      const payload = message.payload;
      const typingSessionId = payload.typingSessionId;
      if (!typingSessionId) {
        console.warn("[background] Dropped typing capture without a typing session id");
        return null;
      }

      if (payload.typedText === "") {
        await repository.deleteTypingStep(session.id, typingSessionId);
        return null;
      }

      const isFirstStep = (await repository.getLastStep(session.id)) === undefined;
      const blobs = isFirstStep ? await captureBlobsFor(tabId) : undefined;
      await ensureInitialNavigation(session, payload.url, payload.capturedAt, blobs);

      return repository.upsertTypingStep({
        sessionId: session.id,
        guideId: session.guideId,
        kind: "interaction",
        action: "input",
        actionText: buildActionText("input", undefined, payload.typedText),
        url: payload.url,
        capturedAt: payload.capturedAt,
        typingSessionId,
      });
    });

  const writeNavigation = ({
    url,
    capturedAt,
    tabId,
  }: NavigationWriteInput): Promise<LocalStep | null> =>
    enqueue(async () => {
      const session = await getRecordingSession();
      if (!session) {
        return null;
      }

      const lastStep = await repository.getLastStep(session.id);
      if (lastStep?.url === url) {
        return null;
      }

      const input = navigationStepInput(session, url, capturedAt);
      if (tabId === undefined) {
        return repository.appendStep(input);
      }

      const blobs = await captureBlobsFor(tabId, { hideHighlightFirst: true });
      if (!blobs) {
        return repository.appendStep(input);
      }

      return repository.appendStepWithBlobs(input, blobs);
    });

  return { writeCapture, writeTyping, writeNavigation };
};

export type OutboxWriter = ReturnType<typeof createOutboxWriter>;
