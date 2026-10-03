import { useQueryClient } from "@tanstack/react-query";

import { api, type Guide } from "@repo/api-client";

import { toast } from "@/lib/toast";
import { starGuide, unstarGuide } from "@/server-fns/starred-guides";
import { invalidateGuideLists } from "@/utils/guides-cache.utils";

export function useToggleStar() {
  const queryClient = useQueryClient();

  const toggleStar = async (guide: Pick<Guide, "id" | "isStarred">): Promise<boolean> => {
    try {
      if (guide.isStarred) {
        await unstarGuide({ data: { guideId: guide.id } });
      } else {
        await starGuide({ data: { guideId: guide.id } });
      }
      queryClient.setQueryData(api.guides.getGetGuideByIdQueryKey(guide.id), (old: unknown) => {
        const prev = (old as { guide?: Guide } | undefined)?.guide;
        if (!prev) {
          return old;
        }
        return { guide: { ...prev, isStarred: !guide.isStarred } };
      });
      invalidateGuideLists(queryClient);
      return true;
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to update star",
      });
      return false;
    }
  };

  return { toggleStar };
}
