import { Image } from 'expo-image';
import { Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import { Icon } from '@/components/ui';
import { IconSet } from '@/constants/categories';
import { Palette, Space, Type } from '@/constants/design';

const MARK = require('@/assets/images/mark-watermark.png');

type Backdrop =
  | { kind: 'mark' }
  | { kind: 'figure'; text: string }
  | { kind: 'glyph'; name: string; set?: IconSet };

/**
 * Page header: a white band with a large title, and behind it one oversized element
 * cut off by the band's edge (the HarAI mark, a figure such as the rank, or a glyph).
 */
export function ScreenHeader({
  eyebrow,
  title,
  backdrop,
  left,
  right,
  topInset = true,
}: {
  eyebrow?: string;
  title: string;
  backdrop?: Backdrop;
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** false inside a sheet, which already starts below the status bar */
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View
      style={{
        backgroundColor: Palette.surface,
        paddingTop: (topInset ? insets.top : 0) + 14,
        paddingHorizontal: Space.xl,
        paddingBottom: 20,
        overflow: 'hidden',
        borderBottomWidth: 1,
        borderBottomColor: Palette.border,
      }}>
      {backdrop ? <Backdrop backdrop={backdrop} width={width} /> : null}
      {left ? <View style={{ flexDirection: 'row', marginBottom: 18 }}>{left}</View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={{ ...Type.eyebrow, color: Palette.textMuted }}>{eyebrow}</Text> : null}
          <Text style={{ ...Type.hero, color: Palette.text }} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {right}
      </View>
    </View>
  );
}

/**
 * A white strip under the status bar, laid over a scrolling page, so content that scrolls
 * up never runs into the clock and the battery.
 */
export function StatusShade() {
  const insets = useSafeAreaInsets();
  if (!insets.top) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: Palette.surface }}
    />
  );
}

function Backdrop({ backdrop, width }: { backdrop: Backdrop; width: number }) {
  if (backdrop.kind === 'mark') {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', right: -34, bottom: -58, width: 230, height: 260 }}>
        <Image source={MARK} contentFit="contain" cachePolicy="memory" style={{ width: 230, height: 260 }} />
      </View>
    );
  }
  if (backdrop.kind === 'glyph') {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', right: -26, bottom: -46 }}>
        <Icon name={backdrop.name} set={backdrop.set} size={210} color={Palette.band} />
      </View>
    );
  }
  const H = 200;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: -8, bottom: -30, width, height: H }}>
      <Svg width={width} height={H}>
        <Defs>
          <LinearGradient id="giant" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#CCDDFF" />
            <Stop offset="1" stopColor="#E4D9FF" />
          </LinearGradient>
        </Defs>
        <SvgText
          x={width}
          y={H - 12}
          textAnchor="end"
          fontSize={176}
          fontWeight="900"
          letterSpacing={-8}
          fill="url(#giant)">
          {backdrop.text}
        </SvgText>
      </Svg>
    </View>
  );
}
