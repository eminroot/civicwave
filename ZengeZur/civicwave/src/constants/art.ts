/**
 * The 3D renders, shrunk for the phone. Sources (2048 px PNG) stay in assets/3d.
 * Sizes are the pixel size of each file, so screens can keep the aspect ratio.
 */
export const ART = {
  trophy: { src: require('@/assets/3d/app/trophy.webp'), w: 314, h: 520 },
  success: { src: require('@/assets/3d/app/success.webp'), w: 467, h: 480 },
  clipboard: { src: require('@/assets/3d/app/empty-requests.webp'), w: 600, h: 531 },
  coin: { src: require('@/assets/3d/app/points-star.webp'), w: 197, h: 220 },
} as const;

/**
 * Medals by rank. Each file is a medal on its ribbon; the disc's centre sits at 72%
 * of the height and its radius is half the width.
 */
export const MEDALS = [
  { src: require('@/assets/3d/app/medal-gold.webp'), ring: '#E2B33C', ink: '#9A6A08' },
  { src: require('@/assets/3d/app/medal-silver.webp'), ring: '#B6C0CD', ink: '#5F6A7A' },
  { src: require('@/assets/3d/app/medal-bronze.webp'), ring: '#CB8C5A', ink: '#7A4522' },
] as const;

export const MEDAL_ASPECT = 300 / 171;
export const MEDAL_DISC_Y = 0.72;
