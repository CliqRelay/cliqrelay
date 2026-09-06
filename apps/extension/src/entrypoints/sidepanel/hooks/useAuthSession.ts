import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { User } from "authula";

import { QueryKeys } from "@/constants/query-keys";
import { authulaClient } from "@/lib/authula-client";

const AUTH_SESSION_STALE_TIME = 60 * 1000;

export const authSessionQueryOptions = {
  queryKey: [QueryKeys.AUTH_SESSION],
  queryFn: () => authulaClient.core.getMe(),
  // A 401 is an answer, not a failure worth retrying.
  retry: false,
  staleTime: AUTH_SESSION_STALE_TIME,
} as const;

export const fetchAuthSession = (queryClient: QueryClient) =>
  queryClient.query({ ...authSessionQueryOptions, staleTime: 0 });

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
    isAuthenticated: !query.isError && !!query.data?.user,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
