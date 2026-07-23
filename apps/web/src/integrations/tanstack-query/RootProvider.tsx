import type { User } from "authula";

import { queryClient } from "@/constants/query-client";

export function getContext(): {
	queryClient: typeof queryClient;
	user: User | null;
	activeTeamId: string | null;
	teams: Array<{ id: string; name: string }>;
} {
	return {
		queryClient,
		user: null,
		activeTeamId: null,
		teams: [],
	};
}
