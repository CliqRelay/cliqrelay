import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { browser } from "wxt/browser";

import {
  isSessionCookieCleared,
  isSessionCookieSet,
  type SessionCookieChange,
} from "@/lib/auth-session";

import { fetchAuthSession } from "./useAuthSession";

const SIGN_IN_PATH = "/sign-in";

/**
 * Keeps the side panel in step with the session cookie for as long as it is
 * open.
 *
 * Signing out in the web app clears the cookie on the API origin, but nothing
 * in the panel would notice on its own: the route guards only run on
 * navigation, and the cached `getMe` answer outlives the session. So the panel
 * would go on showing a working capture screen.
 *
 * The cookie event is only the trigger; `getMe` still decides. That keeps the
 * panel honest whichever way the cookie moved, and avoids acting on the
 * browser's quirkier change causes.
 */
export function useSessionCookieSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncToSession = async () => {
      const isSignInPage = router.state.location.pathname === SIGN_IN_PATH;

      try {
        await fetchAuthSession(queryClient);
        // Signed in. Only move if the panel is sitting on the sign-in
        // screen — a session refresh should not yank the user off settings.
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
