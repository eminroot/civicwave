/**
 * HarAI design tokens: white surfaces on a cool grey ground, one strong blue,
 * large editorial headings and grouped lists. Every user-facing string is Azerbaijani.
 */

export const Palette = {
  // Surfaces
  bg: '#EDF0F5',
  bgDeep: '#E3E8EF',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F5F9',
  border: '#E3E7EE',
  borderStrong: '#CCD4E0',

  // Text
  text: '#0E1525',
  textMuted: '#5B6578',
  textFaint: '#99A2B3',
  onPrimary: '#FFFFFF',

  // Brand
  primary: '#1C64F2',
  primaryDark: '#1450C4',
  primarySoft: '#E7EFFE',
  ring: '#C4D6FB',
  band: '#DCE7FD',

  // AI accent
  ai1: '#6D5DF6',
  ai2: '#21B5E6',

  // Severity and status
  low: '#16A34A',
  lowSoft: '#DCFCE7',
  medium: '#D97706',
  mediumSoft: '#FEF3C7',
  critical: '#DC2626',
  criticalSoft: '#FEE2E2',
  alert: '#C93838',
  ok: '#16803C',
  warn: '#B45309',

  shadow: 'rgba(15, 33, 65, 0.10)',
} as const;

export const Gradients = {
  brand: ['#2D74F6', '#1450C4'] as const,
  ai: ['#6D5DF6', '#21B5E6'] as const,
};

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 26,
  pill: 999,
} as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const Shadow = {
  card: {
    boxShadow: '0 1px 2px rgba(15, 33, 65, 0.05), 0 8px 20px rgba(15, 33, 65, 0.05)',
  },
  soft: {
    boxShadow: '0 2px 8px rgba(15, 33, 65, 0.07)',
  },
  raised: {
    boxShadow: '0 12px 28px rgba(15, 33, 65, 0.16)',
  },
  fab: {
    boxShadow: '0 10px 22px rgba(28, 100, 242, 0.38)',
  },
  bar: {
    boxShadow: '0 -6px 24px rgba(15, 33, 65, 0.07)',
  },
} as const;

export const Type = {
  hero: { fontSize: 36, lineHeight: 42, fontWeight: '800' as const, letterSpacing: -0.8 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  section: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 19, lineHeight: 25, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  row: { fontSize: 17, lineHeight: 22, fontWeight: '500' as const, letterSpacing: -0.2 },
  eyebrow: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  tiny: { fontSize: 11, lineHeight: 15, fontWeight: '700' as const, letterSpacing: 0.3 },
  figure: { fontSize: 26, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.6 },
} as const;
