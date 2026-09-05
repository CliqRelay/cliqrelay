import { ApiError } from "@repo/api-client";

const UNAUTHORIZED_STATUSES = [401, 403];

/**
 * True when the API rejected the request because there is no usable session.
 *
 * Shared by the upload queue (which must not retry these), the background
 * session manager, and the side panel hooks, so all three agree on what
 * "signed out" looks like.
 */
export const isUnauthorizedError = (error: unknown): boolean =>
	error instanceof ApiError && UNAUTHORIZED_STATUSES.includes(error.status);
