import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatNumber } from '@/components/fx';
import { ReportThumb } from '@/components/report-thumb';
import { ScreenHeader, StatusShade } from '@/components/screen-header';
import { useTabBarHeight } from '@/components/tab-bar';
import { GroupCard, ListRow, StatusBadge, Tap } from '@/components/ui';
import { ART } from '@/constants/art';
import { STATUS_ORDER } from '@/constants/categories';
import { Palette, Space, Type } from '@/constants/design';
import { myRank } from '@/constants/user';
import { dayLabel, timeAgo } from '@/lib/format';
import { useProfile } from '@/lib/profile';
import { Report, useReports } from '@/lib/store';

export default function Today() {
  const router = useRouter();
  const barHeight = useTabBarHeight();
  const { reports, totalPoints } = useReports();

  const counts = useMemo(() => {
    let active = 0;
    let resolved = 0;
    for (const r of reports) {
      if (r.status === 'approved' || r.status === 'in_progress') active += 1;
      else if (r.status === 'resolved') resolved += 1;
    }
    return { sent: reports.length, active, resolved };
  }, [reports]);
  const rank = useMemo(() => myRank(totalPoints), [totalPoints]);
  const latest = reports[0];

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: barHeight + 40 }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={dayLabel()}
          title="Bu gün"
          backdrop={{ kind: 'mark' }}
          right={<Avatar onPress={() => router.push('/profile')} />}
        />

        <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.xl, gap: Space.lg }}>
          <Animated.View entering={FadeInDown.duration(380)}>
            <GroupCard>
              <ListRow
                icon="paper-plane-outline"
                label="Göndərilib"
                value={counts.sent}
                valueColor={Palette.primary}
                accessory="none"
              />
              <ListRow
                icon="time-outline"
                label="İcrada"
                value={counts.active}
                valueColor={Palette.warn}
                accessory="none"
              />
              <ListRow
                icon="checkmark-done-outline"
                label="Həll olundu"
                value={counts.resolved}
                valueColor={Palette.ok}
                accessory="none"
                last
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Space.xxl,
                  paddingHorizontal: Space.lg,
                  paddingVertical: Space.lg,
                  backgroundColor: Palette.surfaceAlt,
                  borderTopWidth: 1,
                  borderTopColor: Palette.border,
                }}>
                <Figure
                  label="Xal"
                  value={formatNumber(totalPoints)}
                  lead={
                    <Image
                      source={ART.coin.src}
                      style={{ width: 22, height: (22 * ART.coin.h) / ART.coin.w }}
                      contentFit="contain"
                      cachePolicy="memory"
                    />
                  }
                />
                <Figure label="Reytinq" value={`#${rank}`} />
                <View style={{ flex: 1 }} />
                <Tap onPress={() => router.navigate('/leaderboard')} scaleTo={0.9} accessibilityLabel="Reytinq">
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: Palette.surface,
                      borderWidth: 1,
                      borderColor: Palette.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Image
                      source={ART.trophy.src}
                      style={{ width: 25, height: (25 * ART.trophy.h) / ART.trophy.w }}
                      contentFit="contain"
                      cachePolicy="memory"
                    />
                  </View>
                </Tap>
              </View>
            </GroupCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(380)}>
            <GroupCard>
              <ListRow
                icon="chatbox-ellipses-outline"
                label="Müraciətlərim"
                onPress={() => router.push('/requests')}
                last
              />
            </GroupCard>
          </Animated.View>

          {latest ? (
            <Animated.View entering={FadeInDown.delay(120).duration(380)}>
              <LatestCard report={latest} onPress={() => router.push('/requests')} />
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
      <StatusShade />
    </View>
  );
}

function Avatar({ onPress }: { onPress: () => void }) {
  const { avatar } = useProfile();
  return (
    <Tap onPress={onPress} scaleTo={0.92} accessibilityLabel="Profil və menyu">
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          padding: 3,
          backgroundColor: Palette.surface,
          borderWidth: 1.5,
          borderColor: Palette.ring,
        }}>
        <Image source={avatar} style={{ flex: 1, borderRadius: 24 }} contentFit="cover" cachePolicy="memory" />
      </View>
    </Tap>
  );
}

function Figure({ label, value, lead }: { label: string; value: string; lead?: React.ReactNode }) {
  return (
    <View>
      <Text style={{ ...Type.small, color: Palette.textMuted }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
        {lead}
        <Text style={{ ...Type.figure, color: Palette.text }}>{value}</Text>
      </View>
    </View>
  );
}

/** Four short bars: pending, approved, in progress, resolved. */
function Steps({ report }: { report: Report }) {
  const step = report.status === 'rejected' ? -1 : STATUS_ORDER.indexOf(report.status);
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
      {STATUS_ORDER.map((s, i) => (
        <View
          key={s}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: i <= step ? Palette.primary : Palette.bgDeep,
          }}
        />
      ))}
    </View>
  );
}

function LatestCard({ report, onPress }: { report: Report; onPress: () => void }) {
  return (
    <Tap onPress={onPress} scaleTo={0.98}>
      <GroupCard>
        <View style={{ padding: Space.lg, gap: Space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <ReportThumb photoUri={report.photoUri} categoryId={report.categoryId} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...Type.small, color: Palette.textMuted }}>Son müraciət · {timeAgo(report.createdAt)}</Text>
              <Text style={{ ...Type.h3, fontSize: 17, color: Palette.text, marginTop: 2 }} numberOfLines={2}>
                {report.title}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Steps report={report} />
            <StatusBadge status={report.status} />
          </View>
        </View>
      </GroupCard>
    </Tap>
  );
}
