const WEEKDAYS = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'];
const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avqust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
];

/** Azerbaijani capital: i becomes İ, not I. */
function capitalize(word: string) {
  const first = word[0] === 'i' ? 'İ' : word[0].toUpperCase();
  return first + word.slice(1);
}

/** "Cümə axşamı, 12 noyabr" */
export function dayLabel(d = new Date()) {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Noyabr" */
export function monthName(d = new Date()) {
  return capitalize(MONTHS[d.getMonth()]);
}

/** Monday 00:00 of the week `d` falls in. */
export function weekStart(d = new Date()) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

/** "9–15 noyabr", or "27 oktyabr – 2 noyabr" when the week crosses a month */
export function weekRange(d = new Date()) {
  const a = weekStart(d);
  const b = new Date(a);
  b.setDate(a.getDate() + 6);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}

/** "5 dəq əvvəl", "3 saat əvvəl", "2 gün əvvəl" */
export function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'indicə';
  if (m < 60) return `${m} dəq əvvəl`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat əvvəl`;
  return `${Math.floor(h / 24)} gün əvvəl`;
}
