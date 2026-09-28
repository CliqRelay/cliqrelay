import type { Guide } from "@repo/api-client";

import { toast } from "@/lib/toast";
import { getGuideLinkAudience, getPublicGuideUrl } from "@/models";

export function useCopyGuideLink() {
  const copyGuideLink = async (guide: Pick<Guide, "id" | "visibility" | "status">) => {
    try {
      await navigator.clipboard.writeText(getPublicGuideUrl(window.location.origin, guide.id));
      toast("Link copied", { description: getGuideLinkAudience(guide) });
    } catch {
      toast.error("Error", { description: "Failed to copy link" });
    }
  };

  return { copyGuideLink };
}
