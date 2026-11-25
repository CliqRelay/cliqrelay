import {
  GuideArchiveErrorCode,
  isGuideArchiveError,
  packGuideArchive,
  unpackGuideArchive,
} from "@repo/data-commons";

import type {
  GuideArchiveWorkerRequest,
  GuideArchiveWorkerResponse,
} from "./guide-archive.worker.types";

type WorkerScope = {
  onmessage: ((event: MessageEvent<GuideArchiveWorkerRequest>) => void) | null;
  postMessage: (message: GuideArchiveWorkerResponse, transfer?: Transferable[]) => void;
};

const scope = self as unknown as WorkerScope;

const toError = (error: unknown) => {
  if (isGuideArchiveError(error)) {
    return { code: error.code, message: error.message };
  }
  return {
    code: GuideArchiveErrorCode.InvalidArchive,
    message: error instanceof Error ? error.message : "The archive could not be processed.",
  };
};

scope.onmessage = async (event) => {
  const request = event.data;

  try {
    if (request.type === "pack") {
      const bytes = packGuideArchive(request.manifest, request.assets);
      scope.postMessage({ id: request.id, ok: true, type: "pack", bytes }, [
        bytes.buffer as ArrayBuffer,
      ]);
      return;
    }

    const contents = await unpackGuideArchive(request.bytes);
    const transfer = Object.values(contents.assets).map((bytes) => bytes.buffer as ArrayBuffer);
    scope.postMessage({ id: request.id, ok: true, type: "unpack", contents }, transfer);
  } catch (error) {
    scope.postMessage({
      id: request.id,
      ok: false,
      error: toError(error),
    });
  }
};
