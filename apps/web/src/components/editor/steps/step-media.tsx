import { useEffect, useRef, useState } from "react";

import {
  CameraIcon,
  CircleDotIcon,
  CircleOffIcon,
  ImageIcon,
  ImageUpIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";

import type { Step } from "@repo/api-client";
import { ExtensionSlot, extensionRegistry } from "@repo/extensions-sdk";

import { StepMediaToolbar, StepMediaToolbarButton } from "./step-media-toolbar";
import { StepOverlay } from "./step-overlay";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtensionSlotKeys } from "@/constants/extension-slots";
import { useIndicatorDrag } from "@/hooks/useIndicatorDrag";
import { cn } from "@/lib/utils";
import {
  type IndicatorPosition,
  type IndicatorTargetElement,
  type MediaLayoutTarget,
} from "@/models";
import {
  readIndicatorPosition,
  resolveIndicatorViewport,
  resolveMediaLayout,
  withIndicatorPosition,
  withoutIndicator,
} from "@/utils/media.utils";

type Props = {
  step: Step;
  onUpdate?: (stepId: string, updates: Record<string, unknown>) => void;
  onReplaceMedia?: () => void;
  isReplacing?: boolean;
  className?: string;
};

const INDICATOR_CENTER: IndicatorPosition = { x: 0.5, y: 0.5 };

