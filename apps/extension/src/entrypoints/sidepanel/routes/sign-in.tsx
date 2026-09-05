import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";

import { SignInView } from "../components";
import { authSessionQueryOptions } from "../hooks/useAuthSession";

export const Route = createFileRoute("/sign-in")({
	beforeLoad: async ({ context }) => {
		try {
			await context.queryClient.ensureQueryData(authSessionQueryOptions);
			throw redirect({ to: "/" });
		} catch (error) {
			// `throw redirect()` lands in this same catch, so it has to be let
			// through rather than read as "the session check failed".
			if (isRedirect(error)) {
				throw error;
			}
			// No session — stay here and show the sign-in screen.
		}
	},
	component: SignInPage,
});

function SignInPage() {
	return <SignInView />;
}
