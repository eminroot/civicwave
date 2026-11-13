import { View } from 'react-native';

import { Icon } from '@/components/ui';
import { IconSet } from '@/constants/categories';
import { Palette } from '@/constants/design';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  icon: string;
  iconSet: IconSet;
};

export type DistrictMapHandle = {
  focus: (lat: number, lng: number) => void;
  reset: () => void;
};

/** Xətai, framed to show the whole district. */
export const HOME_REGION = {
  latitude: 40.382,
  longitude: 49.886,
  latitudeDelta: 0.06,
  longitudeDelta: 0.07,
};

/** A white ring in the category colour with a small pointer underneath. */
export function PinMark({ pin, active }: { pin: Pick<MapPin, 'color' | 'icon' | 'iconSet'>; active?: boolean }) {
  const size = active ? 46 : 38;
  return (
    <View style={{ alignItems: 'center', padding: 2 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? pin.color : Palette.surface,
          borderWidth: 2.5,
          borderColor: pin.color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={pin.icon} set={pin.iconSet} size={active ? 22 : 18} color={active ? '#fff' : pin.color} />
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: pin.color,
          marginTop: -1,
        }}
      />
    </View>
  );
}

/** The pin used on the location preview, its tip on the exact spot. */
export function CenterPin() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ marginBottom: 44 }}>
        <Icon name="map-marker" size={46} color={Palette.primary} />
      </View>
    </View>
  );
}
