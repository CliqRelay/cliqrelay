import { describe, expect, test, vi } from "vitest";

import { createRecordingStatusStore } from "./recording-status.service";
import type { StorageChangeListener } from "@/models";
import { STORAGE_KEY_RECORDING_STATUS } from "@/utils/constants";

const createOnChanged = () => {
  let listener: StorageChangeListener | undefined;
  return {
    addListener: vi.fn((next: StorageChangeListener) => {
      listener = next;
    }),
    removeListener: vi.fn(),
    emit: (changes: Record<string, { newValue?: unknown }>, area = "local") =>
      listener?.(changes, area),
  };
};

const createStorage = (items: Record<string, unknown> = {}) => ({
  get: vi.fn().mockResolvedValue(items),
  set: vi.fn().mockResolvedValue(undefined),
});

describe("recording status store", () => {
  test("returns the stored status", async () => {
    const store = createRecordingStatusStore(
      createStorage({ [STORAGE_KEY_RECORDING_STATUS]: "recording" }),
      createOnChanged(),
    );

    await expect(store.get()).resolves.toBe("recording");
  });

  test("falls back to idle when the value is missing or invalid", async () => {
    const missing = createRecordingStatusStore(createStorage(), createOnChanged());
    const invalid = createRecordingStatusStore(
      createStorage({ [STORAGE_KEY_RECORDING_STATUS]: "nope" }),
      createOnChanged(),
    );

    await expect(missing.get()).resolves.toBe("idle");
    await expect(invalid.get()).resolves.toBe("idle");
  });

  test("falls back to idle when storage fails", async () => {
    const storage = createStorage();
    storage.get.mockRejectedValue(new Error("unavailable"));

    const store = createRecordingStatusStore(storage, createOnChanged());

    await expect(store.get()).resolves.toBe("idle");
  });

  test("writes the status under its key", async () => {
    const storage = createStorage();

    await createRecordingStatusStore(storage, createOnChanged()).set("paused");

    expect(storage.set).toHaveBeenCalledWith({
      [STORAGE_KEY_RECORDING_STATUS]: "paused",
    });
  });

  test("notifies watchers of local changes to the status key only", () => {
    const onChanged = createOnChanged();
    const listener = vi.fn();
    createRecordingStatusStore(createStorage(), onChanged).watch(listener);

    onChanged.emit({ other: { newValue: "x" } });
    onChanged.emit({ [STORAGE_KEY_RECORDING_STATUS]: { newValue: "recording" } }, "sync");
    onChanged.emit({ [STORAGE_KEY_RECORDING_STATUS]: { newValue: "recording" } });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("recording");
  });

  test("unsubscribes the watcher", () => {
    const onChanged = createOnChanged();
    const unwatch = createRecordingStatusStore(createStorage(), onChanged).watch(vi.fn());

    unwatch();

    expect(onChanged.removeListener).toHaveBeenCalledWith(onChanged.addListener.mock.calls[0]?.[0]);
  });
});
