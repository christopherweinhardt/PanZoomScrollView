# PanZoomScrollView

A React Native zoomable container with **iOS PDF / Quick Look–style** pan and pinch physics. Gestures run on the UI thread via **Reanimated worklets** and **React Native Gesture Handler 3** hook API (Expo SDK 58).

This repo is an npm workspace:

| Path | Package | Role |
|------|---------|------|
| `packages/zoomable-view` | `zoomable-view` | Reusable `ZoomableScrollView` component |
| `example` | `acchymns-rn` | Expo demo (hymn sheet + debug HUD) |

## Requirements

The library expects the same native stack as the example app:

- React 19+
- React Native 0.76+ (example: 0.88)
- `react-native-gesture-handler` ≥ 3.x (RNGH **hook** gestures, not `Gesture.Pinch()` builders)
- `react-native-reanimated` ≥ 4.x
- `react-native-worklets` (peer of Reanimated 4)

Use **Expo Go** or a **development build** that matches those versions. Web works for layout and programmatic zoom; pinch/pan are best validated on iOS or Android.

## Quick start (example app)

```bash
npm install
npm run ios      # or: npm run android | npm run web
```

From the repo root, `npm start` runs Metro in `example/`.

## Using `zoomable-view` in your app

### 1. Add the package

In a monorepo (like this one), declare a workspace dependency:

```json
{
  "dependencies": {
    "zoomable-view": "*"
  }
}
```

Or copy / link `packages/zoomable-view` into your project and point `"zoomable-view"` at its path.

Install peers with Expo’s versions when applicable:

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets
```

### 2. App entry and root view

Import gesture handler **first** in your entry file:

```ts
import 'react-native-gesture-handler';
```

Wrap the app (or screen) in `GestureHandlerRootView`:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ... */}
    </GestureHandlerRootView>
  );
}
```

Expo projects using `babel-preset-expo` already include the Reanimated Babel plugin—no extra `babel.config.js` is required unless you customize Babel.

### 3. Basic usage

`ZoomableScrollView` fills its parent, clips overflow, and transforms a single absolutely positioned content layer. Scale **1** means content is fitted to the viewport; pan is only meaningful when zoomed in.

```tsx
import { useRef } from 'react';
import { View, Text } from 'react-native';
import {
  ZoomableScrollView,
  type ZoomableScrollViewRef,
} from 'zoomable-view';

export function SheetScreen() {
  const zoomRef = useRef<ZoomableScrollViewRef>(null);

  return (
    <View style={{ flex: 1 }}>
      <ZoomableScrollView
        ref={zoomRef}
        minScale={1}
        maxScale={5}
        doubleTapScale={2.5}
        rubberBandFactor={0.55}
        onZoomChange={(scale) => console.log('scale', scale)}
        onSingleTap={({ x, y }) => console.log('tap', x, y)}
      >
        <Text>Your page content</Text>
      </ZoomableScrollView>
    </View>
  );
}
```

## Props (`ZoomableScrollViewProps`)

| Prop | Default | Description |
|------|---------|-------------|
| `minScale` | `1` | Fitted scale; double-tap from zoomed state springs back to this and centers at `(0, 0)`. |
| `maxScale` | `5` | Maximum pinch / programmatic zoom. |
| `doubleTapScale` | `2.5` | Target scale on double-tap when already at `minScale`. |
| `rubberBandFactor` | `0.55` | UIScrollView-style edge rubber while **dragging**. `0` hard-clamps at edges. |
| `onZoomChange` | — | Called when displayed scale changes (~0.01); bridged from the UI thread. |
| `onSingleTap` | — | Single tap in view coordinates; double-tap does not fire this. |
| `showsHorizontalScrollIndicator` | `true` | iOS-like scrub bar when zoomed. |
| `showsVerticalScrollIndicator` | `true` | Same for vertical axis. |
| `style` | — | Outer container (`flex: 1`, `overflow: 'hidden'` by default). |
| `contentContainerStyle` | — | Applied to the transformed content wrapper. |
| `children` | required | Content to zoom and pan. |

## Imperative ref (`ZoomableScrollViewRef`)

| Member | Description |
|--------|-------------|
| `reset()` | Spring to `minScale` and translate `(0, 0)`. |
| `zoomTo(scale)` | Spring to `scale`, keeping the visual center fixed. |
| `toggleScale(scale)` | Spring to `scale`, or back to `minScale` if already near that target. |
| `scale` | `SharedValue<number>` — current display scale. |
| `translateX`, `translateY` | `SharedValue<number>` — display translation. |
| `gestureState` | `SharedValue<'idle' \| 'pan' \| 'pinch' \| 'momentum' \| 'settling' \| 'double-tap'>`. |

Use these shared values in `useAnimatedStyle` / `useAnimatedProps` by passing the **individual** values—not the whole ref object—into worklets.

```tsx
const ref = useRef<ZoomableScrollViewRef>(null);

// JS thread
ref.current?.zoomTo(2);

// UI thread (after mount, read ref once and keep SharedValue refs)
const scale = ref.current?.scale;
const pillStyle = useAnimatedStyle(() => ({
  opacity: scale ? (scale.value > 1 ? 1 : 0.4) : 0,
}));
```

## Gesture behavior (summary)

- **Pinch**: focal-point zoom; moving the focal point pans in sync with scale.
- **Pan**: simultaneous with pinch; rubber-band past content bounds while dragging.
- **Fling**: `withDecay` with hard clamp at bounds (no rubber during momentum); edge snap uses a non-overshooting spring.
- **Double-tap**: zoom to `doubleTapScale` at the tap point, or reset to `minScale` when already zoomed.
- **Single tap**: exclusive with double-tap; does not block when you only need zoom/pan.

Pan/pinch/settling logic lives in `packages/zoomable-view/src/hooks/useZoomGestures.ts`. Physics helpers and unit tests are under `packages/zoomable-view/src/utils/` and `packages/zoomable-view/test/`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run typecheck` | Typecheck example + package |
| `npm run test` | Physics unit tests (`zoomable-view`) |
| `npm run ios` / `android` / `web` | Run the example app |

## Project layout (library)

```
packages/zoomable-view/src/
  ZoomableScrollView.tsx   # GestureDetector + animated content
  hooks/
    useZoomGestures.ts     # Pinch / pan / tap / momentum
    useBounds.ts           # maxTranslate derived values
  utils/
    clamp.ts               # Rubber-band and clamp math
    focal.ts               # Focal-point translation
  types.ts
  index.ts
```

## Troubleshooting

**Expo Go crashes or `[Worklets] Cannot copy value of type WorkletEventHandler`**

Do not close over the full object returned from internal gesture hooks inside `useAnimatedStyle`. Destructure `translateX`, `translateY`, `scale`, etc., and only reference those `SharedValue`s in worklets (see `ZoomableScrollView.tsx`).

**Gestures do nothing**

- Confirm `import 'react-native-gesture-handler'` is the first import in the entry file.
- Confirm the screen is inside `GestureHandlerRootView`.
- On web, pinch/pan are limited; use iOS Simulator or a device for gesture QA.

**Yellow Worklets warnings in Metro**

Usually harmless mapper warnings when RNGH and Reanimated are composed; if the app runs, you can ignore them unless you see a hard crash (fix closure capture as above).

## License

Private workspace (`package.json` marks packages as `private`). Adjust before publishing.
