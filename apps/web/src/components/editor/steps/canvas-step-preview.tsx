import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

import type { Step } from "@repo/api-client";

import { CanvasStepShell, canvasForegroundClassName } from "./canvas-step-shell";
import { StepMedia } from "./step-media";
import { AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Props = {
  step: Step;
  toolbar?: ReactNode;
  className?: string;
  onClick?: () => void;
  onReplaceMedia?: () => void;
  isReplacing?: boolean;
};

export function CanvasStepPreview({
  step,
  toolbar,
  className,
  onClick,
  onReplaceMedia,
  isReplacing,
}: Props) {
  const canvasContent = step.canvasContent;
  if (!canvasContent) {
    return null;
  }

  if (canvasContent.type === "header") {
    return (
      <div className="relative py-6">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <h2 className="text-lg font-semibold tracking-tight text-muted-foreground">
            {canvasContent.headingText}
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>
    );
  }

  const foregroundClassName = canvasForegroundClassName(canvasContent.type);

  return (
    <CanvasStepShell
      type={canvasContent.type}
      toolbar={toolbar}
      className={className}
      onClick={onClick}
    >
      {canvasContent.headingText && (
        <AlertTitle className={cn(foregroundClassName, "pr-16")}>
          {canvasContent.headingText}
        </AlertTitle>
      )}
      {canvasContent.bodyText && (
        <AlertDescription className={foregroundClassName}>
          <ReactMarkdown>{canvasContent.bodyText}</ReactMarkdown>
        </AlertDescription>
      )}
      <StepMedia
        step={step}
        className="mt-3 mb-0"
        onReplaceMedia={onReplaceMedia}
        isReplacing={isReplacing}
      />
    </CanvasStepShell>
  );
}
