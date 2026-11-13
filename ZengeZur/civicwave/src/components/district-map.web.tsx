import { useImperativeHandle, useState } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { CenterPin, DistrictMapHandle, HOME_REGION, MapPin, PinMark } from '@/components/map-pin';
import { Palette } from '@/constants/design';

export { HOME_REGION };
export type { DistrictMapHandle, MapPin };

/* The native map library has no web build. On the web the district is drawn as a
   plain street grid with the pins placed by their coordinates. */

const LAT = [HOME_REGION.latitude - HOME_REGION.latitudeDelta / 2, HOME_REGION.latitude + HOME_REGION.latitudeDelta / 2];
const LNG = [HOME_REGION.longitude - HOME_REGION.longitudeDelta / 2, HOME_REGION.longitude + HOME_REGION.longitudeDelta / 2];

function Streets({ w, h }: { w: number; h: number }) {
  const lines = [];
  for (let i = 0; i < 14; i++) {
    const y = ((i * 97) % 100) / 100;
    const x = ((i * 61) % 100) / 100;
    lines.push(<Line key={`h${i}`} x1={0} y1={y * h} x2={w} y2={y * h + (i % 3) * 18 - 18} stroke="#FFFFFF" strokeWidth={i % 4 === 0 ? 7 : 3} />);
    lines.push(<Line key={`v${i}`} x1={x * w} y1={0} x2={x * w + (i % 2 ? 30 : -24)} y2={h} stroke="#FFFFFF" strokeWidth={i % 5 === 0 ? 7 : 3} />);
  }
  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Rect x={0} y={0} width={w} height={h} fill="#E8EDF3" />
      {lines}
    </Svg>
  );
}

export function DistrictMap({
  ref,
  pins,
  activeId,
  onPinPress,
  onMapPress,
  style,
}: {
  ref?: React.Ref<DistrictMapHandle>;
  pins: MapPin[];
  activeId?: string | null;
  onPinPress?: (id: string) => void;
  onMapPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useImperativeHandle(ref, () => ({ focus: () => {}, reset: () => {} }), []);
  return (
    <Pressable
      onPress={onMapPress}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ flex: 1, backgroundColor: Palette.bgDeep, overflow: 'hidden' }, style]}>
      {size.w > 0 && <Streets w={size.w} h={size.h} />}
      {size.w > 0 &&
        pins.map((p) => {
          const x = ((p.lng - LNG[0]) / (LNG[1] - LNG[0])) * size.w;
          const y = (1 - (p.lat - LAT[0]) / (LAT[1] - LAT[0])) * size.h;
          return (
            <Pressable key={p.id} onPress={() => onPinPress?.(p.id)} style={{ position: 'absolute', left: x - 23, top: y - 56 }}>
              <PinMark pin={p} active={p.id === activeId} />
            </Pressable>
          );
        })}
    </Pressable>
  );
}

export function MapPreview({ style }: { lat: number; lng: number; style?: StyleProp<ViewStyle> }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ flex: 1, backgroundColor: Palette.bgDeep, overflow: 'hidden' }, style]}>
      {size.w > 0 && <Streets w={size.w} h={size.h} />}
      <CenterPin />
    </View>
  );
}
