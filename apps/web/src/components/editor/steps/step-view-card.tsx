import { ExternalLink } from "lucide-react";

import type { Step } from "@repo/api-client";

import { CanvasStepPreview } from "./canvas-step-preview";
import { StepMedia } from "./step-media";
import { StepNotes } from "./step-notes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { parseTextSegments } from "@/utils/regex.utils";

type Props = {
  step: Step;
  stepNumber: number;
};

export function GuideWorkflowViewStep({ step, stepNumber }: Props) {
  const isCanvasStep = step.type === "canvas";
  if (isCanvasStep) {
    return <CanvasStepPreview step={step} />;
  }

  const isNavigationStep = step.type === "interaction" && step.action === "navigation";
  const hasMedia = !!step.mediaAssets?.length;
  const hasNotes = !!step.notes?.trim();
  const hasContent = hasMedia || hasNotes;

  return (
    <Card>
      <CardHeader
        className={cn("flex flex-row items-center justify-start gap-4", hasContent && "border-b")}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-muted-foreground bg-muted text-base font-bold text-foreground">
            {stepNumber}
          </div>
          <h3 className="w-full text-base font-semibold tracking-tight break-all">
            {step.actionText
              ? parseTextSegments(step.actionText).map((segment, i) =>
                  segment.type === "url" && isNavigationStep ? (
                    <a
                      key={i}
                      href={segment.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 break-all text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                    >
                      {segment.value}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span key={i}>{segment.value}</span>
                  ),
                )
              : `Step ${stepNumber}`}
          </h3>
        </div>
      </CardHeader>
      {hasContent && (
        <CardContent className="space-y-4">
          {hasMedia && <StepMedia step={step} />}
          {hasNotes && <StepNotes notes={step.notes ?? ""} />}
        </CardContent>
      )}
    </Card>
  );
}
