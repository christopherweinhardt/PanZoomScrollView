import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export type ZoomGestureState =
  | 'idle'
  | 'pan'
  | 'pinch'
  | 'momentum'
  | 'settling'
  | 'double-tap';

export type ZoomableScrollViewProps = {
  /** Fitted scale. Defaults to 1. */
  minScale?: number;
  /** Maximum pinch / double-tap scale. Defaults to 5. */
  maxScale?: number;
  /** Scale applied by a double tap at the minimum scale. Defaults to 2.5. */
  doubleTapScale?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Notified when displayed scale changes by about 0.01, from the UI thread. */
  onZoomChange?: (scale: number) => void;
  /** Fires for a single tap. Double taps do not emit this. */
  onSingleTap?: (point: { x: number; y: number }) => void;
  /**
   * UIScrollView rubber-band coefficient. 0.55 matches iOS.
   * 0 disables overscroll and hard-clamps at the content edge.
   */
  rubberBandFactor?: number;
  showsHorizontalScrollIndicator?: boolean;
  showsVerticalScrollIndicator?: boolean;
};

export type ZoomableScrollViewRef = {
  /** Spring back to min scale and zero offset. */
  reset: () => void;
  /** Spring to `scale`, keeping the current center point fixed. */
  zoomTo: (scale: number) => void;
  /** Spring to `scale`, or back to min scale when already there. */
  toggleScale: (scale: number) => void;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  gestureState: SharedValue<ZoomGestureState>;
};
