import type { BootGate } from "./boot-gate.service";
import type { OutboxAlarm } from "@/models";

type OutboxAlarmListenerDeps = {
  gate: Pick<BootGate, "run">;
  handleAlarm: (alarm: OutboxAlarm) => Promise<void>;
  log?: (message: string, error: unknown) => void;
};

export const createOutboxAlarmListener = ({
  gate,
  handleAlarm,
  log = (message, error) => console.warn(message, error),
}: OutboxAlarmListenerDeps) => {
  return (alarm: OutboxAlarm): void => {
    void gate
      .run(() => handleAlarm(alarm))
      .catch((error: unknown) => {
        log("[background] Outbox alarm failed:", error);
      });
  };
};

export type OutboxAlarmListener = ReturnType<typeof createOutboxAlarmListener>;
