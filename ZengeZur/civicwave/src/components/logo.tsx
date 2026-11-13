import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Gradients, Radius, Shadow } from '@/constants/design';
import { Icon } from '@/components/ui';

/**
 * Default placeholder logo — a gradient squircle with a civic "location pulse" mark.
 * Swap the inner Icon for the real logo image when provided.
 */
export function LogoMark({
  size = 84,
  radius = Radius.lg,
  shadow = true,
}: {
  size?: number;
  radius?: number;
  shadow?: boolean;
}) {
  return (
    <LinearGradient
      colors={Gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        ...(shadow ? Shadow.raised : {}),
      }}>
      <Icon name="map-marker-radius" size={size * 0.56} color="#fff" />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.2,
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size,
          backgroundColor: 'rgba(255,255,255,0.95)',
        }}
      />
    </LinearGradient>
  );
}
