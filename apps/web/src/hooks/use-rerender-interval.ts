import { useEffect, useState } from "react";

/** Re-renders the calling component every `intervalMs`, for time-relative text. */
export function useRerenderInterval(intervalMs: number) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
