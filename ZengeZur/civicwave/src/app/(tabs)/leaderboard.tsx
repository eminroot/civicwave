import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

import { CountUp, Float, formatNumber, Glint, Meter, Swing } from '@/components/fx';
import { ScreenHeader, StatusShade } from '@/components/screen-header';
import { useTabBarHeight } from '@/components/tab-bar';
import { GroupCard } from '@/components/ui';
import { ART, MEDAL_ASPECT, MEDAL_DISC_Y, MEDALS } from '@/constants/art';
import { Palette, Radius, Shadow, Space, Type } from '@/constants/design';
import { Period, Standing, standings, WEEK_BASE_POINTS } from '@/constants/user';
import { monthName, weekRange } from '@/lib/format';
import { useProfile } from '@/lib/profile';
import { useReports } from '@/lib/store';

// By rank 1, 2, 3.
const PLINTH_H = [116, 82, 60];
const AVATAR = [84, 64, 64];
const MEDAL_W = [50, 40, 40];
const ENTER = [380, 120, 250];
const SWING_FROM = [20, -22, 18];

const TROPHY_H = 116;
const TROPHY_W = Math.round((TROPHY_H * ART.trophy.w) / ART.trophy.h);

export default function Leaderboard() {
  const barHeight = useTabBarHeight();
  const { totalPoints, weekPoints } = useReports();
  const [period, setPeriod] = useState<Period>('week');

  // The screen stays mounted between visits. Coming back replays the podium (medals,
  // plinths, numbers and bars) on the UI thread; nothing is rebuilt or decoded again.
  const [replay, setReplay] = useState(0);
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setReplay((k) => k + 1);
    }, [])
  );

  const { profile, avatar } = useProfile();
  const myPoints = period === 'week' ? WEEK_BASE_POINTS + weekPoints : totalPoints;
  const entries = useMemo(
    () => standings(myPoints, period, { name: profile.fullName, avatar }),
    [myPoints, period, profile.fullName, avatar]
  );
  const leader = entries[0]?.points || 1;
  const podium = [entries[1], entries[0], entries[2]].filter(Boolean); // 2 · 1 · 3
  const rest = entries.slice(3);
  const cycle = replay * 2 + (period === 'month' ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: barHeight + 40 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={period === 'week' ? weekRange() : monthName()}
          title="Reytinq"
          right={
            <Animated.View
              entering={ZoomIn.delay(60).springify().damping(11).mass(0.8)}
              style={{ marginTop: -6, marginBottom: -14, marginRight: 6 }}>
              <Float amount={5} shadow={TROPHY_W * 0.95} tilt={3} duration={1900}>
                <Image
                  source={ART.trophy.src}
                  style={{ width: TROPHY_W, height: TROPHY_H }}
                  contentFit="contain"
                  cachePolicy="memory"
                  priority="high"
                />
              </Float>
            </Animated.View>
          }
        />

        <View style={{ paddingHorizontal: Space.lg }}>
          <PeriodToggle period={period} onChange={setPeriod} />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 8,
              marginTop: Space.xxl,
            }}>
            {podium.map((e) => (
              <PodiumColumn key={e.name} e={e} cycle={cycle} />
            ))}
          </View>

          <Animated.View entering={FadeInDown.delay(220).duration(420)}>
            <GroupCard>
              {rest.map((e, i) => (
                <LeaderRow
                  key={e.name}
                  e={e}
                  above={entries[e.rank - 2]}
                  share={e.points / leader}
                  delay={620 + i * 70}
                  cycle={cycle}
                  last={i === rest.length - 1}
                />
              ))}
            </GroupCard>
          </Animated.View>
        </View>
      </ScrollView>
      <StatusShade />
    </View>
  );
}

/* ---------------- podium ---------------- */