export function StepMedia({ step, onUpdate, onReplaceMedia, isReplacing, className }: Props) {
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);

  const media = step.mediaAssets?.[0];
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetElement = step.targetElement as IndicatorTargetElement | null | undefined;
  const indicatorPosition = readIndicatorPosition(targetElement);
  const indicatorViewport = resolveIndicatorViewport(targetElement, media);
  const { aspectRatio: containerAspectRatio, overlay } = resolveMediaLayout(
    step.targetElement as MediaLayoutTarget | undefined,
    media,
  );
  const hasAspectRatio = containerAspectRatio != null;
  const hasOverlay = overlay != null;
  const supportsIndicator = step.type !== "canvas";

  const canDragIndicator = supportsIndicator && onUpdate != null && indicatorViewport != null;

  const handleIndicatorCommit = (position: IndicatorPosition) => {
    if (!onUpdate || !indicatorViewport) return;

    onUpdate(step.id, {
      targetElement: withIndicatorPosition(targetElement, position, indicatorViewport),
    });
  };

  const {
    circleRef,
    position: renderedIndicatorPosition,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useIndicatorDrag({
    position: indicatorPosition ?? INDICATOR_CENTER,
    containerRef,
    enabled: canDragIndicator,
    onCommit: handleIndicatorCommit,
  });

  const mediaAltText =
    media?.altText ?? step.actionText ?? step.canvasContent?.headingText ?? "Step screenshot";

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
      setShowOverlay(true);
    }
  }, []);

  const handleImageLoad = () => {
    setLoaded(true);
    setShowOverlay(true);
  };

  const canToggleIndicator = media != null && onUpdate != null && supportsIndicator;
  const hasIndicator = indicatorPosition != null;

  const handleToggleIndicator = () => {
    if (!onUpdate) return;

    if (hasIndicator) {
      onUpdate(step.id, { targetElement: withoutIndicator(targetElement) });
      return;
    }

    const viewport = resolveIndicatorViewport(targetElement, media, imgRef.current);
    if (!viewport) return;

    onUpdate(step.id, {
      targetElement: withIndicatorPosition(targetElement, INDICATOR_CENTER, viewport),
    });
  };

  const slotName = ExtensionSlotKeys.STEP_MEDIA_TOOLBAR;
  const hasSlot = extensionRegistry.getSlot(slotName) != null;

  const mediaToolbar =
    onReplaceMedia || hasSlot || canToggleIndicator ? (
      <StepMediaToolbar visible={isReplacing}>
        {onReplaceMedia && (
          <StepMediaToolbarButton
            label={isReplacing ? "Uploading…" : "Replace screenshot"}
            disabled={isReplacing}
            onClick={onReplaceMedia}
            icon={isReplacing ? <Loader2Icon className="animate-spin" /> : <ImageUpIcon />}
          />
        )}
        {canToggleIndicator && (
          <StepMediaToolbarButton
            label={hasIndicator ? "Hide indicator" : "Show indicator"}
            disabled={!hasIndicator && indicatorViewport == null && !loaded}
            onClick={handleToggleIndicator}
            icon={hasIndicator ? <CircleOffIcon /> : <CircleDotIcon />}
          />
        )}
        <ExtensionSlot name={slotName} props={{ step }} />
      </StepMediaToolbar>
    ) : null;

  if (media) {
    const hasScreenshot = media.mimeType?.startsWith("image/");
    const hasGif = media.mimeType?.startsWith("image/gif");

    if ((hasScreenshot || hasGif) && media.url) {
      if (hasAspectRatio) {
        return (
          <div
            ref={containerRef}
            data-slot="step-media"
            className={cn(
              "group relative mb-4 overflow-hidden rounded-sm border bg-muted/20 shadow-xs",
              className,
            )}
            style={{ aspectRatio: containerAspectRatio }}
          >
            {mediaToolbar}
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="absolute inset-0 rounded-none" />
                <CameraIcon className="relative h-8 w-8 text-muted-foreground/20" />
              </div>
            )}
            {!error && (
              <>
                {media.thumbnail && (
                  <img
                    src={media.thumbnail}
                    alt=""
                    aria-hidden
                    className={cn(
                      "absolute inset-0 h-full w-full object-contain blur-md transition-opacity duration-500",
                      loaded ? "opacity-0" : "opacity-100",
                    )}
                  />
                )}
                <img
                  ref={imgRef}
                  src={media.url}
                  alt={mediaAltText}
                  className={cn(
                    "absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
                    !loaded && !media.thumbnail && "opacity-0",
                    media.thumbnail && (loaded ? "opacity-100" : "opacity-0"),
                    !media.thumbnail && loaded && "opacity-100",
                  )}
                  onLoad={handleImageLoad}
                  onError={() => {
                    setLoaded(true);
                    setError(true);
                  }}
                />
                {hasOverlay && indicatorPosition && showOverlay && (
                  <StepOverlay
                    left={`${renderedIndicatorPosition.x * 100}%`}
                    top={`${renderedIndicatorPosition.y * 100}%`}
                    interactive={canDragIndicator}
                    isDragging={isDragging}
                    circleRef={circleRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                  />
                )}
              </>
            )}
            {error && (
              <div className="flex aspect-video items-center justify-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground/60">Failed to load screenshot</p>
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          className={cn(
            "group relative mb-4 overflow-hidden rounded-sm border bg-muted/20 shadow-xs",
            className,
          )}
        >
          {mediaToolbar}
          {!loaded && (
            <div className="flex items-center justify-center py-6">
              <CameraIcon className="h-8 w-8 text-muted-foreground/20" />
            </div>
          )}
          {!error && (
            <>
              {media.thumbnail && (
                <img
                  src={media.thumbnail}
                  alt=""
                  aria-hidden
                  className={cn(
                    "w-full object-contain blur-md transition-opacity duration-500",
                    loaded ? "hidden" : "block",
                  )}
                />
              )}
              <img
                ref={imgRef}
                src={media.url}
                alt={mediaAltText}
                className={cn(
                  "w-full object-contain transition-opacity duration-500",
                  !loaded && !media.thumbnail && "opacity-0",
                  media.thumbnail && (loaded ? "opacity-100" : "opacity-0"),
                  !media.thumbnail && loaded && "opacity-100",
                )}
                onLoad={handleImageLoad}
                onError={() => {
                  setLoaded(true);
                  setError(true);
                }}
              />
            </>
          )}
          {error && (
            <div className="flex items-center justify-center gap-2 py-6">
              <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground/60">Failed to load screenshot</p>
            </div>
          )}
        </div>
      );
    }
  }

  if (step.type !== "interaction" || !step.action) {
    return <></>;
  }

  if (onReplaceMedia) {
    return (
      <div className="mb-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 py-8">
        <p className="text-sm text-muted-foreground/60">No screenshot captured</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isReplacing}
          onClick={(e) => {
            e.stopPropagation();
            onReplaceMedia();
          }}
        >
          {isReplacing ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UploadIcon className="h-3.5 w-3.5" />
          )}
          {isReplacing ? "Uploading…" : "Upload screenshot"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 py-10",
      )}
    >
      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground/60">No screenshot captured</p>
    </div>
  );
}
