// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { useBlobObjectUrls, useObjectUrl } from "./useObjectUrl";

const createObjectURL = vi.fn<(blob: Blob) => string>();
const revokeObjectURL = vi.fn<(url: string) => void>();

beforeAll(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
});

describe("useObjectUrl", () => {
  beforeEach(() => {
    createObjectURL.mockReset();
    revokeObjectURL.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("creates a URL for the blob and revokes it on unmount", async () => {
    const blob = new Blob(["capture"], { type: "image/webp" });
    createObjectURL.mockReturnValue("blob:capture-1");

    const { result, unmount } = renderHook(() => useObjectUrl(blob));

    await waitFor(() => expect(result.current).toBe("blob:capture-1"));
    expect(createObjectURL).toHaveBeenCalledWith(blob);

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:capture-1");
  });

  test("revokes the previous URL when the blob changes", async () => {
    const first = new Blob(["first"]);
    const second = new Blob(["second"]);
    createObjectURL.mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");

    const { result, rerender } = renderHook(({ blob }: { blob: Blob }) => useObjectUrl(blob), {
      initialProps: { blob: first },
    });

    await waitFor(() => expect(result.current).toBe("blob:first"));

    rerender({ blob: second });
    await waitFor(() => expect(result.current).toBe("blob:second"));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first");
  });

  test("does not create a URL without a blob", async () => {
    const { result } = renderHook(() => useObjectUrl(undefined));

    await waitFor(() => expect(result.current).toBeUndefined());
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  test("creates and revokes URLs for a batch of blobs", async () => {
    const blobs = [
      { id: "screenshot", blob: new Blob(["screenshot"]) },
      { id: "thumbnail", blob: new Blob(["thumbnail"]) },
    ];
    createObjectURL.mockReturnValueOnce("blob:screenshot").mockReturnValueOnce("blob:thumbnail");

    const { result, unmount } = renderHook(() => useBlobObjectUrls(blobs));

    await waitFor(() =>
      expect(result.current).toEqual({
        screenshot: "blob:screenshot",
        thumbnail: "blob:thumbnail",
      }),
    );

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:screenshot");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:thumbnail");
  });
});
