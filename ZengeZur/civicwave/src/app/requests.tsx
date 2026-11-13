import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountUp, Float, formatNumber } from '@/components/fx';
import { ReportThumb } from '@/components/report-thumb';
import { ScreenHeader, StatusShade } from '@/components/screen-header';
import {
  CircleButton,
  GroupCard,
  Icon,
  PrimaryButton,
  Spinner,
  StatusBadge,
  Tap,
} from '@/components/ui';
import {
  ReportStatus,
  SEVERITY_POINTS,
  STATUS_LABEL,
  STATUS_ORDER,
} from '@/constants/categories';
import { ART } from '@/constants/art';
import { Palette, Radius, Space, Type } from '@/constants/design';
import { tierInfo } from '@/constants/user';
import { timeAgo } from '@/lib/format';
import { useProfile } from '@/lib/profile';
import { Report, SendState, useReports } from '@/lib/store';

export default function Requests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reports, totalPoints, earnedPoints, sendState, resend } = useReports();
  const resolved = reports.filter((r) => r.status === 'resolved').length;

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          left={<CircleButton icon="chevron-back" label="Geri" onPress={() => router.back()} />}
          title="Müraciətlərim"
          backdrop={{ kind: 'figure', text: String(reports.length) }}
        />

        <View style={{ padding: Space.lg, gap: Space.lg }}>
          <Animated.View entering={FadeInDown.duration(380)}>
            <Standing points={totalPoints} earned={earnedPoints} sent={reports.length} resolved={resolved} />
          </Animated.View>

          {reports.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(80).duration(380)}>
              <GroupCard>
                <View style={{ alignItems: 'center', padding: Space.xxl, paddingTop: Space.xl, gap: Space.lg }}>
                  <Float amount={6} duration={2200} shadow={130} tilt={2}>
                    <Image
                      source={ART.clipboard.src}
                      style={{ width: 190, height: (190 * ART.clipboard.h) / ART.clipboard.w }}
                      contentFit="contain"
                      cachePolicy="memory"
                    />
                  </Float>
                  <Text style={{ ...Type.h2, color: Palette.text }}>Hələ müraciət yoxdur</Text>
                  <PrimaryButton
                    label="Yeni müraciət"
                    icon="add"
                    onPress={() => router.push('/request')}
                    style={{ alignSelf: 'stretch' }}
                  />
                </View>
              </GroupCard>
            </Animated.View>
          ) : (
            reports.map((r, i) => (
              <Animated.View key={r.id} entering={FadeInDown.delay(Math.min(i, 6) * 50 + 60).duration(380)}>
                <ReportCard report={r} state={sendState(r)} onResend={() => resend(r.id)} />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
      <StatusShade />
    </View>
  );
}

function Standing({ points, earned, sent, resolved }: { points: number; earned: number; sent: number; resolved: number }) {
  const { current, next, progress, remaining } = tierInfo(points);
  const { profile, avatar } = useProfile();
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(250, withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <GroupCard>
      <View style={{ padding: Space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Image source={avatar} style={{ width: 56, height: 56, borderRadius: 28 }} contentFit="cover" cachePolicy="memory" />
          <View style={{ flex: 1 }}>
            <Text style={{ ...Type.h2, color: Palette.text }}>{profile.fullName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Icon name="medal-outline" set="ion" size={16} color={current.color} />
              <Text style={{ ...Type.small, color: Palette.textMuted }}>{current.name} səviyyə</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Space.xl }}>
          <Animated.View entering={ZoomIn.delay(200).springify().damping(9).mass(0.7)}>
            <Image
              source={ART.coin.src}
              style={{ width: 36, height: (36 * ART.coin.h) / ART.coin.w }}
              contentFit="contain"
              cachePolicy="memory"
            />
          </Animated.View>
          <CountUp
            value={points}
            duration={1000}
            delay={150}
            style={{ fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1, color: Palette.text }}
          />
          <Text style={{ ...Type.body, color: Palette.textMuted, alignSelf: 'flex-end', marginBottom: 6 }}>xal</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: Palette.bgDeep, overflow: 'hidden', marginTop: 10 }}>
          <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: current.color }, fillStyle]} />
        </View>
        <Text style={{ ...Type.small, color: Palette.textMuted, marginTop: 8 }}>
          {next ? `${next.name}: ${formatNumber(remaining)} xal qalıb` : 'Ən yüksək səviyyə'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: Palette.border, backgroundColor: Palette.surfaceAlt }}>
        <Stat value={String(sent)} label="Göndərilib" />
        <View style={{ width: 1, backgroundColor: Palette.border }} />
        <Stat value={String(resolved)} label="Həll olundu" />
        <View style={{ width: 1, backgroundColor: Palette.border }} />
        <Stat value={`+${formatNumber(earned)}`} label="Qazanılıb" />
      </View>
    </GroupCard>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, paddingVertical: 14, alignItems: 'center' }}>
      <Text style={{ ...Type.h2, color: Palette.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ ...Type.small, color: Palette.textMuted }}>{label}</Text>
    </View>
  );
}

