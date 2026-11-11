import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import type { ZoomGestureState } from 'zoomable-view';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type NumberReadoutProps = {
  label: string;
  value: SharedValue<number>;
  precision?: number;
};

export function NumberReadout({ label, value, precision = 2 }: NumberReadoutProps) {
  const animatedProps = useAnimatedProps(() => {
    const text = value.value.toFixed(precision);
    return {
      text,
      defaultValue: text,
    };
  });

  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <AnimatedTextInput
        editable={false}
        caretHidden
        underlineColorAndroid="transparent"
        animatedProps={animatedProps}
        style={styles.value}
      />
    </View>
  );
}

type StateReadoutProps = {
  state: SharedValue<ZoomGestureState>;
};

export function StateReadout({ state }: StateReadoutProps) {
  const animatedProps = useAnimatedProps(() => ({
    text: state.value,
    defaultValue: state.value,
  }));
  const pill = useAnimatedStyle(() => ({
    backgroundColor: pillColor(state.value),
  }));

  return (
    <Animated.View style={[styles.pill, pill]}>
      <AnimatedTextInput
        editable={false}
        caretHidden
        underlineColorAndroid="transparent"
        animatedProps={animatedProps}
        style={styles.pillText}
      />
    </Animated.View>
  );
}

function pillColor(state: ZoomGestureState): string {
  'worklet';
  switch (state) {
    case 'pan':
      return '#0a84ff';
    case 'pinch':
      return '#ff9f0a';
    case 'momentum':
      return '#bf5af2';
    case 'settling':
      return '#30d158';
    case 'double-tap':
      return '#ff375f';
    default:
      return '#3a3a3c';
  }
}

export function CallbackReadout({
  subscribe,
}: {
  subscribe: (listener: (scale: number) => void) => () => void;
}) {
  const [scale, setScale] = useState(1);
  useEffect(() => subscribe(setScale), [subscribe]);
  return <Text style={styles.callback}>onZoomChange {scale.toFixed(2)}</Text>;
}

const styles = StyleSheet.create({
  metric: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: '#8e8e93',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  value: {
    color: '#f5f5f7',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    padding: 0,
    margin: 0,
    minWidth: 72,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 92,
    alignItems: 'center',
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    padding: 0,
    margin: 0,
    textAlign: 'center',
  },
  callback: {
    color: '#8e8e93',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
