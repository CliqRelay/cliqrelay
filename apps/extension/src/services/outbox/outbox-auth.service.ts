import { ApiError as AuthulaApiError } from "authula/core";

import { isUnauthorizedError } from "@/lib/api-error";
import { authulaClient } from "@/lib/authula-client";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const UNAUTHORIZED_STATUSES = [401, 403];

const isAuthenticationFailure = (error: unknown): boolean =>
  isUnauthorizedError(error) ||
  (error instanceof AuthulaApiError && UNAUTHORIZED_STATUSES.includes(error.status));

type GetMe = () => Promise<{ user: { id: string } }>;

type OutboxAuthDeps = {
  getMe?: GetMe;
  now?: () => number;
  cacheTtlMs?: number;
};

export const createOutboxAuth = ({
  getMe = () => authulaClient.core.getMe(),
  now = Date.now,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
}: OutboxAuthDeps = {}) => {
  let cached: { userId: string; resolvedAt: number } | null = null;

  const getUserId = async (): Promise<string | null> => {
    if (cached && now() - cached.resolvedAt < cacheTtlMs) {
      return cached.userId;
    }

    try {
      const { user } = await getMe();
      cached = { userId: user.id, resolvedAt: now() };
      return user.id;
    } catch (error) {
      cached = null;
      if (isAuthenticationFailure(error)) {
        return null;
      }
      throw error;
    }
  };

  const invalidate = () => {
    cached = null;
  };

  return { getUserId, invalidate };
};

export type OutboxAuth = ReturnType<typeof createOutboxAuth>;
