import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

/*
 * The AIDIN wordmark, drawn letter by letter on a 100-unit cap height so it looks the
 * same on every phone. "AI" is the logo's flat blue, "DIN" the ink.
 */
const AI_BLUE = '#1C64F2';
const INK = '#0E1525';

type Glyph = { id: string; w: number; gap: number; d: string; ai?: boolean };

const GLYPHS: Glyph[] = [
  { id: 'A', w: 76, gap: 8, ai: true, d: 'M0 100L28.5 0H47.5L76 100H56L50 79H26L20 100ZM30.5 63H45.5L38 36.8Z' },
  { id: 'I', w: 20, gap: 12, ai: true, d: 'M0 0H20V100H0Z' },
  {
    id: 'D',
    w: 88,
    gap: 12,
    d: 'M0 0H38C68 0 88 21 88 50C88 79 68 100 38 100H0ZM20 18V82H38C56 82 68 69 68 50C68 31 56 18 38 18Z',
  },
  { id: 'I2', w: 20, gap: 12, d: 'M0 0H20V100H0Z' },
  { id: 'N', w: 74, gap: 0, d: 'M0 0H20L54 58V0H74V100H54L20 42V100H0Z' },
];

export const WORDMARK_UNITS = GLYPHS.reduce((s, g) => s + g.w + g.gap, 0);

/**
 * Each letter rises out of its own slot, one after another. `delay` is in ms.
 */
export function Wordmark({ height = 40, delay = 0 }: { height?: number; delay?: number }) {
  const s = height / 100;
  return (
    <View style={{ flexDirection: 'row' }} accessibilityRole="header" accessibilityLabel="AIDIN">
      {GLYPHS.map((g, i) => (
        <View key={g.id} style={{ marginRight: g.gap * s }}>
          <Letter glyph={g} scale={s} delay={delay + i * 70} />
        </View>
      ))}
    </View>
  );
}

function Letter({ glyph, scale, delay }: { glyph: Glyph; scale: number; delay: number }) {
  const w = glyph.w * scale;
  const h = 100 * scale;
  const y = useSharedValue(h * 1.1);
  useEffect(() => {
    y.value = withDelay(delay, withTiming(0, { duration: 620, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [delay, h, y]);
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }}>
      <Animated.View style={rise}>
        <Svg width={w} height={h} viewBox={`0 0 ${glyph.w} 100`}>
          <Path d={glyph.d} fillRule="evenodd" fill={glyph.ai ? AI_BLUE : INK} />
        </Svg>
      </Animated.View>
    </View>
  );
}
