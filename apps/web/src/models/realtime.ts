import type { REALTIME_EVENTS } from "@/constants/realtime";

export type RealtimeEventType = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
