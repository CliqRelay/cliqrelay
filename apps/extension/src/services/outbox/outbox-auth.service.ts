import { authulaClient } from "@/lib/authula-client";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

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
    } catch {
      cached = null;
      return null;
    }
  };

  const invalidate = () => {
    cached = null;
  };

  return { getUserId, invalidate };
};

export type OutboxAuth = ReturnType<typeof createOutboxAuth>;
