import {
  MEDIA_ASPECT_RATIO_TOLERANCE,
  type MediaLayout,
  type MediaLayoutAsset,
  type MediaLayoutTarget,
} from "@/models";

const isPositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const isCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

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

  const clickX = targetElement?.clickX;
  const clickY = targetElement?.clickY;
  if (!hasViewport || !isCoordinate(clickX) || !isCoordinate(clickY)) {
    return { aspectRatio };
  }

  const shapesAgree =
    !hasAsset ||
    Math.abs(assetW / assetH - vpw / vph) <= MEDIA_ASPECT_RATIO_TOLERANCE;
  if (!shapesAgree) {
    return { aspectRatio };
  }

  return {
    aspectRatio,
    overlay: {
      left: `${(clickX / vpw) * 100}%`,
      top: `${(clickY / vph) * 100}%`,
    },
  };
};
