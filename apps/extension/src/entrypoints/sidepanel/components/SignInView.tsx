import { useEffect, useState } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { browser } from "wxt/browser";

import { Button } from "@/components/ui/button";
import { env } from "@/constants/env";
import { QueryKeys } from "@/constants/query-keys";
import { buildSignInUrl, isSessionCookieSet } from "@/lib/auth-session";

type CookieChange = Parameters<
	Parameters<typeof browser.cookies.onChanged.addListener>[0]
>[0];

type ContinueDeps = {
	queryClient: QueryClient;
	router: ReturnType<typeof useRouter>;
};

/**
 * Drops the cached session answer and sends the panel to the capture page,
 * where the route guard re-checks `getMe` for real.
 *
 * Lives outside the component so the cookie listener effect only has to depend
 * on the two stable client objects.
 */
const continueToCapture = async ({ queryClient, router }: ContinueDeps) => {
	await queryClient.invalidateQueries({ queryKey: [QueryKeys.AUTH_SESSION] });
	await router.navigate({ to: "/" });
};

/**
 * The signed-out screen for the side panel.
 *
 * Sign-in itself happens in the web app: the session cookie has to be set on
 * the API origin, and password reset, email verification and OAuth all live
 * there anyway. Reaching the dashboard also sets the active-team cookie, which
 * is what the capture page needs next.
 */
export function SignInView() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const [isWaiting, setIsWaiting] = useState(false);

	const handleSignIn = async () => {
		setIsWaiting(true);
		await browser.tabs.create({ url: buildSignInUrl(env.VITE_WEB_URL) });
	};

	useEffect(() => {
		const handleCookieChange = (change: CookieChange) => {
			if (!isSessionCookieSet(change)) return;
			void continueToCapture({ queryClient, router });
		};

		browser.cookies.onChanged.addListener(handleCookieChange);

		return () => {
			browser.cookies.onChanged.removeListener(handleCookieChange);
		};
	}, [queryClient, router]);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center"
		>
			<img
				src="/app-icon-logo.svg"
				alt="CliqRelay Logo"
				className="h-10 w-auto"
			/>
			<p className="max-w-52 text-[13px] leading-relaxed text-muted-foreground">
				Sign in to CliqRelay to start capturing.
			</p>
			<Button size="sm" onClick={handleSignIn} className="gap-1.5">
				<LogIn className="size-4" />
				Sign in
			</Button>
			{isWaiting && (
				<div className="flex flex-col items-center gap-1.5">
					<span className="text-[11px] text-muted-foreground/60">
						Waiting for sign-in…
					</span>
					{/* Cookie events can be missed, and Firefox fires them differently
					    from Chrome, so leave the user a way through by hand. */}
					<Button
						variant="ghost"
						size="xs"
						onClick={() => continueToCapture({ queryClient, router })}
						className="text-[11px] text-muted-foreground hover:text-foreground"
					>
						I've signed in
					</Button>
				</div>
			)}
		</motion.div>
	);
}
