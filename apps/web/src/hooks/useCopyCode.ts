import { useEffect, useRef, useState } from "react";

import { toast } from "@/lib/toast";

export function useCopyCode(code: string): {
  copied: boolean;
  copy: () => Promise<void>;
} {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error", { description: "Failed to copy code" });
    }
  }

  return { copied, copy };
}
