import type {
  GuideArchiveContents,
  GuideArchiveErrorCode,
  GuideArchiveManifest,
} from "@repo/data-commons";

export type GuideArchiveWorkerRequest =
  | {
      id: number;
      type: "pack";
      manifest: GuideArchiveManifest;
      assets: Record<string, Uint8Array>;
    }
  | {
      id: number;
      type: "unpack";
      bytes: Uint8Array;
    };

export type GuideArchiveWorkerError = {
  code: GuideArchiveErrorCode;
  message: string;
};

export type GuideArchiveWorkerResponse =
  | { id: number; ok: true; type: "pack"; bytes: Uint8Array }
  | { id: number; ok: true; type: "unpack"; contents: GuideArchiveContents }
  | { id: number; ok: false; error: GuideArchiveWorkerError };
