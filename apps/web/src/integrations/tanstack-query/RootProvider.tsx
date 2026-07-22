import type { User } from "authula";

import { queryClient } from "@/constants/query-client";

export function getContext(): {
	queryClient: typeof queryClient;
	user: User | null;
	activeWorkspaceId: string | null;
	workspaces: Array<{ id: string; name: string; type: string }>;
} {
	return {
		queryClient,
		user: null,
		activeWorkspaceId: null,
		workspaces: [],
	};
}
