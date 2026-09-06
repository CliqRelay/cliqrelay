import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { User } from "authula";

import { QueryKeys } from "@/constants/query-keys";
import { authulaClient } from "@/lib/authula-client";

const AUTH_SESSION_STALE_TIME = 60 * 1000;

/**
 * The single source of truth for "is there a session".
 *
 * Shared by the route guards and this hook so both read the same cache entry —
 * the guard's fetch is what the hook renders, with no second request and no
 * flash of the wrong screen.
 *
 * Truth comes from `getMe`, not from cookie presence: a stale session cookie
 * has to read as signed out.
 */
export const authSessionQueryOptions = {
  queryKey: [QueryKeys.AUTH_SESSION],
  queryFn: () => authulaClient.core.getMe(),
  // A 401 is an answer, not a failure worth retrying.
  retry: false,
  staleTime: AUTH_SESSION_STALE_TIME,
} as const;

/**
 * Re-asks the API whether the session is still good, ignoring the cache.
 *
 * Use this — never `ensureQueryData` — whenever the answer is the point.
 * `ensureQueryData` resolves with whatever is already cached and only fetches
 * when the cache is completely empty, and React Query keeps the last good data
 * after a failed refetch. So once `getMe` has succeeded, `ensureQueryData`
 * would keep reporting that user for the life of the panel, sign-out included.
 */
export const fetchAuthSession = (queryClient: QueryClient) =>
  queryClient.fetchQuery({ ...authSessionQueryOptions, staleTime: 0 });

type UseAuthSessionResult = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refetch: () => void;
};

export function useAuthSession(): UseAuthSessionResult {
  const query = useQuery(authSessionQueryOptions);

  return {
    user: query.data?.user ?? null,
    // `data` survives a failed refetch, so the error has to be consulted too
    // — otherwise a signed-out panel would still look signed in.
    isAuthenticated: !query.isError && !!query.data?.user,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
