/**
 * UIScrollView's rubber-band curve:
 *   f(x) = (1 - 1 / (x * c / d + 1)) * d
 * `c` is Apple's coefficient (0.55). `d` is the affected dimension.
 * The result approaches `d` and never reaches it.
 */
export const SCALE_RUBBER_DIMENSION = 0.7;

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** Half the overflow on each side once `scale` exceeds 1. Zero while fitted. */
export function getMaxTranslate(size: number, scale: number): number {
  'worklet';
  if (size <= 0 || scale <= 1) {
    return 0;
  }
  return (size * (scale - 1)) / 2;
}

export function rubberBand(
  offset: number,
  dimension: number,
  coefficient: number,
): number {
  'worklet';
  if (offset <= 0 || coefficient <= 0) {
    return 0;
  }
  const d = dimension <= 0 ? 1 : dimension;
  return (1 - 1 / ((offset * coefficient) / d + 1)) * d;
}

export function rubberBandInverse(
  rubberDistance: number,
  dimension: number,
  coefficient: number,
): number {
  'worklet';
  if (rubberDistance <= 0 || coefficient <= 0) {
    return 0;
  }
  const d = dimension <= 0 ? 1 : dimension;
  const capped = Math.min(rubberDistance, d * 0.999);
  return (d / coefficient) * (1 / (1 - capped / d) - 1);
}

export function rubberClamp(
  value: number,
  min: number,
  max: number,
  dimension: number,
  coefficient: number,
): number {
  'worklet';
  if (value < min) {
    return min - rubberBand(min - value, dimension, coefficient);
  }
  if (value > max) {
    return max + rubberBand(value - max, dimension, coefficient);
  }
  return value;
}

export function inverseRubberClamp(
  displayed: number,
  min: number,
  max: number,
  dimension: number,
  coefficient: number,
): number {
  'worklet';
  if (coefficient <= 0) {
    return clamp(displayed, min, max);
  }
  if (displayed < min) {
    return min - rubberBandInverse(min - displayed, dimension, coefficient);
  }
  if (displayed > max) {
    return max + rubberBandInverse(displayed - max, dimension, coefficient);
  }
  return displayed;
}

export function applyScaleRubber(
  rawScale: number,
  min: number,
  max: number,
  coefficient: number,
): number {
  'worklet';
  if (rawScale > max) {
    return max + rubberBand(rawScale - max, SCALE_RUBBER_DIMENSION, coefficient);
  }
  if (rawScale < min) {
    return min - rubberBand(min - rawScale, SCALE_RUBBER_DIMENSION, coefficient);
  }
  return rawScale;
}

export function inverseScaleRubber(
  displayed: number,
  min: number,
  max: number,
  coefficient: number,
): number {
  'worklet';
  if (coefficient <= 0) {
    return clamp(displayed, min, max);
  }
  if (displayed > max) {
    return (
      max + rubberBandInverse(displayed - max, SCALE_RUBBER_DIMENSION, coefficient)
    );
  }
  if (displayed < min) {
    return (
      min - rubberBandInverse(min - displayed, SCALE_RUBBER_DIMENSION, coefficient)
    );
  }
  return displayed;
}
