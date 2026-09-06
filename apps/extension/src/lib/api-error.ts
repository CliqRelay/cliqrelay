import { ApiError } from "@repo/api-client";

const UNAUTHORIZED_STATUSES = [401, 403];

export const isUnauthorizedError = (error: unknown): boolean =>
  error instanceof ApiError && UNAUTHORIZED_STATUSES.includes(error.status);
