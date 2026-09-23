import * as health from "./gen/endpoints/health/health";
import * as teams from "./gen/endpoints/teams/teams";
import * as guides from "./gen/endpoints/guides/guides";
import * as steps from "./gen/endpoints/steps/steps";
import * as uploads from "./gen/endpoints/uploads/uploads";
import * as activityLogs from "./gen/endpoints/activity-logs/activity-logs";
import * as realtime from "./gen/endpoints/realtime/realtime";
export * from "./gen/models";
export * from "./gen/endpoints/health/health.faker";
export * from "./gen/endpoints/teams/teams.faker";
export * from "./gen/endpoints/guides/guides.faker";
export * from "./gen/endpoints/steps/steps.faker";
export * from "./gen/endpoints/uploads/uploads.faker";
export * from "./gen/endpoints/activity-logs/activity-logs.faker";
export * from "./gen/endpoints/realtime/realtime.faker";
export { ApiError, getCachedCsrfToken } from "./mutators/custom-fetch";

export const api = {
  health,
  teams,
  guides,
  steps,
  uploads,
  activityLogs,
  realtime,
};
