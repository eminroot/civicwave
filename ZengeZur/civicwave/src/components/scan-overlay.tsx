import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Palette } from '@/constants/design';

/** Animated "AI scanning" line that sweeps over the captured photo. */
export function ScanOverlay({ height }: { height: number }) {
  const y = useSharedValue(0);
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(height - 4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    pulse.value = withRepeat(withTiming(0.9, { duration: 900 }), -1, true);
  }, [height, y, pulse]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Animated.View
        style={[
          { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
          glowStyle,
        ]}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderWidth: 2,
            borderColor: Palette.ai2,
            borderRadius: 18,
          }}
        />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: 60 }, lineStyle]}>
        <LinearGradient
          colors={['rgba(33,181,230,0)', 'rgba(33,181,230,0.55)']}
          style={{ flex: 1 }}
        />
        <View style={{ height: 2.5, backgroundColor: Palette.ai2 }} />
      </Animated.View>
    </View>
  );
}
