import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createReplaceStepMedia, putObjectWithXhr } from "./step-media-replace.service";

const processed = {
  webpBlob: { size: 4321 } as Blob,
  thumbnailBase64: "data:image/webp;base64,AAAA",
  width: 1280,
  height: 800,
};

const presigned = {
  presignedUrl: "https://s3.test/put",
  storagePath: "uploads/guides/g/steps/s/1.webp",
};

const replaced = {
  url: "https://cdn/1.webp",
  storagePath: presigned.storagePath,
  mediaAsset: {
    id: "m1",
    stepId: "s",
    storagePath: presigned.storagePath,
    createdAt: "",
    updatedAt: "",
  },
};

const makeDeps = () => ({
  presignUpload: vi.fn().mockResolvedValue(presigned),
  replaceUpload: vi.fn().mockResolvedValue(replaced),
  processImage: vi.fn().mockResolvedValue(processed),
  putObject: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
});

const input = { stepId: "s", guideId: "g", file: {} as File };

describe("createReplaceStepMedia", () => {
  let deps: ReturnType<typeof makeDeps>;
  let calls: string[];

  beforeEach(() => {
    deps = makeDeps();
    calls = [];
    for (const [name, fn] of Object.entries(deps)) {
      fn.mockImplementation(async () => {
        calls.push(name);
        return {
          presignUpload: presigned,
          replaceUpload: replaced,
          processImage: processed,
          putObject: { ok: true, status: 200 },
        }[name];
      });
    }
  });

  test("runs convert → presign → put → replace in order and returns the replace response", async () => {
    const result = await createReplaceStepMedia(deps)(input);

    expect(calls).toEqual(["processImage", "presignUpload", "putObject", "replaceUpload"]);
    expect(result).toBe(replaced);
  });

  test("sends the presigned storage path and image metadata to replaceUpload", async () => {
    await createReplaceStepMedia(deps)(input);

    expect(deps.presignUpload).toHaveBeenCalledWith({
      guideId: "g",
      stepId: "s",
    });
    expect(deps.putObject).toHaveBeenCalledWith(
      presigned.presignedUrl,
      processed.webpBlob,
      "image/webp",
      undefined,
    );
    expect(deps.replaceUpload).toHaveBeenCalledWith({
      stepId: "s",
      storagePath: presigned.storagePath,
      fileSize: 4321,
      mimeType: "image/webp",
      thumbnail: processed.thumbnailBase64,
      width: 1280,
      height: 800,
    });
  });

  test("forwards onProgress to putObject", async () => {
    const onProgress = vi.fn();

    await createReplaceStepMedia(deps)({ ...input, onProgress });

    expect(deps.putObject).toHaveBeenCalledWith(
      presigned.presignedUrl,
      processed.webpBlob,
      "image/webp",
      onProgress,
    );
  });

  test("rejects on a non-OK put and never calls replaceUpload", async () => {
    deps.putObject.mockResolvedValue({ ok: false, status: 403 });

    await expect(createReplaceStepMedia(deps)(input)).rejects.toThrow("403");
    expect(deps.replaceUpload).not.toHaveBeenCalled();
  });

  test("never presigns when image conversion fails", async () => {
    deps.processImage.mockRejectedValue(new Error("decode failed"));

    await expect(createReplaceStepMedia(deps)(input)).rejects.toThrow("decode failed");
    expect(deps.presignUpload).not.toHaveBeenCalled();
    expect(deps.putObject).not.toHaveBeenCalled();
    expect(deps.replaceUpload).not.toHaveBeenCalled();
  });

  test("never uploads when presign fails", async () => {
    deps.presignUpload.mockRejectedValue(new Error("presign failed"));

    await expect(createReplaceStepMedia(deps)(input)).rejects.toThrow("presign failed");
    expect(deps.putObject).not.toHaveBeenCalled();
    expect(deps.replaceUpload).not.toHaveBeenCalled();
  });
});

class FakeXhr {
  static instances: FakeXhr[] = [];

  status = 0;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();

  constructor() {
    FakeXhr.instances.push(this);
  }
}

const progressEvent = (loaded: number, total: number, lengthComputable = true) =>
  ({ loaded, total, lengthComputable }) as ProgressEvent;

describe("putObjectWithXhr", () => {
  const body = { size: 10 } as Blob;

  beforeEach(() => {
    FakeXhr.instances = [];
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const start = (onProgress?: (fraction: number) => void) => {
    const promise = putObjectWithXhr("https://s3.test/put", body, "image/webp", onProgress);
    const xhr = FakeXhr.instances[0]!;
    return { promise, xhr };
  };

  test("sends a PUT with the content type and body", () => {
    const { xhr } = start();

    expect(xhr.open).toHaveBeenCalledWith("PUT", "https://s3.test/put");
    expect(xhr.setRequestHeader).toHaveBeenCalledWith("Content-Type", "image/webp");
    expect(xhr.send).toHaveBeenCalledWith(body);
  });

  test("resolves ok on a 2xx status", async () => {
    const { promise, xhr } = start();
    xhr.status = 200;
    xhr.onload?.();

    await expect(promise).resolves.toEqual({ ok: true, status: 200 });
  });

  test("resolves not-ok on a 4xx status", async () => {
    const { promise, xhr } = start();
    xhr.status = 403;
    xhr.onload?.();

    await expect(promise).resolves.toEqual({ ok: false, status: 403 });
  });

  test("rejects on a network error", async () => {
    const { promise, xhr } = start();
    xhr.onerror?.();

    await expect(promise).rejects.toThrow("network error");
  });

  test("reports upload progress as a fraction and skips non-computable events", () => {
    const onProgress = vi.fn();
    const { xhr } = start(onProgress);

    xhr.upload.onprogress?.(progressEvent(5, 10));
    xhr.upload.onprogress?.(progressEvent(0, 0, false));
    xhr.upload.onprogress?.(progressEvent(10, 10));

    expect(onProgress.mock.calls).toEqual([[0.5], [1]]);
  });
});
