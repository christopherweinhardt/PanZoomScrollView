import assert from 'node:assert/strict';

import {
  SCALE_RUBBER_DIMENSION,
  applyScaleRubber,
  clamp,
  getMaxTranslate,
  inverseRubberClamp,
  inverseScaleRubber,
  rubberBand,
  rubberClamp,
} from '../src/utils/clamp.ts';
import { focalTranslate } from '../src/utils/focal.ts';

function closeTo(actual: number, expected: number, epsilon = 1e-6): void {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function screenPoint(content: number, scale: number, translate: number): number {
  return scale * content + translate;
}

// Apple's curve: 100px of pull on a 400px axis at c=0.55 resists to ~48.4px.
closeTo(rubberBand(100, 400, 0.55), 48.4, 0.15);
assert.equal(rubberBand(0, 400, 0.55), 0);
assert.equal(rubberBand(40, 400, 0), 0);
assert.ok(rubberBand(500, 400, 0.55) < 400);
assert.ok(rubberBand(200, 400, 0.55) > rubberBand(100, 400, 0.55));

for (const offset of [1, 12, 40, 80, 150, 400]) {
  const displayed = rubberBand(offset, 390, 0.55);
  closeTo(rubberBandInverseRoundTrip(displayed, 390, 0.55), offset, 0.05);
}

function rubberBandInverseRoundTrip(
  displayed: number,
  dimension: number,
  coefficient: number,
): number {
  const raw = inverseRubberClamp(displayed, 0, 0, dimension, coefficient);
  return raw;
}

assert.equal(clamp(5, 0, 3), 3);
assert.equal(clamp(-2, 0, 3), 0);
assert.equal(clamp(1.5, 0, 3), 1.5);

assert.equal(getMaxTranslate(0, 2), 0);
assert.equal(getMaxTranslate(200, 1), 0);
assert.equal(getMaxTranslate(200, 0.8), 0);
assert.equal(getMaxTranslate(200, 3), 200);

const fitted = rubberClamp(80, 0, 0, 320, 0.55);
assert.ok(fitted > 0 && fitted < 80);
assert.equal(rubberClamp(10, -40, 40, 320, 0.55), 10);
assert.equal(rubberClamp(10, -40, 40, 320, 0), 10);
assert.equal(rubberClamp(90, -40, 40, 320, 0), 40);

const overscrolled = rubberClamp(120, -40, 40, 300, 0.55);
const recovered = inverseRubberClamp(overscrolled, -40, 40, 300, 0.55);
closeTo(recovered, 120, 0.05);
closeTo(
  rubberClamp(recovered, -40, 40, 300, 0.55),
  overscrolled,
  0.05,
);

const shownScale = applyScaleRubber(6.2, 1, 5, 0.55);
assert.ok(shownScale > 5 && shownScale < 5 + SCALE_RUBBER_DIMENSION);
closeTo(inverseScaleRubber(shownScale, 1, 5, 0.55), 6.2, 0.05);
assert.equal(applyScaleRubber(2, 1, 5, 0.55), 2);

// Stationary focal, already panned: the content point under the fingers stays put.
const originScale = 2;
const originTranslate = 36;
const focal = 80;
const content = (focal - originTranslate) / originScale;
const zoomed = focalTranslate({
  originTranslate,
  originFocal: focal,
  currentFocal: focal,
  originScale,
  nextScale: 3.5,
});
closeTo(screenPoint(content, 3.5, zoomed), focal, 1e-6);

// Equivalent delta form: ΔT = (focal - originTranslate) * (1 - scaleChange)
const scaleChange = 3.5 / originScale;
const delta = (focal - originTranslate) * (1 - scaleChange);
closeTo(zoomed, originTranslate + delta, 1e-6);

// Centered content reduces to ΔT = (focal - center) * (1 - scaleChange).
const fromCenter = focalTranslate({
  originTranslate: 0,
  originFocal: -24,
  currentFocal: -24,
  originScale: 1,
  nextScale: 2.5,
});
closeTo(fromCenter, -24 * (1 - 2.5), 1e-6);

// First pinch frame must not move the page.
const unchanged = focalTranslate({
  originTranslate: -12,
  originFocal: 40,
  currentFocal: 40,
  originScale: 1.8,
  nextScale: 1.8,
});
closeTo(unchanged, -12, 1e-6);

// Sliding both fingers without changing scale pans 1:1 with the focal.
const panned = focalTranslate({
  originTranslate: 15,
  originFocal: 10,
  currentFocal: 46,
  originScale: 2,
  nextScale: 2,
});
closeTo(panned, 15 + (46 - 10), 1e-6);

// Scale and focal movement together keep the original content point under the new focal.
const movedFocal = 28;
const nextScale = 4;
const combined = focalTranslate({
  originTranslate,
  originFocal: focal,
  currentFocal: movedFocal,
  originScale,
  nextScale,
});
closeTo(screenPoint(content, nextScale, combined), movedFocal, 1e-6);

// Double-tap math stays inside the page bounds.
const width = 390;
const tap = 40 - width / 2;
const target = 2.5;
const rawTapTranslate = focalTranslate({
  originTranslate: 0,
  originFocal: tap,
  currentFocal: tap,
  originScale: 1,
  nextScale: target,
});
const limit = getMaxTranslate(width, target);
const tapped = clamp(rawTapTranslate, -limit, limit);
assert.ok(tapped >= -limit && tapped <= limit);
closeTo(screenPoint((tap - 0) / 1, target, rawTapTranslate), tap, 1e-6);

console.log('physics tests passed');
