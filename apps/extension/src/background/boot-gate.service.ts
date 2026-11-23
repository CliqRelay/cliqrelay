/**
 * Worker boot hydrates recording state from `storage.session` before any
 * capture can be handled. Every consumer waits on the same promise so a
 * capture that wakes the worker cannot race the restore.
 */
export const createBootGate = (hydration: Promise<unknown>) => {
  const ready = hydration.then(
    () => undefined,
    () => undefined,
  );

  return {
    ready,
    run: (task: () => unknown): Promise<unknown> => ready.then(() => task()),
  };
};

export type BootGate = ReturnType<typeof createBootGate>;
