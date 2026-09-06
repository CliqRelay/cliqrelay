import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { useSidePanelStore } from "../stores/sidepanel-store";
import { fetchAuthSession } from "./useAuthSession";

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
