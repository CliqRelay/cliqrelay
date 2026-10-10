"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useDropzone } from "react-dropzone";
import { Check, ImageUp, RotateCw, Upload, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const FRAME_SIZE = 208;
const OUTPUT_SIZE = 320;
const BUTTON_CLASS = "h-8 rounded-lg px-3 cursor-pointer";
const ENTRANCE_ANIMATION = "animate-in fade-in zoom-in-95 duration-300";

type Stage = "idle" | "editing" | "done";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const FileUpload = () => {
  const [stage, setStage] = useState<Stage>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number[]>([1]);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetEditor = () => {
    setZoom([1]);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const loadFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    loadImage(url).then((img) => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageUrl(url);
      setResultUrl(null);
      resetEditor();
      setStage("editing");
    });
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => loadFile(acceptedFiles[0]),
    [loadFile],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    disabled: stage === "editing",
    noClick: stage !== "idle",
  });

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({
      x: dragState.current.originX + dx,
      y: dragState.current.originY + dy,
    });
  };

  const handlePointerUp = () => {
    dragState.current = null;
    setIsDragging(false);
  };

  const displayScale = useMemo(() => {
    const { width, height } = naturalSize;
    if (!width || !height) return 1;
    return FRAME_SIZE / Math.min(width, height);
  }, [naturalSize]);

  const displaySize = useMemo(
    () => ({
      width: naturalSize.width * displayScale * zoom[0],
      height: naturalSize.height * displayScale * zoom[0],
    }),
    [naturalSize, displayScale, zoom],
  );

  const confirmCrop = () => {
    if (!imageUrl) return;
    loadImage(imageUrl).then((img) => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const outputScale = OUTPUT_SIZE / FRAME_SIZE;
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        OUTPUT_SIZE / 2,
        OUTPUT_SIZE / 2,
        OUTPUT_SIZE / 2,
        0,
        Math.PI * 2,
      );
      ctx.clip();

      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(offset.x * outputScale, offset.y * outputScale);
      const scale = displayScale * zoom[0] * outputScale;
      ctx.scale(scale, scale);
      ctx.drawImage(img, -naturalSize.width / 2, -naturalSize.height / 2);
      ctx.restore();

      setResultUrl(canvas.toDataURL("image/png"));
      setStage("done");
    });
  };

  const startOver = () => {
    setStage("idle");
    setImageUrl(null);
    setResultUrl(null);
    resetEditor();
  };

  return (
    <div className="flex w-full items-center justify-center">
      <Card className="w-full max-w-sm py-6">
        <CardContent className="px-6">
          {stage === "idle" && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div
                {...getRootProps()}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed p-6 transition-all duration-200",
                  isDragActive
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-muted-foreground/25 hover:border-muted-foreground/40",
                )}
                style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
              >
                <input {...getInputProps()} />
                <div className="flex size-10 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-background">
                  <ImageUp className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  {isDragActive ? "Drop it here" : "Drag & drop an image"}
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <p className="max-w-52 text-xs text-muted-foreground">
                  You&apos;ll be able to zoom, pan and rotate before uploading.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className={BUTTON_CLASS}
                  onClick={open}
                >
                  Browse Image
                </Button>
              </div>
            </div>
          )}

          {stage === "editing" && imageUrl && (
            <div
              className={cn(ENTRANCE_ANIMATION, "grid grid-rows-[1fr] gap-5")}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className={cn(
                    "relative touch-none select-none overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-muted",
                    isDragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                  style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
                >
                  <img
                    src={imageUrl}
                    alt="Crop preview"
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                    style={{
                      width: displaySize.width,
                      height: displaySize.height,
                      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                      transition: isDragging
                        ? "none"
                        : "transform 150ms ease-out",
                    }}
                  />
                  {/* grid overlay for framing feedback */}
                  <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/40" />
                </div>

                <div className="flex w-full items-center gap-3">
                  <ZoomIn className="size-3.5 shrink-0 text-muted-foreground" />
                  <Slider
                    value={zoom}
                    onValueChange={(val) =>
                      setZoom(Array.isArray(val) ? val : [val])
                    }
                    min={1}
                    max={3}
                    step={0.01}
                    aria-label="Zoom"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={BUTTON_CLASS}
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  <RotateCw className="size-3.5 transition-transform duration-300" />
                  Rotate
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className={BUTTON_CLASS}
                    onClick={startOver}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className={BUTTON_CLASS}
                    onClick={confirmCrop}
                  >
                    <Upload className="size-3.5" />
                    Use Photo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {stage === "done" && resultUrl && (
            <div
              className={cn(
                ENTRANCE_ANIMATION,
                "flex flex-col items-center gap-4",
              )}
            >
              <div className="relative">
                <img
                  src={resultUrl}
                  alt="Cropped result"
                  className="size-32 rounded-full border"
                  style={{ width: FRAME_SIZE * 0.7, height: FRAME_SIZE * 0.7 }}
                />
                <span className="absolute bottom-0 right-1 flex size-7 items-center justify-center rounded-full bg-teal-400 text-white animate-in zoom-in duration-300">
                  <Check className="size-4" />
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-foreground">
                  Photo ready
                </p>
                <p className="text-xs text-muted-foreground">
                  Cropped and optimized for upload.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className={BUTTON_CLASS}
                onClick={startOver}
              >
                Choose another photo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUpload;
