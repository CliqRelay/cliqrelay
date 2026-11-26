import {
  GuideArchiveError,
  GuideArchiveErrorCode,
  type GuideArchiveContents,
  type GuideArchiveManifest,
} from "@repo/data-commons";

import type {
  GuideArchiveWorkerRequest,
  GuideArchiveWorkerResponse,
} from "./guide-archive.worker.types";

type PendingRequest = {
  resolve: (response: GuideArchiveWorkerResponse) => void;
  reject: (error: Error) => void;
  cleanup: () => void;
};

const createAbortError = () => new DOMException("The operation was cancelled.", "AbortError");

export function createGuideArchiveWorkerClient() {
  let worker: Worker | null = null;
  let nextId = 1;
  const pending = new Map<number, PendingRequest>();

  const rejectAll = (error: Error) => {
    for (const request of pending.values()) {
      request.cleanup();
      request.reject(error);
    }
    pending.clear();
  };

  const ensureWorker = () => {
    if (worker) {
      return worker;
    }

    worker = new Worker(new URL("./guide-archive.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<GuideArchiveWorkerResponse>) => {
      const request = pending.get(event.data.id);
      if (!request) {
        return;
      }
      pending.delete(event.data.id);
      request.cleanup();
      request.resolve(event.data);
    };
    worker.onerror = () => {
      rejectAll(new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive));
      terminate();
    };
    return worker;
  };

  const terminate = () => {
    worker?.terminate();
    worker = null;
    rejectAll(createAbortError());
  };

  const send = (
    message: GuideArchiveWorkerRequest,
    signal?: AbortSignal,
    transfer: Transferable[] = [],
  ): Promise<GuideArchiveWorkerResponse> => {
    if (signal?.aborted) {
      return Promise.reject(createAbortError());
    }

    const activeWorker = ensureWorker();
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        terminate();
        reject(createAbortError());
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      pending.set(message.id, {
        resolve,
        reject,
        cleanup: () => signal?.removeEventListener("abort", onAbort),
      });

      activeWorker.postMessage(message, transfer);
    });
  };

  const pack = async (
    manifest: GuideArchiveManifest,
    assets: Record<string, Uint8Array>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> => {
    const response = await send({ id: nextId++, type: "pack", manifest, assets }, signal);
    if (!response.ok) {
      throw new GuideArchiveError(response.error.code, response.error.message);
    }
    if (response.type !== "pack") {
      throw new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive);
    }
    return response.bytes;
  };

  const unpack = async (bytes: Uint8Array, signal?: AbortSignal): Promise<GuideArchiveContents> => {
    const response = await send({ id: nextId++, type: "unpack", bytes }, signal, [
      bytes.buffer as ArrayBuffer,
    ]);
    if (!response.ok) {
      throw new GuideArchiveError(response.error.code, response.error.message);
    }
    if (response.type !== "unpack") {
      throw new GuideArchiveError(GuideArchiveErrorCode.InvalidArchive);
    }
    return response.contents;
  };

  return { pack, unpack, terminate };
}

export type GuideArchiveWorkerClient = ReturnType<typeof createGuideArchiveWorkerClient>;