function ReportCard({ report, state, onResend }: { report: Report; state: SendState; onResend: () => void }) {
  const rejected = report.status === 'rejected';
  const points = SEVERITY_POINTS[report.severity];

  return (
    <GroupCard>
      <View style={{ padding: Space.lg, gap: Space.lg }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <ReportThumb photoUri={report.photoUri} categoryId={report.categoryId} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...Type.h3, fontSize: 17, color: Palette.text }} numberOfLines={2}>
              {report.title}
            </Text>
            <Text style={{ ...Type.small, color: Palette.textMuted, marginTop: 3 }} numberOfLines={1}>
              {report.address} · {timeAgo(report.createdAt)}
            </Text>
          </View>
        </View>

        {rejected ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: Palette.criticalSoft,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: Radius.md,
            }}>
            <Icon name="close-circle" set="ion" size={20} color={Palette.alert} />
            <Text style={{ ...Type.bodyStrong, color: Palette.alert, flex: 1 }}>Qurum təsdiqləmədi</Text>
          </View>
        ) : (
          <Timeline status={report.status} />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SendLine state={state} serverId={report.serverId} onResend={onResend} />
          <View style={{ flex: 1 }} />
          <StatusBadge status={report.status} />
        </View>

        {!rejected && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 }}>
            <Icon
              name="star"
              set="ion"
              size={13}
              color={report.status === 'pending' ? Palette.textFaint : Palette.medium}
            />
            <Text style={{ ...Type.small, color: report.status === 'pending' ? Palette.textFaint : Palette.text }}>
              {report.status === 'pending' ? `Təsdiqdən sonra +${points} xal` : `+${points} xal`}
            </Text>
          </View>
        )}
      </View>
    </GroupCard>
  );
}

function SendLine({ state, serverId, onResend }: { state: SendState; serverId?: string; onResend: () => void }) {
  if (state === 'sent') {
    return <Text style={{ ...Type.small, color: Palette.textMuted, fontVariant: ['tabular-nums'] }}>№ {serverId}</Text>;
  }
  if (state === 'sending') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Spinner size={14} color={Palette.primary} track={Palette.ring} />
        <Text style={{ ...Type.small, color: Palette.textMuted }}>Göndərilir</Text>
      </View>
    );
  }
  if (state === 'stuck') return null;
  return (
    <Tap onPress={onResend} scaleTo={0.95}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="refresh" set="ion" size={15} color={Palette.primary} />
        <Text style={{ ...Type.small, color: Palette.primary }}>Yenidən göndər</Text>
      </View>
    </Tap>
  );
}

function Timeline({ status }: { status: ReportStatus }) {
  const current = STATUS_ORDER.indexOf(status);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {STATUS_ORDER.map((s, i) => {
        const done = i <= current;
        return (
          <View key={s} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor: i === 0 ? 'transparent' : i <= current ? Palette.primary : Palette.border,
                }}
              />
              <Dot done={done} current={i === current} />
              <View
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor:
                    i === STATUS_ORDER.length - 1 ? 'transparent' : i < current ? Palette.primary : Palette.border,
                }}
              />
            </View>
            <Text
              style={{
                ...Type.tiny,
                fontSize: 10,
                letterSpacing: 0,
                color: done ? Palette.primary : Palette.textFaint,
                marginTop: 6,
                textAlign: 'center',
              }}>
              {STATUS_LABEL[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Dot({ done, current }: { done: boolean; current: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!current) return;
    pulse.value = withRepeat(withTiming(2.1, { duration: 1300, easing: Easing.out(Easing.ease) }), -1, false);
    return () => cancelAnimation(pulse);
  }, [current, pulse]);
  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: current ? Math.max(0, 1 - (pulse.value - 1) / 1.1) * 0.4 : 0,
  }));
  const size = current ? 18 : 14;
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      {current && (
        <Animated.View
          style={[{ position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: Palette.primary }, ring]}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: done ? Palette.primary : Palette.surface,
          borderWidth: 2,
          borderColor: done ? Palette.primary : Palette.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {done && <Icon name="checkmark" set="ion" size={current ? 11 : 9} color="#fff" />}
      </View>
    </View>
  );
}
