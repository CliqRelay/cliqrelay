import { queryClient } from "@/constants/query-client";
import type { AppUser } from "@/models/auth";

export function getContext(): {
  queryClient: typeof queryClient;
  user: AppUser | null;
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
