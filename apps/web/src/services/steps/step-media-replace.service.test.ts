import { beforeEach, describe, expect, test, vi } from "vitest";

import { createReplaceStepMedia } from "./step-media-replace.service";

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

    expect(calls).toEqual([
      "processImage",
      "presignUpload",
      "putObject",
      "replaceUpload",
    ]);
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

  test("rejects on a non-OK put and never calls replaceUpload", async () => {
    deps.putObject.mockResolvedValue({ ok: false, status: 403 });

    await expect(createReplaceStepMedia(deps)(input)).rejects.toThrow("403");
    expect(deps.replaceUpload).not.toHaveBeenCalled();
  });

  test("never presigns when image conversion fails", async () => {
    deps.processImage.mockRejectedValue(new Error("decode failed"));

    await expect(createReplaceStepMedia(deps)(input)).rejects.toThrow(
      "decode failed",
    );
    expect(deps.presignUpload).not.toHaveBeenCalled();
    expect(deps.putObject).not.toHaveBeenCalled();
    expect(deps.replaceUpload).not.toHaveBeenCalled();
  });

  test("never uploads when presign fails", async () => {
    deps.presignUpload.mockRejectedValue(new Error("presign failed"));

    await expect(createReplaceStepMedia(deps)(input)).rejects.toThrow(
      "presign failed",
    );
    expect(deps.putObject).not.toHaveBeenCalled();
    expect(deps.replaceUpload).not.toHaveBeenCalled();
  });
});
