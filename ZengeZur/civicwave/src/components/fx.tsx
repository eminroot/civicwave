import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useEffect, useId, useRef, useState } from 'react';
import { Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/** 12345 -> "12 345" with a no-break space, the Azerbaijani way. */
export function formatNumber(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Count-up number. Its own small component so only this text re-renders while it runs.
 * Change `replay` to run it again. A timer makes sure it always lands on the final
 * value, even where animation frames are paused.
 */
export function CountUp({
  value,
  duration = 900,
  delay = 0,
  replay = 0,
  style,
}: {
  value: number;
  duration?: number;
  delay?: number;
  replay?: number;
  style?: TextStyle | TextStyle[];
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const startAt = Date.now() + delay;
    let shown = -1;
    const tick = () => {
      const now = Date.now();
      const t = now < startAt ? 0 : Math.min(1, (now - startAt) / duration);
      const v = Math.round(value * (1 - Math.pow(1 - t, 3)));
      if (v !== shown) {
        shown = v;
        setDisplay(v);
      }
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    const settle = setTimeout(() => setDisplay(value), delay + duration + 120);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      clearTimeout(settle);
    };
  }, [value, duration, delay, replay]);

  return <Text style={style}>{formatNumber(display)}</Text>;
}

/** A pedestal bar that rises from zero; runs again when `replay` changes. */
export function PedestalBar({
  target,
  gradient,
  delay = 0,
  replay = 0,
}: {
  target: number;
  gradient: readonly [string, string, ...string[]];
  delay?: number;
  replay?: number;
}) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = 0;
    h.value = withDelay(delay, withTiming(target, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [target, delay, h, replay]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View
      style={[
        {
          width: '86%',
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderCurve: 'continuous',
          marginTop: 10,
          overflow: 'hidden',
        },
        style,
      ]}>
      <LinearGradient colors={gradient} style={{ flex: 1 }} />
    </Animated.View>
  );
}

/**
 * Gentle bob and tilt for the winner's crown. Only moves while its screen is on show,
 * so hidden tabs cost nothing.
 */
export function Bob({ children, amount = 4 }: { children: React.ReactNode; amount?: number }) {
  const focused = useIsFocused();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!focused) {
      cancelAnimation(y);
      return;
    }
    y.value = withRepeat(
      withSequence(
        withTiming(-amount, { duration: 720, easing: Easing.inOut(Easing.ease) }),
        withTiming(amount * 0.5, { duration: 720, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(y);
  }, [amount, y, focused]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${y.value * 0.6}deg` }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Slow rise and fall for a 3D object, with a contact shadow that fades and tightens as
 * the object lifts. Pauses while its screen is hidden.
 */
export function Float({
  children,
  amount = 5,
  duration = 1700,
  shadow = 0,
  tilt = 0,
}: {
  children: React.ReactNode;
  amount?: number;
  duration?: number;
  /** contact shadow width in px; 0 for none */
  shadow?: number;
  /** degrees of sway at the top of the rise */
  tilt?: number;
}) {
  const focused = useIsFocused();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!focused) {
      cancelAnimation(t);
      return;
    }
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [duration, t, focused]);

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: -amount * t.value }, { rotate: `${tilt * (t.value - 0.5)}deg` }],
  }));
  const shade = useAnimatedStyle(() => ({
    opacity: 1 - 0.4 * t.value,
    transform: [{ scaleX: 1 - 0.16 * t.value }],
  }));

  const sh = Math.max(8, Math.round(shadow * 0.18));
  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={body}>{children}</Animated.View>
      {shadow > 0 ? (
        <Animated.View style={[{ width: shadow, height: sh, marginTop: -sh / 2 }, shade]} pointerEvents="none">
          <ContactShadow width={shadow} height={sh} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A soft oval shadow, for objects standing or hovering on the page. */
export function ContactShadow({ width, height, strength = 0.28 }: { width: number; height: number; strength?: number }) {
  const id = `contact${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#0F2141" stopOpacity={strength} />
          <Stop offset="0.55" stopColor="#0F2141" stopOpacity={strength * 0.45} />
          <Stop offset="1" stopColor="#0F2141" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Hangs its child from the top centre and lets it fall in and swing like a pendulum
 * until it settles. Change `replay` to drop it again.
 */
export function Swing({
  children,
  from = 24,
  delay = 0,
  replay = 0,
  style,
}: {
  children: React.ReactNode;
  from?: number;
  delay?: number;
  replay?: number;
  style?: ViewStyle;
}) {
  const r = useSharedValue(from);
  const y = useSharedValue(-16);
  const o = useSharedValue(0);
  useEffect(() => {
    r.value = from;
    y.value = -16;
    o.value = 0;
    o.value = withDelay(delay, withTiming(1, { duration: 160 }));
    y.value = withDelay(delay, withSpring(0, { damping: 13, stiffness: 190 }));
    r.value = withDelay(delay, withSpring(0, { damping: 2.6, stiffness: 52, mass: 0.85 }));
  }, [from, delay, replay, r, y, o]);
  const anim = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }, { rotate: `${r.value}deg` }],
  }));
  return <Animated.View style={[{ transformOrigin: 'top' }, style, anim]}>{children}</Animated.View>;
}

/**
 * A narrow band of light that crosses a round face now and then, for the gold medal.
 * Clipped to a circle of `size`. Runs only while the screen is on show.
 */
export function Glint({ size, delay = 0, every = 3800 }: { size: number; delay?: number; every?: number }) {
  const focused = useIsFocused();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (!focused) {
      cancelAnimation(x);
      return;
    }
    x.value = -1;
    x.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 950, easing: Easing.inOut(Easing.cubic) }),
          withDelay(every, withTiming(-1, { duration: 0 }))
        ),
        -1
      )
    );
    return () => cancelAnimation(x);
  }, [focused, delay, every, x]);
  const band = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * size * 0.9 }, { rotate: '22deg' }],
  }));
  return (
    <View
      pointerEvents="none"
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { position: 'absolute', top: -size * 0.3, left: size * 0.32, width: size * 0.36, height: size * 1.6 },
          band,
        ]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

/** A thin bar that grows to `value` (0..1); runs again when `replay` changes. */
export function Meter({
  value,
  color,
  track,
  delay = 0,
  replay = 0,
  height = 4,
}: {
  value: number;
  color: string;
  track: string;
  delay?: number;
  replay?: number;
  height?: number;
}) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = 0;
    w.value = withDelay(delay, withTiming(value, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [value, delay, replay, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}
