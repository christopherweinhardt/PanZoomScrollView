export type FocalTranslateInput = {
  /** Unconstrained translation when the pinch activated. */
  originTranslate: number;
  /** Center-relative focal point when the pinch activated. */
  originFocal: number;
  /** Center-relative focal point for the current frame. */
  currentFocal: number;
  originScale: number;
  nextScale: number;
};

/**
 * Translation that keeps the content under the pinch focal glued to the fingers.
 *
 * Transform (origin at the view center):
 *   screen = scale * content + translate
 *
 * For a stationary focal this is:
 *   scaleChange = nextScale / originScale
 *   T' = originTranslate * scaleChange + originFocal * (1 - scaleChange)
 *   ΔT = (originFocal - originTranslate) * (1 - scaleChange)
 *
 * The `(focal - center) * (1 - scaleChange)` term is that adjustment when the
 * content is still centered. Subtracting the current translation keeps an
 * already-panned page from drifting. A moving focal (fingers sliding while
 * pinching) substitutes `currentFocal`, which is the pan-during-pinch path.
 */
export function focalTranslate({
  originTranslate,
  originFocal,
  currentFocal,
  originScale,
  nextScale,
}: FocalTranslateInput): number {
  'worklet';
  const safeOrigin = originScale === 0 ? 1e-6 : originScale;
  const ratio = nextScale / safeOrigin;
  return currentFocal - ratio * (originFocal - originTranslate);
}
