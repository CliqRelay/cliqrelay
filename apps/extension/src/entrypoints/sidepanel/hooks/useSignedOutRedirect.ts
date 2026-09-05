import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { QueryKeys } from "@/constants/query-keys";
import { useSidePanelStore } from "../stores/sidepanel-store";
import { authSessionQueryOptions } from "./useAuthSession";

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
			await queryClient.invalidateQueries({
				queryKey: [QueryKeys.AUTH_SESSION],
			});
			try {
				await queryClient.ensureQueryData(authSessionQueryOptions);
			} catch {
				await router.navigate({ to: "/sign-in" });
			}
		};

		void confirmAndRedirect();
	}, [isSignedOut, queryClient, router]);
}
