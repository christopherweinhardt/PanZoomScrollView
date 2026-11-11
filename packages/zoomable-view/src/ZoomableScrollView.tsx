import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useZoomGestures } from './hooks/useZoomGestures';
import type {
  ZoomableScrollViewProps,
  ZoomableScrollViewRef,
  ZoomGestureState,
} from './types';
import { clamp } from './utils/clamp';

type IndicatorProps = {
  axis: 'horizontal' | 'vertical';
  layoutWidth: SharedValue<number>;
  layoutHeight: SharedValue<number>;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  maxTranslateX: SharedValue<number>;
  maxTranslateY: SharedValue<number>;
  opacity: SharedValue<number>;
};

function ScrollIndicator({
  axis,
  layoutWidth,
  layoutHeight,
  scale,
  translateX,
  translateY,
  maxTranslateX,
  maxTranslateY,
  opacity,
}: IndicatorProps) {
  const style = useAnimatedStyle(() => {
    const zoomed = scale.value > 1.02;
    const visible = zoomed ? opacity.value : 0;
    if (axis === 'vertical') {
      const size = layoutHeight.value;
      const limit = maxTranslateY.value;
      const offset = translateY.value;
      if (size <= 0) {
        return { opacity: 0 };
      }
      const base = Math.max(28, Math.min(size - 8, size / Math.max(scale.value, 1)));
      const over =
        offset > limit ? offset - limit : offset < -limit ? -limit - offset : 0;
      const thumb = Math.max(16, base * Math.max(0.4, 1 - over / 160));
      const travel = Math.max(0, size - thumb - 6);
      const progress = limit <= 0.5 ? 0 : (limit - offset) / (2 * limit);
      return {
        opacity: visible,
        height: thumb,
        transform: [{ translateY: 3 + clamp(progress, 0, 1) * travel }],
      };
    }

    const size = layoutWidth.value;
    const limit = maxTranslateX.value;
    const offset = translateX.value;
    if (size <= 0) {
      return { opacity: 0 };
    }
    const base = Math.max(28, Math.min(size - 8, size / Math.max(scale.value, 1)));
    const over =
      offset > limit ? offset - limit : offset < -limit ? -limit - offset : 0;
    const thumb = Math.max(16, base * Math.max(0.4, 1 - over / 160));
    const travel = Math.max(0, size - thumb - 6);
    const progress = limit <= 0.5 ? 0 : (limit - offset) / (2 * limit);
    return {
      opacity: visible,
      width: thumb,
      transform: [{ translateX: 3 + clamp(progress, 0, 1) * travel }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[axis === 'vertical' ? styles.verticalBar : styles.horizontalBar, style]}
    />
  );
}

export const ZoomableScrollView = forwardRef<
  ZoomableScrollViewRef,
  ZoomableScrollViewProps
>(function ZoomableScrollView(
  {
    minScale = 1,
    maxScale = 5,
    doubleTapScale = 2.5,
    children,
    style,
    contentContainerStyle,
    onZoomChange,
    onSingleTap,
    rubberBandFactor = 0.55,
    showsHorizontalScrollIndicator = true,
    showsVerticalScrollIndicator = true,
  },
  ref,
) {
  const layoutWidth = useSharedValue(0);
  const layoutHeight = useSharedValue(0);
  const {
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
  } = useZoomGestures({
    layoutWidth,
    layoutHeight,
    minScale,
    maxScale,
    doubleTapScale,
    rubberBandFactor,
    onZoomChange,
    onSingleTap,
  });

  useImperativeHandle(
    ref,
    () => ({
      reset,
      zoomTo,
      toggleScale,
      scale,
      translateX,
      translateY,
      gestureState,
    }),
    [gestureState, reset, scale, toggleScale, translateX, translateY, zoomTo],
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    layoutWidth.value = event.nativeEvent.layout.width;
    layoutHeight.value = event.nativeEvent.layout.height;
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        testID="zoomable-scroll-view"
        accessible
        accessibilityLabel="Hymn sheet"
        collapsable={false}
        onLayout={onLayout}
        style={[styles.container, style]}
      >
        <Animated.View style={[styles.content, contentContainerStyle, contentStyle]}>
          {children}
        </Animated.View>
        {showsVerticalScrollIndicator ? (
          <ScrollIndicator
            axis="vertical"
            layoutWidth={layoutWidth}
            layoutHeight={layoutHeight}
            scale={scale}
            translateX={translateX}
            translateY={translateY}
            maxTranslateX={maxTranslateX}
            maxTranslateY={maxTranslateY}
            opacity={indicatorOpacity}
          />
        ) : null}
        {showsHorizontalScrollIndicator ? (
          <ScrollIndicator
            axis="horizontal"
            layoutWidth={layoutWidth}
            layoutHeight={layoutHeight}
            scale={scale}
            translateX={translateX}
            translateY={translateY}
            maxTranslateX={maxTranslateX}
            maxTranslateY={maxTranslateY}
            opacity={indicatorOpacity}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
});

export type { ZoomGestureState };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  verticalBar: {
    position: 'absolute',
    top: 0,
    right: 3,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(28, 28, 30, 0.45)',
    zIndex: 2,
  },
  horizontalBar: {
    position: 'absolute',
    left: 0,
    bottom: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(28, 28, 30, 0.45)',
    zIndex: 2,
  },
});