function PodiumColumn({ e, cycle }: { e: Standing; cycle: number }) {
  const i = e.rank - 1;
  const first = i === 0;
  const medal = MEDALS[i];
  const av = AVATAR[i];
  const mw = MEDAL_W[i];
  const mh = mw * MEDAL_ASPECT;
  const tuck = mh * 0.36; // ribbon length that sits behind the avatar
  const disc = mw * 0.9;
  const enter = ENTER[i];

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View
        entering={ZoomIn.delay(enter).springify().damping(12).mass(0.7)}
        style={{ width: av, height: av + mh - tuck, alignItems: 'center' }}>
        {/* drawn first so the avatar covers the top of the ribbon */}
        <Swing
          replay={cycle}
          delay={enter + 240}
          from={SWING_FROM[i]}
          style={{ position: 'absolute', top: av - tuck, width: mw, height: mh }}>
          <Image source={medal.src} style={{ width: mw, height: mh }} contentFit="contain" cachePolicy="memory" />
          <View
            style={{
              position: 'absolute',
              left: (mw - disc) / 2,
              top: mh * MEDAL_DISC_Y - disc / 2,
              width: disc,
              height: disc,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {first ? (
              <View style={{ position: 'absolute' }}>
                <Glint size={disc} delay={1500} />
              </View>
            ) : null}
            <Text
              style={{
                fontSize: Math.round(mw * 0.4),
                lineHeight: Math.round(mw * 0.48),
                fontWeight: '800',
                color: medal.ink,
                textShadowColor: 'rgba(255,255,255,0.6)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 0,
              }}>
              {e.rank}
            </Text>
          </View>
        </Swing>

        <View
          style={{
            width: av,
            height: av,
            borderRadius: av / 2,
            padding: 3,
            backgroundColor: Palette.surface,
            borderWidth: 2.5,
            borderColor: e.me ? Palette.primary : medal.ring,
            ...Shadow.soft,
          }}>
          <Image
            source={e.avatar}
            style={{ flex: 1, borderRadius: av / 2 }}
            contentFit="cover"
            cachePolicy="memory"
            priority="high"
          />
        </View>
      </Animated.View>

      <Text
        style={{
          ...Type.small,
          fontSize: first ? 15 : 14,
          color: e.me ? Palette.primary : Palette.text,
          fontWeight: '700',
          marginTop: 8,
        }}
        numberOfLines={1}>
        {e.me ? 'Siz' : (e.short ?? e.name.split(' ')[0])}
      </Text>

      <Plinth height={PLINTH_H[i]} delay={enter - 60} replay={cycle} first={first}>
        <CountUp
          value={e.points}
          delay={enter + 200}
          replay={cycle}
          style={{
            ...Type.h3,
            fontSize: first ? 17 : 15,
            color: first ? '#FFFFFF' : Palette.text,
            fontVariant: ['tabular-nums'],
          }}
        />
        <Text style={{ ...Type.small, fontSize: 12, color: first ? 'rgba(255,255,255,0.75)' : Palette.textMuted }}>
          xal
        </Text>
      </Plinth>
    </View>
  );
}

const TOP_FACE = 9;

/**
 * A block of the podium seen slightly from above: a lit top face and a front face
 * that rises from the floor. Its label sits at the top of the front face.
 */
function Plinth({
  height,
  delay,
  replay,
  first,
  children,
}: {
  height: number;
  delay: number;
  replay: number;
  first: boolean;
  children: React.ReactNode;
}) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = 0;
    h.value = withDelay(delay, withTiming(height, { duration: 720, easing: Easing.out(Easing.cubic) }));
  }, [height, delay, replay, h]);
  const rise = useAnimatedStyle(() => ({ height: h.value }));

  const top = first ? '#6E9CFF' : '#FFFFFF';
  const face = first ? (['#2C6CF2', '#1546B0'] as const) : (['#E4E9F1', '#CDD5E1'] as const);

  return (
    <View style={{ width: '94%', marginTop: 10 }}>
      <Svg width="100%" height={TOP_FACE} viewBox={`0 0 100 ${TOP_FACE}`} preserveAspectRatio="none">
        <Polygon points={`6,0 94,0 100,${TOP_FACE} 0,${TOP_FACE}`} fill={top} />
      </Svg>
      <Animated.View style={[{ overflow: 'hidden' }, rise]}>
        <LinearGradient colors={face} style={{ flex: 1, alignItems: 'center', paddingTop: 10 }}>
          {children}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

/* ---------------- the rest of the table ---------------- */

function LeaderRow({
  e,
  above,
  share,
  delay,
  cycle,
  last,
}: {
  e: Standing;
  above?: Standing;
  share: number;
  delay: number;
  cycle: number;
  last: boolean;
}) {
  const gap = above ? above.points - e.points : 0;
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: Space.lg,
          paddingVertical: 12,
          minHeight: 74,
          backgroundColor: e.me ? Palette.primarySoft : 'transparent',
        }}>
        <Text
          style={{
            ...Type.h3,
            color: e.me ? Palette.primary : Palette.textMuted,
            width: 24,
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
          }}>
          {e.rank}
        </Text>
        <Image
          source={e.avatar}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: Palette.bgDeep,
            borderWidth: e.me ? 2 : 0,
            borderColor: Palette.primary,
          }}
          contentFit="cover"
          cachePolicy="memory"
        />
        <View style={{ flex: 1, gap: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={{ ...Type.row, color: Palette.text, flex: 1 }} numberOfLines={1}>
              {e.name}
            </Text>
            <Text
              style={{
                ...Type.row,
                fontWeight: '700',
                color: e.me ? Palette.primary : Palette.text,
                fontVariant: ['tabular-nums'],
              }}>
              {formatNumber(e.points)}
            </Text>
          </View>
          <Meter
            value={share}
            color={e.me ? Palette.primary : '#B9CBEF'}
            track={e.me ? '#D6E3FD' : Palette.surfaceAlt}
            delay={delay}
            replay={cycle}
          />
          {e.me && above ? (
            <Text style={{ ...Type.small, color: Palette.primary, marginTop: -1 }}>
              #{above.rank} üçün {formatNumber(gap)} xal
            </Text>
          ) : null}
        </View>
      </View>
      {!last && <View style={{ height: 1, backgroundColor: Palette.border, marginLeft: 96 }} />}
    </View>
  );
}

function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const [w, setW] = useState(0);
  const tx = useSharedValue(0);
  const inner = w > 0 ? (w - 8) / 2 : 0;

  useEffect(() => {
    tx.value = withTiming(period === 'week' ? 0 : inner, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [period, inner, tx]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const onLayout = (ev: LayoutChangeEvent) => setW(ev.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        backgroundColor: Palette.bgDeep,
        borderRadius: Radius.pill,
        padding: 4,
        marginTop: Space.xl,
      }}>
      {inner > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 4,
              bottom: 4,
              width: inner,
              borderRadius: Radius.pill,
              backgroundColor: Palette.surface,
              ...Shadow.soft,
            },
            indicator,
          ]}
        />
      )}
      {(['week', 'month'] as const).map((p) => (
        <Pressable key={p} onPress={() => onChange(p)} style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...Type.bodyStrong, color: period === p ? Palette.text : Palette.textMuted }}>
            {p === 'week' ? 'Həftəlik' : 'Aylıq'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
