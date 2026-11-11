import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ZoomableScrollView,
  type ZoomableScrollViewRef,
} from 'zoomable-view';

import { HymnPage } from './src/HymnPage';
import { CallbackReadout, NumberReadout, StateReadout } from './src/Readout';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Preview />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Preview() {
  const zoomRef = useRef<ZoomableScrollViewRef>(null);
  const [mounted, setMounted] = useState(false);
  const [lastTap, setLastTap] = useState('none');
  const listenerRef = useRef<(scale: number) => void>(() => {});

  useEffect(() => {
    setMounted(true);
  }, []);

  const onZoomChange = useCallback((scale: number) => {
    listenerRef.current(scale);
  }, []);

  const subscribe = useCallback((listener: (scale: number) => void) => {
    listenerRef.current = listener;
    return () => {
      listenerRef.current = () => {};
    };
  }, []);

  const zoom = mounted ? zoomRef.current : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.kicker}>acchymns-rn</Text>
            <Text style={styles.heading}>Quick Look</Text>
          </View>
          {zoom ? <StateReadout state={zoom.gestureState} /> : <View style={styles.pillGhost} />}
        </View>
        {zoom ? (
          <View style={styles.metrics}>
            <NumberReadout label="SCALE" value={zoom.scale} />
            <NumberReadout label="X" value={zoom.translateX} precision={1} />
            <NumberReadout label="Y" value={zoom.translateY} precision={1} />
          </View>
        ) : (
          <Text style={styles.waiting}>Measuring page…</Text>
        )}
        <View style={styles.metaRow}>
          <CallbackReadout subscribe={subscribe} />
          <Text style={styles.tap}>tap {lastTap}</Text>
        </View>
      </View>

      <View style={styles.stage}>
        <ZoomableScrollView
          ref={zoomRef}
          style={styles.zoom}
          minScale={1}
          maxScale={5}
          doubleTapScale={2.5}
          rubberBandFactor={0.55}
          onZoomChange={onZoomChange}
          onSingleTap={({ x, y }) => {
            setLastTap(`${Math.round(x)}, ${Math.round(y)}`);
          }}
        >
          <HymnPage />
        </ZoomableScrollView>
      </View>

      <View style={styles.toolbar}>
        <ToolButton label="Reset Zoom" onPress={() => zoomRef.current?.reset()} />
        <ToolButton label="Toggle 2×" onPress={() => zoomRef.current?.toggleScale(2)} />
        <ToolButton label="Toggle 4×" onPress={() => zoomRef.current?.toggleScale(4)} />
      </View>
    </SafeAreaView>
  );
}

function ToolButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0e0e0f',
  },
  safe: {
    flex: 1,
    backgroundColor: '#0e0e0f',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heading: {
    color: '#f5f5f7',
    fontSize: 22,
    fontWeight: '700',
  },
  pillGhost: {
    width: 92,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#3a3a3c',
  },
  metrics: {
    flexDirection: 'row',
    gap: 12,
  },
  waiting: {
    color: '#8e8e93',
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tap: {
    color: '#8e8e93',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  stage: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1c1c1e',
  },
  zoom: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  buttonPressed: {
    backgroundColor: '#3a3a3c',
  },
  buttonLabel: {
    color: '#f5f5f7',
    fontSize: 13,
    fontWeight: '600',
  },
});
