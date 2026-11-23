const DROPPED_CAPTURE_WARNING_INTERVAL_MS = 60_000;

export const isDeveloperBuild = import.meta.env.COMMAND === "serve";

type DroppedCaptureReporterOptions = {
  isDev?: boolean;
  intervalMs?: number;
  now?: () => number;
  log?: (message: string) => void;
};

/**
 * Captures are dropped whenever the worker wakes without a recording session.
 * Logging every drop would flood the console during normal idle browsing, so
 * production builds warn at most once per interval. Developer builds log each
 * drop because that is exactly what is being debugged.
 */
export const createDroppedCaptureReporter = ({
  isDev = isDeveloperBuild,
  intervalMs = DROPPED_CAPTURE_WARNING_INTERVAL_MS,
  now = Date.now,
  log = (message: string) => console.warn(message),
}: DroppedCaptureReporterOptions = {}) => {
  let lastWarnedAt: number | null = null;

  return (reason: string) => {
    if (!isDev) {
      const currentTime = now();
      if (lastWarnedAt !== null && currentTime - lastWarnedAt < intervalMs) {
        return;
      }
      lastWarnedAt = currentTime;
    }

    log(`[background] Dropped capture: ${reason}`);
  };
};
