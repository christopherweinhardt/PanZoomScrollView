import { useCallback, useEffect, useRef } from 'react';
import {
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useAnimatedReaction,
  useSharedValue,
  withDecay,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import type { ZoomGestureState } from '../types';
import {
  applyScaleRubber,
  clamp,
  getMaxTranslate,
  inverseRubberClamp,
  inverseScaleRubber,
  rubberClamp,
} from '../utils/clamp';
import { focalTranslate } from '../utils/focal';
import { useBounds } from './useBounds';

const IOS_SPRING: WithSpringConfig = {
  damping: 28,
  stiffness: 320,
  mass: 0.7,
  overshootClamping: false,
};

/** Snap back from rubber or momentum overshoot — no bounce past the edge. */
const EDGE_SPRING: WithSpringConfig = {
  damping: 32,
  stiffness: 380,
  mass: 0.65,
  overshootClamping: true,
};

const DECAY_DECELERATION = 0.992;
const FLING_VELOCITY_SCALE = 0.88;
const FLING_SPEED = 80;
const SCALE_EPSILON = 0.02;

type UseZoomGesturesOptions = {
  layoutWidth: SharedValue<number>;
  layoutHeight: SharedValue<number>;
  minScale: number;
  maxScale: number;
  doubleTapScale: number;
  rubberBandFactor: number;
  onZoomChange?: (scale: number) => void;
  onSingleTap?: (point: { x: number; y: number }) => void;
};

export function useZoomGestures({
  layoutWidth,
  layoutHeight,
  minScale,
  maxScale,
  doubleTapScale,
  rubberBandFactor,
  onZoomChange,
  onSingleTap,
}: UseZoomGesturesOptions) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rawScale = useSharedValue(1);
  const rawX = useSharedValue(0);
  const rawY = useSharedValue(0);

  const minScaleSv = useSharedValue(minScale);
  const maxScaleSv = useSharedValue(maxScale);
  const doubleTapScaleSv = useSharedValue(doubleTapScale);
  const rubberSv = useSharedValue(rubberBandFactor);
  useEffect(() => {
    minScaleSv.value = minScale;
    maxScaleSv.value = maxScale;
    doubleTapScaleSv.value = doubleTapScale;
    rubberSv.value = rubberBandFactor;
  }, [
    doubleTapScale,
    doubleTapScaleSv,
    maxScale,
    maxScaleSv,
    minScale,
    minScaleSv,
    rubberBandFactor,
    rubberSv,
  ]);

  const isPanning = useSharedValue(false);
  const isPinching = useSharedValue(false);
  const isSettling = useSharedValue(false);
  const settleTokens = useSharedValue(0);
  const settleGeneration = useSharedValue(0);
  const gestureState = useSharedValue<ZoomGestureState>('idle');
  const indicatorOpacity = useSharedValue(0);

  const panOriginX = useSharedValue(0);
  const panOriginY = useSharedValue(0);
  const lastPanTranslationX = useSharedValue(0);
  const lastPanTranslationY = useSharedValue(0);
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);

  const originRawScale = useSharedValue(1);
  const originDisplayScale = useSharedValue(1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const originFocalX = useSharedValue(0);
  const originFocalY = useSharedValue(0);
  const lastFocalX = useSharedValue(0);
  const lastFocalY = useSharedValue(0);

  const hasZoomListener = useSharedValue(onZoomChange ? 1 : 0);
  const hasSingleTap = useSharedValue(onSingleTap ? 1 : 0);
  useEffect(() => {
    hasZoomListener.value = onZoomChange ? 1 : 0;
    hasSingleTap.value = onSingleTap ? 1 : 0;
  }, [hasSingleTap, hasZoomListener, onSingleTap, onZoomChange]);

  const onZoomChangeRef = useRef(onZoomChange);
  const onSingleTapRef = useRef(onSingleTap);
  onZoomChangeRef.current = onZoomChange;
  onSingleTapRef.current = onSingleTap;

  const emitZoom = useCallback((next: number) => {
    onZoomChangeRef.current?.(next);
  }, []);
  const emitSingleTap = useCallback((x: number, y: number) => {
    onSingleTapRef.current?.({ x, y });
  }, []);

  const { maxTranslateX, maxTranslateY } = useBounds(
    layoutWidth,
    layoutHeight,
    scale,
  );

  const showIndicators = () => {
    'worklet';
    cancelAnimation(indicatorOpacity);
    indicatorOpacity.value = withTiming(1, { duration: 80 });
  };

  const scheduleHideIndicators = () => {
    'worklet';
    indicatorOpacity.value = withDelay(700, withTiming(0, { duration: 260 }));
  };

  const captureRawFromDisplay = () => {
    'worklet';
    const width = layoutWidth.value;
    const height = layoutHeight.value;
    const coeff = rubberSv.value;
    const limitX = getMaxTranslate(width, scale.value);
    const limitY = getMaxTranslate(height, scale.value);
    rawX.value = inverseRubberClamp(
      translateX.value,
      -limitX,
      limitX,
      width,
      coeff,
    );
    rawY.value = inverseRubberClamp(
      translateY.value,
      -limitY,
      limitY,
      height,
      coeff,
    );
    rawScale.value = inverseScaleRubber(
      scale.value,
      minScaleSv.value,
      maxScaleSv.value,
      coeff,
    );
  };

  const markIdle = () => {
    'worklet';
    if (isPanning.value || isPinching.value) {
      return;
    }
    isSettling.value = false;
    settleTokens.value = 0;
    gestureState.value = 'idle';
    scheduleHideIndicators();
  };

  const finishSettleStep = (generation: number) => {
    'worklet';
    if (settleGeneration.value !== generation) {
      return;
    }
    settleTokens.value -= 1;
    if (settleTokens.value <= 0) {
      captureRawFromDisplay();
      markIdle();
    }
  };

  const stopMomentum = () => {
    'worklet';
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    settleGeneration.value += 1;
    settleTokens.value = 0;
    isSettling.value = false;
    const width = layoutWidth.value;
    const height = layoutHeight.value;
    if (width > 0 && height > 0) {
      captureRawFromDisplay();
    }
  };

  const publishFromRaw = () => {
    'worklet';
    const width = layoutWidth.value;
    const height = layoutHeight.value;
    if (width <= 0 || height <= 0) {
      return;
    }
    const coeff = rubberSv.value;
    const limitX = getMaxTranslate(width, scale.value);
    const limitY = getMaxTranslate(height, scale.value);
    translateX.value = rubberClamp(rawX.value, -limitX, limitX, width, coeff);
    translateY.value = rubberClamp(rawY.value, -limitY, limitY, height, coeff);
  };

  const animateTo = (targetScale: number, x: number, y: number) => {
    'worklet';
    stopMomentum();
    const generation = settleGeneration.value;
    isSettling.value = true;
    settleTokens.value = 3;
    showIndicators();
    rawScale.value = targetScale;
    rawX.value = x;
    rawY.value = y;
    const finish = (finished?: boolean) => {
      'worklet';
      if (finished) {
        finishSettleStep(generation);
      }
    };
    scale.value = withSpring(targetScale, IOS_SPRING, finish);
    translateX.value = withSpring(x, IOS_SPRING, finish);
    translateY.value = withSpring(y, IOS_SPRING, finish);
  };

  const springAxis = (
    value: SharedValue<number>,
    target: number,
    velocity: number,
    generation: number,
  ) => {
    'worklet';
    settleTokens.value += 1;
    value.value = withSpring(
      target,
      { ...EDGE_SPRING, velocity },
      (finished) => {
        'worklet';
        if (finished) {
          finishSettleStep(generation);
        }
      },
    );
  };

  const decayAxis = (
    value: SharedValue<number>,
    velocity: number,
    min: number,
    max: number,
    generation: number,
  ) => {
    'worklet';
    settleTokens.value += 1;
    gestureState.value = 'momentum';
    const scaledVelocity = velocity * FLING_VELOCITY_SCALE;
    value.value = withDecay(
      {
        velocity: scaledVelocity,
        deceleration: DECAY_DECELERATION,
        clamp: [min, max],
        rubberBandEffect: false,
      },
      (finished) => {
        'worklet';
        if (!finished || settleGeneration.value !== generation) {
          return;
        }
        const current = value.value;
        if (current < min - 0.5 || current > max + 0.5) {
          const target = clamp(current, min, max);
          value.value = withSpring(
            target,
            EDGE_SPRING,
            (springFinished) => {
              'worklet';
              if (springFinished) {
                finishSettleStep(generation);
              }
            },
          );
          return;
        }
        finishSettleStep(generation);
      },
    );
  };

  const inwardVelocity = (
    current: number,
    min: number,
    max: number,
    velocity: number,
  ) => {
    'worklet';
    if (current > max) {
      return velocity < 0 ? velocity : 0;
    }
    if (current < min) {
      return velocity > 0 ? velocity : 0;
    }
    return velocity;
  };

  const settleTranslation = (vx: number, vy: number) => {
    'worklet';
    const width = layoutWidth.value;
    const height = layoutHeight.value;
    const limitX = getMaxTranslate(width, scale.value);
    const limitY = getMaxTranslate(height, scale.value);
    const x = translateX.value;
    const y = translateY.value;
    const xOutside = x < -limitX || x > limitX;
    const yOutside = y < -limitY || y > limitY;
    const flingX = !xOutside && Math.abs(vx) >= FLING_SPEED;
    const flingY = !yOutside && Math.abs(vy) >= FLING_SPEED;

    const generation = settleGeneration.value;
    settleTokens.value = 0;
    if (!xOutside && !yOutside && !flingX && !flingY) {
      rawX.value = x;
      rawY.value = y;
      markIdle();
      return;
    }

    isSettling.value = true;
    showIndicators();
    gestureState.value = flingX || flingY ? 'momentum' : 'settling';

    if (xOutside) {
      const target = clamp(x, -limitX, limitX);
      rawX.value = target;
      springAxis(
        translateX,
        target,
        inwardVelocity(x, -limitX, limitX, vx),
        generation,
      );
    } else if (flingX) {
      rawX.value = clamp(x, -limitX, limitX);
      decayAxis(translateX, vx, -limitX, limitX, generation);
    }

    if (yOutside) {
      const target = clamp(y, -limitY, limitY);
      rawY.value = target;
      springAxis(
        translateY,
        target,
        inwardVelocity(y, -limitY, limitY, vy),
        generation,
      );
    } else if (flingY) {
      rawY.value = clamp(y, -limitY, limitY);
      decayAxis(translateY, vy, -limitY, limitY, generation);
    }
  };

  const maybeSettle = () => {
    'worklet';
    if (isPanning.value || isPinching.value || isSettling.value) {
      return;
    }
    const width = layoutWidth.value;
    const height = layoutHeight.value;
    if (width <= 0 || height <= 0) {
      markIdle();
      return;
    }

    const minS = minScaleSv.value;
    const maxS = maxScaleSv.value;
    let targetScale = scale.value;
    if (scale.value < minS) {
      targetScale = minS;
    } else if (scale.value > maxS) {
      targetScale = maxS;
    }

    if (targetScale !== scale.value) {
      const ratio = targetScale / Math.max(scale.value, 1e-4);
      const focalX = lastFocalX.value - width / 2;
      const focalY = lastFocalY.value - height / 2;
      const nextX = rawX.value * ratio + focalX * (1 - ratio);
      const nextY = rawY.value * ratio + focalY * (1 - ratio);
      const limitX = getMaxTranslate(width, targetScale);
      const limitY = getMaxTranslate(height, targetScale);
      gestureState.value = 'settling';
      animateTo(
        targetScale,
        clamp(nextX, -limitX, limitX),
        clamp(nextY, -limitY, limitY),
      );
      return;
    }

    rawScale.value = scale.value;
    settleTranslation(velocityX.value, velocityY.value);
  };

  const zoomAboutCenter = (requested: number) => {
    'worklet';
    const minS = minScaleSv.value;
    const maxS = maxScaleSv.value;
    const target = clamp(requested, minS, maxS);
    const current = Math.max(scale.value, 1e-4);
    const ratio = target / current;
    const width = layoutWidth.value;
    const height = layoutHeight.value;
    const limitX = getMaxTranslate(width, target);
    const limitY = getMaxTranslate(height, target);
    gestureState.value = 'settling';
    animateTo(
      target,
      clamp(translateX.value * ratio, -limitX, limitX),
      clamp(translateY.value * ratio, -limitY, limitY),
    );
  };

  useAnimatedReaction(
    () => Math.round(scale.value * 100) / 100,
    (current, previous) => {
      if (hasZoomListener.value !== 1) {
        return;
      }
      if (previous == null || current !== previous) {
        scheduleOnRN(emitZoom, current);
      }
    },
  );

  useAnimatedReaction(
    () => ({ w: layoutWidth.value, h: layoutHeight.value }),
    (current, previous) => {
      if (
        previous == null ||
        isPanning.value ||
        isPinching.value ||
        (current.w === previous.w && current.h === previous.h)
      ) {
        return;
      }
      const limitX = getMaxTranslate(current.w, scale.value);
      const limitY = getMaxTranslate(current.h, scale.value);
      translateX.value = clamp(translateX.value, -limitX, limitX);
      translateY.value = clamp(translateY.value, -limitY, limitY);
      rawX.value = translateX.value;
      rawY.value = translateY.value;
    },
  );

  const pan = usePanGesture({
    minPointers: 1,
    maxPointers: 2,
    minDistance: 4,
    averageTouches: true,
    enableTrackpadTwoFingerGesture: true,
    onTouchesDown: () => {
      stopMomentum();
    },
    onActivate: () => {
      if (isPinching.value) {
        return;
      }
      if (isSettling.value) {
        stopMomentum();
      }
      captureRawFromDisplay();
      panOriginX.value = rawX.value;
      panOriginY.value = rawY.value;
      lastPanTranslationX.value = 0;
      lastPanTranslationY.value = 0;
      isPanning.value = true;
      gestureState.value = 'pan';
      showIndicators();
    },
    onUpdate: (event) => {
      lastPanTranslationX.value = event.translationX;
      lastPanTranslationY.value = event.translationY;
      velocityX.value = event.velocityX;
      velocityY.value = event.velocityY;
      if (isPinching.value) {
        return;
      }
      rawX.value = panOriginX.value + event.translationX;
      rawY.value = panOriginY.value + event.translationY;
      publishFromRaw();
    },
    onDeactivate: (event) => {
      if (!isPanning.value) {
        return;
      }
      isPanning.value = false;
      if (!event.canceled) {
        velocityX.value = event.velocityX;
        velocityY.value = event.velocityY;
      } else {
        velocityX.value = 0;
        velocityY.value = 0;
      }
      maybeSettle();
    },
    onFinalize: () => {
      if (!isPanning.value && !isPinching.value && !isSettling.value) {
        scheduleHideIndicators();
      }
    },
  });

  const pinch = usePinchGesture({
    onTouchesDown: () => {
      stopMomentum();
    },
    onActivate: (event) => {
      captureRawFromDisplay();
      isPinching.value = true;
      originRawScale.value = rawScale.value;
      originDisplayScale.value = Math.max(scale.value, 1e-4);
      originX.value = rawX.value;
      originY.value = rawY.value;
      originFocalX.value = event.focalX;
      originFocalY.value = event.focalY;
      lastFocalX.value = event.focalX;
      lastFocalY.value = event.focalY;
      gestureState.value = 'pinch';
      showIndicators();
    },
    onUpdate: (event) => {
      const width = layoutWidth.value;
      const height = layoutHeight.value;
      if (width <= 0 || height <= 0) {
        return;
      }
      const coeff = rubberSv.value;
      rawScale.value = Math.max(0.01, originRawScale.value * event.scale);
      const nextDisplay = applyScaleRubber(
        rawScale.value,
        minScaleSv.value,
        maxScaleSv.value,
        coeff,
      );
      const focalX = event.focalX - width / 2;
      const focalY = event.focalY - height / 2;
      const startFocalX = originFocalX.value - width / 2;
      const startFocalY = originFocalY.value - height / 2;
      rawX.value = focalTranslate({
        originTranslate: originX.value,
        originFocal: startFocalX,
        currentFocal: focalX,
        originScale: originDisplayScale.value,
        nextScale: nextDisplay,
      });
      rawY.value = focalTranslate({
        originTranslate: originY.value,
        originFocal: startFocalY,
        currentFocal: focalY,
        originScale: originDisplayScale.value,
        nextScale: nextDisplay,
      });
      scale.value = nextDisplay;
      lastFocalX.value = event.focalX;
      lastFocalY.value = event.focalY;
      publishFromRaw();
    },
    onFinalize: () => {
      if (!isPinching.value) {
        return;
      }
      isPinching.value = false;
      panOriginX.value = rawX.value - lastPanTranslationX.value;
      panOriginY.value = rawY.value - lastPanTranslationY.value;
      if (isPanning.value) {
        gestureState.value = 'pan';
        return;
      }
      maybeSettle();
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    maxDuration: 260,
    maxDelay: 280,
    maxDistance: 24,
    onTouchesDown: () => {
      stopMomentum();
    },
    onDeactivate: (event) => {
      if (event.canceled) {
        return;
      }
      const width = layoutWidth.value;
      const height = layoutHeight.value;
      if (width <= 0 || height <= 0) {
        return;
      }
      gestureState.value = 'double-tap';
      showIndicators();
      const minS = minScaleSv.value;
      if (scale.value > minS + SCALE_EPSILON) {
        animateTo(minS, 0, 0);
        return;
      }
      const target = clamp(doubleTapScaleSv.value, minS, maxScaleSv.value);
      const focalX = event.x - width / 2;
      const focalY = event.y - height / 2;
      const nextX = focalTranslate({
        originTranslate: translateX.value,
        originFocal: focalX,
        currentFocal: focalX,
        originScale: Math.max(scale.value, 1e-4),
        nextScale: target,
      });
      const nextY = focalTranslate({
        originTranslate: translateY.value,
        originFocal: focalY,
        currentFocal: focalY,
        originScale: Math.max(scale.value, 1e-4),
        nextScale: target,
      });
      const limitX = getMaxTranslate(width, target);
      const limitY = getMaxTranslate(height, target);
      animateTo(target, clamp(nextX, -limitX, limitX), clamp(nextY, -limitY, limitY));
    },
  });

  const singleTap = useTapGesture({
    numberOfTaps: 1,
    maxDuration: 260,
    maxDistance: 18,
    onDeactivate: (event) => {
      if (event.canceled || hasSingleTap.value !== 1) {
        return;
      }
      scheduleOnRN(emitSingleTap, event.x, event.y);
    },
  });

  const movement = useSimultaneousGestures(pan, pinch);
  const gesture = useExclusiveGestures(doubleTap, singleTap, movement);

  const zoomTo = (requested: number) => {
    scheduleOnUI((next: number) => {
      'worklet';
      zoomAboutCenter(next);
    }, requested);
  };
  const toggleScale = (requested: number) => {
    scheduleOnUI((next: number) => {
      'worklet';
      if (Math.abs(scale.value - next) <= 0.08) {
        zoomAboutCenter(minScaleSv.value);
        return;
      }
      zoomAboutCenter(next);
    }, requested);
  };
  const reset = () => {
    scheduleOnUI(() => {
      'worklet';
      gestureState.value = 'settling';
      animateTo(minScaleSv.value, 0, 0);
    });
  };

  return {
    gesture,
    scale,
    translateX,
    translateY,
    gestureState,
    indicatorOpacity,
    maxTranslateX,
    maxTranslateY,
    reset,
    zoomTo,
    toggleScale,
  };
}
