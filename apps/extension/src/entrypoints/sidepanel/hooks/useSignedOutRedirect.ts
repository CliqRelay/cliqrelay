import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { useSidePanelStore } from "../stores/sidepanel-store";
import { fetchAuthSession } from "./useAuthSession";

/**
 * Sends the panel back to the sign-in screen when the background reports that
 * the session died mid-recording.
 *
 * The route guard only runs on navigation, so without this the panel would sit
 * on a capture page whose every request is going to be rejected.
 *
 * The background's flag is only the trigger; `getMe` still decides. Otherwise a
 * flag left over from an earlier failure would bounce a user who has since
 * signed in straight back to the sign-in screen.
 */
export function useSignedOutRedirect() {
  const isSignedOut = useSidePanelStore((s) => s.isSignedOut);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSignedOut) return;

    const confirmAndRedirect = async () => {
      try {
        await fetchAuthSession(queryClient);
      } catch {
        await router.navigate({ to: "/sign-in" });
      }
    };

    void confirmAndRedirect();
  }, [isSignedOut, queryClient, router]);
}
