import { useState } from "react";

import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { browser } from "wxt/browser";

import { Button } from "@/components/ui/button";
import { env } from "@/constants/env";
import { buildSignInUrl } from "@/lib/auth-session";

export function SignInView() {
  const [isWaiting, setIsWaiting] = useState(false);

  const handleSignIn = async () => {
    setIsWaiting(true);
    await browser.tabs.create({ url: buildSignInUrl(env.VITE_WEB_URL) });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center"
    >
      <img src="/app-icon-logo.svg" alt="CliqRelay Logo" className="h-10 w-auto" />
      <p className="max-w-52 text-[13px] leading-relaxed text-muted-foreground">
        Sign in to CliqRelay to start capturing.
      </p>
      <Button size="sm" onClick={handleSignIn} className="gap-1.5">
        <LogIn className="size-4" />
        Sign in
      </Button>
      {isWaiting && (
        <span className="text-[11px] text-muted-foreground/60">Waiting for sign-in…</span>
      )}
    </motion.div>
  );
}
