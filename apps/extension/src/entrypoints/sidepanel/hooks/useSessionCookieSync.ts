import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { browser } from "wxt/browser";

import { fetchAuthSession } from "./useAuthSession";
import {
  isSessionCookieCleared,
  isSessionCookieSet,
  type SessionCookieChange,
} from "@/lib/auth-session";

const SIGN_IN_PATH = "/sign-in";

export function useSessionCookieSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncToSession = async () => {
      const isSignInPage = router.state.location.pathname === SIGN_IN_PATH;

      try {
        await fetchAuthSession(queryClient);
        if (isSignInPage) {
          await router.navigate({ to: "/" });
        }
      } catch {
        if (!isSignInPage) {
          await router.navigate({ to: SIGN_IN_PATH });
        }
      }
    };

    const handleCookieChange = (change: SessionCookieChange) => {
      if (!isSessionCookieSet(change) && !isSessionCookieCleared(change)) {
        return;
      }
      void syncToSession();
    };

    browser.cookies.onChanged.addListener(handleCookieChange);

    return () => {
      browser.cookies.onChanged.removeListener(handleCookieChange);
    };
  }, [queryClient, router]);
}
