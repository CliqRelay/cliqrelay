import {
  MEDIA_ASPECT_RATIO_TOLERANCE,
  type IndicatorPosition,
  type IndicatorTargetElement,
  type IndicatorViewport,
  type MediaLayout,
  type MediaLayoutAsset,
  type MediaLayoutTarget,
} from "@/models";

const isPositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const isCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clampNormalized = (value: number) => Math.min(1, Math.max(0, value));

export const readIndicatorPosition = (
  targetElement?: IndicatorTargetElement | MediaLayoutTarget | null,
): IndicatorPosition | null => {
  const vpw = targetElement?.viewportWidth;
  const vph = targetElement?.viewportHeight;
  const clickX = targetElement?.clickX;
  const clickY = targetElement?.clickY;

  if (!isPositive(vpw) || !isPositive(vph) || !isCoordinate(clickX) || !isCoordinate(clickY)) {
    return null;
  }

  return {
    x: clampNormalized(clickX / vpw),
    y: clampNormalized(clickY / vph),
  };
};

export const withIndicatorPosition = (
  targetElement: IndicatorTargetElement | null | undefined,
  position: IndicatorPosition,
  viewport: IndicatorViewport,
): IndicatorTargetElement => ({
  ...targetElement,
  clickX: Math.round(position.x * viewport.width),
  clickY: Math.round(position.y * viewport.height),
  viewportWidth: viewport.width,
  viewportHeight: viewport.height,
});

export const withoutIndicator = (
  targetElement: IndicatorTargetElement | null | undefined,
): IndicatorTargetElement => {
  const next = { ...targetElement };
  delete next.clickX;
  delete next.clickY;
  return next;
};

export const resolveIndicatorViewport = (
  targetElement?: IndicatorTargetElement | null,
  media?: MediaLayoutAsset | null,
  image?: Pick<HTMLImageElement, "naturalWidth" | "naturalHeight"> | null,
): IndicatorViewport | null => {
  const vpw = targetElement?.viewportWidth;
  const vph = targetElement?.viewportHeight;
  if (isPositive(vpw) && isPositive(vph)) {
    return { width: vpw, height: vph };
  }

  const assetW = media?.width;
  const assetH = media?.height;
  if (isPositive(assetW) && isPositive(assetH)) {
    return { width: assetW, height: assetH };
  }

  const imageW = image?.naturalWidth;
  const imageH = image?.naturalHeight;
  if (isPositive(imageW) && isPositive(imageH)) {
    return { width: imageW, height: imageH };
  }

  return null;
};

export const resolveMediaLayout = (
  targetElement?: MediaLayoutTarget | null,
  media?: MediaLayoutAsset | null,
): MediaLayout => {
  const vpw = targetElement?.viewportWidth;
  const vph = targetElement?.viewportHeight;
  const hasViewport = isPositive(vpw) && isPositive(vph);

  const assetW = media?.width;
  const assetH = media?.height;
  const hasAsset = isPositive(assetW) && isPositive(assetH);

  const aspectRatio = hasAsset
    ? `${assetW} / ${assetH}`
    : hasViewport
      ? `${vpw} / ${vph}`
      : undefined;

  const position = readIndicatorPosition(targetElement);
  if (!hasViewport || position == null) {
    return { aspectRatio };
  }

  const shapesAgree =
    !hasAsset || Math.abs(assetW / assetH - vpw / vph) <= MEDIA_ASPECT_RATIO_TOLERANCE;
  if (!shapesAgree) {
    return { aspectRatio };
  }

  return {
    aspectRatio,
    overlay: {
      left: `${position.x * 100}%`,
      top: `${position.y * 100}%`,
    },
  };
};
