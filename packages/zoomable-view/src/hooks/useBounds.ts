import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { getMaxTranslate } from '../utils/clamp';

export function useBounds(
  layoutWidth: SharedValue<number>,
  layoutHeight: SharedValue<number>,
  scale: SharedValue<number>,
) {
  const maxTranslateX = useDerivedValue(() =>
    getMaxTranslate(layoutWidth.value, scale.value),
  );
  const maxTranslateY = useDerivedValue(() =>
    getMaxTranslate(layoutHeight.value, scale.value),
  );

  return { maxTranslateX, maxTranslateY };
}
