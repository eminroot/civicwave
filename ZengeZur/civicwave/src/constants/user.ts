/** The citizen using this phone. The prototype has no sign-in. */
export const USER = {
  name: 'Emin',
  fullName: 'Emin Baxışlı',
  avatar: require('@/assets/avatars/emin.jpg') as number,
};

/** Points earned this month before the reports sent from this phone. */
export const BASE_POINTS = 2980;

/** Points earned this week before the reports sent from this phone. */
export const WEEK_BASE_POINTS = 760;

export type Period = 'week' | 'month';

export const TIERS = [
  { name: 'Bürünc', min: 0, color: '#B7773C' },
  { name: 'Gümüş', min: 1000, color: '#8C97A8' },
  { name: 'Qızıl', min: 2500, color: '#D19A00' },
  { name: 'Platin', min: 5000, color: '#6D5DF6' },
] as const;

export function tierInfo(points: number) {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (points >= TIERS[i].min) idx = i;
  const current = TIERS[idx];
  const next = TIERS[idx + 1];
  const progress = next ? (points - current.min) / (next.min - current.min) : 1;
  return {
    current,
    next,
    progress: Math.max(0, Math.min(1, progress)),
    remaining: next ? next.min - points : 0,
  };
}

/** `require()` of a bundled image, or a photo file picked on the phone. */
export type AvatarSource = number | { uri: string };
/** `short` is the name under the podium when the first word alone won't do. */
export type Leader = { name: string; short?: string; points: number; avatar: AvatarSource };
export type Standing = Leader & { rank: number; me?: boolean };

/** The district's most active residents, with their points this month and this week. */
const LEADERS: { name: string; short?: string; avatar: number; month: number; week: number }[] = [
  { name: 'Eyyub Yaqubov', month: 4820, week: 1150, avatar: require('@/assets/avatars/eyyub.jpg') },
  { name: 'Manaf Ağayev', month: 4310, week: 1240, avatar: require('@/assets/avatars/manaf.jpg') },
  { name: 'The Rock', short: 'The Rock', month: 3990, week: 1020, avatar: require('@/assets/avatars/therock.jpg') },
  { name: 'Eminem', month: 3640, week: 960, avatar: require('@/assets/avatars/eminem.jpg') },
  { name: 'Əvəz Əsgərov', month: 3210, week: 820, avatar: require('@/assets/avatars/avaz.jpg') },
  { name: 'Vüsal Hüseynov', month: 2610, week: 640, avatar: require('@/assets/avatars/vusal.jpg') },
  { name: 'Qüdrət Abbaslı', month: 2350, week: 710, avatar: require('@/assets/avatars/gudrat-a.jpg') },
  { name: 'Qüdrət Qüdrətli', month: 2090, week: 520, avatar: require('@/assets/avatars/gudrat-g.jpg') },
  { name: 'Oqtay Həşimli', month: 1870, week: 580, avatar: require('@/assets/avatars/oqtay.jpg') },
];

/** The table for `period` with this phone's citizen placed by their live points for it. */
export function standings(
  myPoints: number,
  period: Period = 'month',
  me: { name: string; avatar: AvatarSource } = { name: USER.fullName, avatar: USER.avatar }
): Standing[] {
  return [
    ...LEADERS.map((l) => ({ name: l.name, short: l.short, avatar: l.avatar, points: l[period] })),
    { name: me.name, points: myPoints, avatar: me.avatar, me: true },
  ]
    .sort((a, b) => b.points - a.points)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function myRank(points: number) {
  return standings(points).find((e) => e.me)?.rank ?? LEADERS.length + 1;
}
