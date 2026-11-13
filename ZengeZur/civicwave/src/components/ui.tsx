import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  Switch,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  IconSet,
  ReportStatus,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  Severity,
} from '@/constants/categories';
import { Gradients, Palette, Radius, Shadow, Space, Type } from '@/constants/design';

const AView = Animated.createAnimatedComponent(View);

export function Icon({
  name,
  set = 'mci',
  size = 22,
  color = Palette.text,
}: {
  name: string;
  set?: IconSet;
  size?: number;
  color?: string;
}) {
  if (set === 'ion') {
    return <Ionicons name={name as any} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
}

/** Bouncy, haptic press wrapper for buttons and cards. */
export function Tap({
  onPress,
  style,
  children,
  scaleTo = 0.96,
  haptic = true,
  disabled,
  ...rest
}: PressableProps & { scaleTo?: number; haptic?: boolean; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AView style={[aStyle, style]}>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        onPressIn={() => {
          s.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          s.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        onPress={(e) => {
          if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress?.(e);
        }}
        {...rest}>
        {children as any}
      </Pressable>
    </AView>
  );
}

/** White card with rounded corners; the shadow sits outside, the clip inside. */
export function GroupCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ borderRadius: Radius.xl, borderCurve: 'continuous', ...Shadow.card }, style]}>
      <View
        style={{
          borderRadius: Radius.xl,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: Palette.surface,
        }}>
        {children}
      </View>
    </View>
  );
}

export function SectionTitle({ children, first }: { children: string; first?: boolean }) {
  return (
    <Text
      style={{
        ...Type.section,
        color: Palette.text,
        marginTop: first ? Space.lg : Space.xxl + 4,
        marginBottom: Space.md,
        marginLeft: Space.xs,
      }}>
      {children}
    </Text>
  );
}

/** Outline glyph inside a thin blue ring. */
export function RingIcon({
  name,
  set = 'ion',
  size = 46,
  color = Palette.primary,
  ring = Palette.ring,
}: {
  name: string;
  set?: IconSet;
  size?: number;
  color?: string;
  ring?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: ring,
        backgroundColor: Palette.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={name} set={set} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: 1, backgroundColor: Palette.border, marginLeft: inset }} />;
}

/** A grouped-list row: ring icon, label, optional value and a chevron. */
export function ListRow({
  icon,
  iconSet = 'ion',
  label,
  value,
  valueColor,
  accessory = 'chevron',
  onPress,
  last,
}: {
  icon?: string;
  iconSet?: IconSet;
  label: string;
  value?: string | number;
  valueColor?: string;
  accessory?: 'chevron' | 'none';
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: Space.lg,
        paddingVertical: 14,
        minHeight: 76,
      }}>
      {icon ? <RingIcon name={icon} set={iconSet} /> : null}
      <Text style={{ ...Type.row, color: Palette.text, flex: 1 }} numberOfLines={2}>
        {label}
      </Text>
      {value != null ? (
        <Text style={{ ...Type.row, fontWeight: '700', color: valueColor ?? Palette.text, fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      ) : null}
      {accessory === 'chevron' ? <Icon name="chevron-forward" set="ion" size={20} color={Palette.textFaint} /> : null}
    </View>
  );
  return (
    <View>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onPress();
          }}
          style={({ pressed }) => ({ backgroundColor: pressed ? Palette.surfaceAlt : 'transparent' })}>
          {content}
        </Pressable>
      ) : (
        content
      )}
      {!last && <Divider inset={Space.lg} />}
    </View>
  );
}

export function ToggleRow({
  icon,
  iconSet = 'ion',
  label,
  value,
  onChange,
  last,
}: {
  icon?: string;
  iconSet?: IconSet;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: Space.lg,
          minHeight: icon ? 76 : 72,
        }}>
        {icon ? <RingIcon name={icon} set={iconSet} /> : null}
        <Text style={{ ...Type.row, color: Palette.text, flex: 1 }}>{label}</Text>
        <Switch
          value={value}
          onValueChange={(v) => {
            Haptics.selectionAsync().catch(() => {});
            onChange(v);
          }}
          trackColor={{ true: Palette.low, false: Palette.borderStrong }}
          ios_backgroundColor={Palette.borderStrong}
          thumbColor="#FFFFFF"
        />
      </View>
      {!last && <Divider inset={Space.lg} />}
    </View>
  );
}

/** The one status badge: same width and height on every screen. */
export function StatusBadge({ status }: { status: ReportStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <View
      style={{
        width: 98,
        height: 26,
        borderRadius: 13,
        backgroundColor: tone.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: tone.fg }} numberOfLines={1}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

/** Severity as a coloured dot and a word, no pill. */
export function SeverityTag({ severity }: { severity: Severity }) {
  const color = SEVERITY_COLOR[severity];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ ...Type.small, color }}>{SEVERITY_LABEL[severity]}</Text>
    </View>
  );
}

export function CircleButton({
  icon,
  set = 'ion',
  onPress,
  size = 46,
  label,
  bg = Palette.surfaceAlt,
  color = Palette.text,
}: {
  icon: string;
  set?: IconSet;
  onPress?: () => void;
  size?: number;
  label?: string;
  bg?: string;
  color?: string;
}) {
  return (
    <Tap onPress={onPress} scaleTo={0.9} accessibilityLabel={label}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: Palette.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} set={set} size={Math.round(size * 0.5)} color={color} />
      </View>
    </Tap>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  tone = 'primary',
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'primary' | 'ai' | 'quiet';
  style?: StyleProp<ViewStyle>;
}) {
  const quiet = tone === 'quiet';
  const inner = (
    <>
      {loading ? (
        <Spinner color={quiet ? Palette.primary : '#fff'} track={quiet ? Palette.ring : 'rgba(255,255,255,0.35)'} />
      ) : (
        icon && <Icon name={icon} set="ion" size={20} color={quiet ? Palette.primary : '#fff'} />
      )}
      <Text style={{ ...Type.h3, fontSize: 17, color: quiet ? Palette.primary : '#fff' }}>{label}</Text>
    </>
  );
  const box: ViewStyle = {
    height: 56,
    borderRadius: 18,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: Space.xl,
  };
  return (
    <Tap
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      {tone === 'ai' ? (
        <LinearGradient colors={Gradients.ai} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={box}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            box,
            quiet
              ? { backgroundColor: Palette.primarySoft }
              : { backgroundColor: Palette.primary, ...Shadow.fab },
          ]}>
          {inner}
        </View>
      )}
    </Tap>
  );
}

/** Reusable continuous rotation animated style (infinite linear spin). */
export function useSpin(duration = 1000) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1);
  }, [rot, duration]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
}

export function Spinner({
  size = 22,
  color = '#fff',
  track = 'rgba(255,255,255,0.35)',
}: {
  size?: number;
  color?: string;
  track?: string;
}) {
  const spin = useSpin(850);
  return (
    <AView
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(2, size / 9),
          borderColor: track,
          borderTopColor: color,
        },
        spin,
      ]}
    />
  );
}
