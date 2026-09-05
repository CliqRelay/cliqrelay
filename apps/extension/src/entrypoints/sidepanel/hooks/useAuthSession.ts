import type { User } from "authula";

import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "@/constants/query-keys";
import { authulaClient } from "@/lib/authula-client";

const AUTH_SESSION_STALE_TIME = 60 * 1000;

/**
 * The single source of truth for "is there a session".
 *
 * Shared by the route guards (`beforeLoad` → `ensureQueryData`) and this hook so
 * both read the same cache entry — the guard's fetch is what the hook renders,
 * with no second request and no flash of the wrong screen.
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
		isAuthenticated: !!query.data?.user,
		isLoading: query.isLoading,
		refetch: query.refetch,
	};
}
