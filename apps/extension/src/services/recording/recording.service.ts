import type {
  OnRecordingStatusChange,
  RecordingSnapshot,
  RecordingStateMachine,
  RecordingStatus,
} from "@/models";

const createSnapshot = (status: RecordingStatus): RecordingSnapshot => ({ status });

export const createRecordingStateMachine = (
  initialStatus: RecordingStatus = "recording",
  onStatusChange?: OnRecordingStatusChange,
): RecordingStateMachine => {
  let status = initialStatus;

  const getSnapshot = () => createSnapshot(status);

  const setStatus = (nextStatus: RecordingStatus) => {
    if (nextStatus !== status) {
      status = nextStatus;
      onStatusChange?.(nextStatus);
    }
    return getSnapshot();
  };

  return {
    getSnapshot,
    restore: (restoredStatus) => {
      status = restoredStatus;
      return getSnapshot();
    },
    start: () => setStatus("recording"),
    pause: () => setStatus("paused"),
    resume: () => setStatus("recording"),
    stop: () => setStatus("stopped"),
  };
};
