import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { browser } from "wxt/browser";

import { api } from "@repo/api-client";

import { QueryKeys } from "@/constants/query-keys";
import { isActiveTeamCookieChanged } from "@/lib/active-team";
import type { CookieChange } from "@/lib/auth-session";

export function useActiveTeamCookieSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleCookieChange = (change: CookieChange) => {
      if (!isActiveTeamCookieChanged(change)) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: [QueryKeys.ACTIVE_TEAM_ID] });
      void queryClient.invalidateQueries({ queryKey: api.guides.getGetAllGuidesQueryKey() });
    };

    browser.cookies.onChanged.addListener(handleCookieChange);

    return () => {
      browser.cookies.onChanged.removeListener(handleCookieChange);
    };
  }, [queryClient]);
}
