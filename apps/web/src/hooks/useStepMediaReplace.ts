import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { api } from "@repo/api-client";

import { stepsQueryKey } from "@/constants/steps";
import { toast } from "@/lib/toast";
import { validateReplacementFile } from "@/models";
import {
  createReplaceStepMedia,
  putObjectWithXhr,
} from "@/services/steps/step-media-replace.service";
import { getCsrfTokenHeader } from "@/utils/http.utils";
import { processImageFileForUpload } from "@/utils/image.utils";

export function useStepMediaReplace(guideId: string) {
  const queryClient = useQueryClient();
  const [replacingStepIds, setReplacingStepIds] = useState<string[]>([]);

  const request = {
    credentials: "include" as const,
    headers: { ...getCsrfTokenHeader() },
  };

  const presignUpload = api.uploads.usePresignUpload({ request });
  const replaceUpload = api.uploads.useReplaceUpload({ request });

  const replaceStepMedia = createReplaceStepMedia({
    presignUpload: (data) => presignUpload.mutateAsync({ data }),
    replaceUpload: (data) => replaceUpload.mutateAsync({ data }),
    processImage: processImageFileForUpload,
    putObject: putObjectWithXhr,
  });

  const handleReplaceMedia = async (stepId: string, file: File) => {
    if (replacingStepIds.includes(stepId)) return;

    const validation = validateReplacementFile(file);
    if (!validation.success) {
      toast.error("Invalid image", {
        description: validation.error.issues[0]?.message ?? "Unsupported file",
      });
      return;
    }

    setReplacingStepIds((ids) => [...ids, stepId]);
    const toastId = toast.loading("Uploading screenshot…");
    try {
      await replaceStepMedia({
        stepId,
        guideId,
        file,
        onProgress: (fraction) =>
          toast.loading(`Uploading screenshot… ${Math.round(fraction * 100)}%`, { id: toastId }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stepsQueryKey(guideId) }),
        queryClient.invalidateQueries({
          queryKey: api.guides.getGetGuideByIdQueryKey(guideId),
        }),
      ]);
      toast.success("Screenshot updated");
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to replace screenshot",
      });
    } finally {
      toast.dismiss(toastId);
      setReplacingStepIds((ids) => ids.filter((id) => id !== stepId));
    }
  };

  return { handleReplaceMedia, replacingStepIds };
}
