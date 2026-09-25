import { useQueryClient } from "@tanstack/react-query";

import { api, type Guide } from "@repo/api-client";

import { toast } from "@/lib/toast";
import { starGuide, unstarGuide } from "@/server-fns/starred-guides";

export function useToggleStar() {
  const queryClient = useQueryClient();

  const toggleStar = async (guide: Pick<Guide, "id" | "isStarred">): Promise<boolean> => {
    try {
      if (guide.isStarred) {
        await unstarGuide({ data: { guideId: guide.id } });
      } else {
        await starGuide({ data: { guideId: guide.id } });
      }
      queryClient.invalidateQueries({
        queryKey: api.guides.getGetAllGuidesQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: api.guides.getGetStarredGuidesQueryKey(),
      });
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
