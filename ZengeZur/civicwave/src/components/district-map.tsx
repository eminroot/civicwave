import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { CenterPin, DistrictMapHandle, HOME_REGION, MapPin, PinMark } from '@/components/map-pin';

export { HOME_REGION };
export type { DistrictMapHandle, MapPin };

/** The camera leans back and turns a little so the buildings stand up. */
const TILT = { pitch: 55, heading: -17 };
/** How close a focused report is: Apple Maps reads altitude (m), Google Maps zoom. */
const CLOSE = { altitude: 700, zoom: 17 };

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
  const map = useRef<MapView>(null);
  useImperativeHandle(
    ref,
    () => ({
      focus: (lat, lng) =>
        map.current?.animateCamera({ center: { latitude: lat, longitude: lng }, ...TILT, ...CLOSE }, { duration: 600 }),
      // Framing a region flattens the camera, so it tilts back once the move ends.
      reset: () => {
        map.current?.animateToRegion(HOME_REGION, 450);
        setTimeout(() => map.current?.animateCamera(TILT, { duration: 450 }), 480);
      },
    }),
    []
  );

  // Custom marker views are drawn, then frozen for smooth panning; after any change
  // they are redrawn for a moment.
  const pinsKey = `${pins.map((p) => p.id).join(',')}|${activeId ?? ''}`;
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 700);
    return () => clearTimeout(t);
  }, [pinsKey]);

  return (
    <MapView
      ref={map}
      provider={PROVIDER_DEFAULT}
      style={[{ flex: 1 }, style]}
      initialRegion={HOME_REGION}
      onMapReady={() => map.current?.animateCamera(TILT, { duration: 900 })}
      showsBuildings
      pitchEnabled
      rotateEnabled
      showsUserLocation
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      onPress={onMapPress}>
      {pins.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat, longitude: p.lng }}
          anchor={{ x: 0.5, y: 1 }}
          onPress={() => onPinPress?.(p.id)}
          tracksViewChanges={tracking}>
          <PinMark pin={p} active={p.id === activeId} />
        </Marker>
      ))}
    </MapView>
  );
}

/** A still map around one point, with the pin on it. Not interactive. */
export function MapPreview({ lat, lng, style }: { lat: number; lng: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ flex: 1 }, style]}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        region={{ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
        liteMode
      />
      <CenterPin />
    </View>
  );
}
