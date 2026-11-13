import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// A four-point star with concave sides, drawn on a 24 x 24 box.
const STAR =
  'M12 0C12.9 6.1 17.9 11.1 24 12C17.9 12.9 12.9 17.9 12 24C11.1 17.9 6.1 12.9 0 12C6.1 11.1 11.1 6.1 12 0Z';

/** The AI mark: one large multicolour star and two small ones. */
export function Sparkle({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 34 34">
      <Defs>
        <LinearGradient id="sparkle-main" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFC24B" />
          <Stop offset="0.42" stopColor="#FF5B86" />
          <Stop offset="1" stopColor="#3D7BFF" />
        </LinearGradient>
      </Defs>
      <Path d={STAR} transform="translate(9 8.5) scale(1.04)" fill="url(#sparkle-main)" />
      <Path d={STAR} transform="translate(1.5 1) scale(0.42)" fill="#FFC24B" />
      <Path d={STAR} transform="translate(12 0) scale(0.24)" fill="#4ADE80" />
    </Svg>
  );
}
