import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Wordmark } from '@/components/wordmark';
import { Palette, Type } from '@/constants/design';

SplashScreen.preventAutoHideAsync().catch(() => {});

// The logo's mark on its own; the name is drawn by <Wordmark />.
const MARK = require('@/assets/images/logo-mark.png');
const MARK_W = 112;
const MARK_H = MARK_W;

const WORD_AT = 900;
const TAG_AT = 1450;
const LEAVE_AT = 2650;

/**
 * The mark fades and scales in, settling with a small pop. AIDIN then rises letter
 * by letter, the district line follows, and the overlay lifts away.
 */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.72);
  const tagOpacity = useSharedValue(0);
  const tagY = useSharedValue(10);
  const rule = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const overlayScale = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    logoOpacity.value = withTiming(1, { duration: 380 });
    logoScale.value = withSequence(
      withTiming(1.04, { duration: 620, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 9, stiffness: 200 })
    );

    tagOpacity.value = withDelay(TAG_AT, withTiming(1, { duration: 420 }));
    tagY.value = withDelay(TAG_AT, withSpring(0, { damping: 16, stiffness: 140 }));
    rule.value = withDelay(TAG_AT + 120, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));

    const t = setTimeout(() => {
      overlayScale.value = withTiming(1.08, { duration: 560, easing: Easing.in(Easing.cubic) });
      overlayOpacity.value = withTiming(0, { duration: 560, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setShow)(false);
      });
    }, LEAVE_AT);

    return () => clearTimeout(t);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagY.value }],
  }));
  const ruleStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: rule.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      {children}
      {show && (
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle, styles.overlay]}>
          <View style={styles.center}>
            <Animated.View style={logoStyle}>
              <Image source={MARK} style={{ width: MARK_W, height: MARK_H }} resizeMode="contain" />
            </Animated.View>

            <View style={{ marginTop: 30 }}>
              <Wordmark height={38} delay={WORD_AT} />
            </View>

            <Animated.View style={[tagStyle, styles.tagWrap]}>
              <Text style={styles.tagline}>XƏTAİ RAYONU</Text>
              <Animated.View style={[styles.tagRule, ruleStyle]} />
              <Text style={styles.subtitle}>Rayonunuzun rəqəmsal səsi</Text>
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: '#FFFFFF', zIndex: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tagWrap: { alignItems: 'center', marginTop: 22 },
  tagline: {
    ...Type.small,
    color: Palette.primaryDark,
    letterSpacing: 4,
    fontWeight: '800',
  },
  tagRule: {
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.primary,
    marginVertical: 10,
    opacity: 0.5,
  },
  subtitle: {
    ...Type.small,
    color: Palette.textMuted,
    letterSpacing: 0.3,
  },
});
