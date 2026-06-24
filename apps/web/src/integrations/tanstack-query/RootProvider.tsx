import type { User } from "authula";

import { queryClient } from "@/constants/query-client";

export function getContext(): {
	queryClient: typeof queryClient;
	user: User | null;
} {
	return {
		queryClient,
		user: null,
	};
}
