import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DistrictMap, DistrictMapHandle, MapPin } from '@/components/district-map';
import { FAB_RISE, useTabBarHeight } from '@/components/tab-bar';
import { CircleButton, GroupCard, Icon, RingIcon, StatusBadge, Tap } from '@/components/ui';
import { CATEGORY_ICON, CATEGORY_NAMES, CategoryId } from '@/constants/categories';
import { Palette, Radius, Shadow, Space, Type } from '@/constants/design';
import { timeAgo } from '@/lib/format';
import { Report, useReports } from '@/lib/store';

type Filter = 'all' | CategoryId;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const barHeight = useTabBarHeight();
  const { allReports } = useReports();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<DistrictMapHandle>(null);

  // The native map is heavy to create. Mount it once the tab has finished switching,
  // so the switch itself stays smooth; after that it stays mounted.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => setMapReady(true), 240);
      return () => clearTimeout(t);
    }, [])
  );

  const shown = useMemo(
    () => (filter === 'all' ? allReports : allReports.filter((r) => r.categoryId === filter)),
    [allReports, filter]
  );
  const pins = useMemo<MapPin[]>(
    () => shown.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, ...CATEGORY_ICON[r.categoryId] })),
    [shown]
  );
  // categories that actually have reports, for the filter row
  const presentCats = useMemo(() => {
    const set = new Set<CategoryId>(allReports.map((r) => r.categoryId));
    return (Object.keys(CATEGORY_NAMES) as CategoryId[]).filter((c) => set.has(c));
  }, [allReports]);
  const selected = shown.find((r) => r.id === selectedId) ?? null;

  const focus = (id: string) => {
    const r = shown.find((x) => x.id === id);
    if (!r) return;
    setSelectedId(id);
    mapRef.current?.focus(r.lat, r.lng);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bgDeep }}>
      {mapReady ? (
        <Animated.View entering={FadeIn.duration(350)} style={{ flex: 1 }}>
          <DistrictMap
            ref={mapRef}
            pins={pins}
            activeId={selectedId}
            onPinPress={focus}
            onMapPress={() => setSelectedId(null)}
          />
        </Animated.View>
      ) : (
        <View style={{ flex: 1, backgroundColor: Palette.bgDeep }} />
      )}

      {/* header card and filters */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 10 }}>
        <View style={{ paddingHorizontal: Space.lg }}>
          <GroupCard>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: Space.xl,
                paddingVertical: 14,
              }}>
              <Text style={{ ...Type.title, color: Palette.text, flex: 1 }}>Xəritə</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ ...Type.figure, color: Palette.primary }}>{shown.length}</Text>
                <Text style={{ ...Type.small, color: Palette.textMuted, marginTop: -2 }}>müraciət</Text>
              </View>
            </View>
          </GroupCard>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: Space.lg, paddingVertical: Space.md }}>
          <Chip label="Hamısı" active={filter === 'all'} onPress={() => setFilter('all')} />
          {presentCats.map((c) => (
            <Chip
              key={c}
              label={CATEGORY_NAMES[c]}
              icon={CATEGORY_ICON[c].icon}
              iconSet={CATEGORY_ICON[c].iconSet}
              active={filter === c}
              onPress={() => {
                setSelectedId(null);
                setFilter(filter === c ? 'all' : c);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', right: Space.lg, bottom: barHeight + (selected ? FAB_RISE + 150 : 22) }}>
        <View style={{ borderRadius: 25, ...Shadow.soft }}>
          <CircleButton
            icon="locate-outline"
            size={50}
            bg={Palette.surface}
            color={Palette.primary}
            label="Xətaiyə qayıt"
            onPress={() => {
              setSelectedId(null);
              mapRef.current?.reset();
            }}
          />
        </View>
      </View>

      {selected && (
        <Animated.View
          key={selected.id}
          entering={FadeInDown.duration(260)}
          exiting={FadeOutDown.duration(180)}
          style={{ position: 'absolute', left: Space.lg, right: Space.lg, bottom: barHeight + FAB_RISE + 8 }}>
          <PinDetail report={selected} onClose={() => setSelectedId(null)} />
        </Animated.View>
      )}
    </View>
  );
}

function Chip({
  label,
  icon,
  iconSet,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  iconSet?: 'mci' | 'ion';
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Tap onPress={onPress} scaleTo={0.94}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          height: 40,
          paddingHorizontal: 15,
          borderRadius: Radius.pill,
          backgroundColor: active ? Palette.primary : Palette.surface,
          ...Shadow.soft,
        }}>
        {icon ? <Icon name={icon} set={iconSet} size={16} color={active ? '#fff' : Palette.primary} /> : null}
        <Text style={{ ...Type.small, fontSize: 14, color: active ? '#fff' : Palette.text }}>{label}</Text>
      </View>
    </Tap>
  );
}

function PinDetail({ report, onClose }: { report: Report; onClose: () => void }) {
  const cat = CATEGORY_ICON[report.categoryId];
  return (
    <View style={{ borderRadius: Radius.xl, ...Shadow.raised }}>
      <View
        style={{
          backgroundColor: Palette.surface,
          borderRadius: Radius.xl,
          borderCurve: 'continuous',
          padding: Space.lg,
          gap: 14,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RingIcon name={cat.icon} set={cat.iconSet} color={cat.color} ring={cat.color + '55'} size={50} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...Type.h3, fontSize: 17, color: Palette.text }} numberOfLines={2}>
              {report.title}
            </Text>
            <Text style={{ ...Type.small, color: Palette.textMuted, marginTop: 2 }} numberOfLines={1}>
              {report.address}
            </Text>
          </View>
          <CircleButton icon="close" size={36} label="Bağla" onPress={onClose} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ ...Type.small, color: Palette.textMuted, flex: 1 }} numberOfLines={1}>
            {timeAgo(report.createdAt)} · {report.department}
          </Text>
          <StatusBadge status={report.status} />
        </View>
      </View>
    </View>
  );
}
