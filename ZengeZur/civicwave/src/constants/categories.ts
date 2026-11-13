/**
 * Issue categories for Xətai rayonu (Baku).
 * Each `service` shown to the citizen maps to one AI `categoryId` and a responsible department.
 */

export type IconSet = 'mci' | 'ion';

export type Service = {
  id: string;
  /** AI classification category this service belongs to */
  categoryId: CategoryId;
  title: string;
  /** Extra words the search also matches */
  keywords: string;
  icon: string;
  iconSet: IconSet;
};

export type CategoryId =
  | 'roads'
  | 'water'
  | 'sanitation'
  | 'greenery'
  | 'lighting'
  | 'facades'
  | 'signage'
  | 'parks'
  | 'construction'
  | 'seasonal';

/** The same department names as the command center, so its department heads and field
 *  workers see the reports that come from the phone. */
export const DEPARTMENTS: Record<CategoryId, string> = {
  roads: 'Yol İstismar İdarəsi',
  water: 'Sukanal İdarəsi',
  sanitation: 'Təmizlik və Tullantı İdarəsi',
  greenery: 'Yaşıllaşdırma İdarəsi',
  lighting: 'İşıqlandırma İdarəsi',
  facades: 'Tikinti və Təmir İdarəsi',
  signage: 'Reklam və İnformasiya İdarəsi',
  parks: 'Park və Bağ İdarəsi',
  construction: 'Tikinti və Təmir İdarəsi',
  seasonal: 'Kommunal Xidmət',
};

/** Azerbaijani display name per category (used by AI + cards) */
export const CATEGORY_NAMES: Record<CategoryId, string> = {
  roads: 'Yollar və Asfalt',
  water: 'Su və Subasma',
  sanitation: 'Təmizlik və Tullantılar',
  greenery: 'Yaşıllıq və Ağaclar',
  lighting: 'Küçə İşıqlandırması',
  facades: 'Bina Fasadları',
  signage: 'Reklam və Vitrinlər',
  parks: 'Parklar və Avadanlıq',
  construction: 'Tikinti Sahələri',
  seasonal: 'Buz və Mövsümi',
};

/** Outline glyphs everywhere; the colour is only used on the map. */
export const CATEGORY_ICON: Record<CategoryId, { icon: string; iconSet: IconSet; color: string }> = {
  roads: { icon: 'road-variant', iconSet: 'mci', color: '#3B5BDB' },
  water: { icon: 'water-outline', iconSet: 'ion', color: '#0EA5E9' },
  sanitation: { icon: 'trash-outline', iconSet: 'ion', color: '#F97316' },
  greenery: { icon: 'tree-outline', iconSet: 'mci', color: '#16A34A' },
  lighting: { icon: 'bulb-outline', iconSet: 'ion', color: '#E5A00D' },
  facades: { icon: 'business-outline', iconSet: 'ion', color: '#8B5CF6' },
  signage: { icon: 'easel-outline', iconSet: 'ion', color: '#EC4899' },
  parks: { icon: 'seat-outline', iconSet: 'mci', color: '#14B8A6' },
  construction: { icon: 'crane', iconSet: 'mci', color: '#CA8A04' },
  seasonal: { icon: 'snow-outline', iconSet: 'ion', color: '#38BDF8' },
};

export type ServiceSection = { title: string; data: Service[] };

export const SERVICE_SECTIONS: ServiceSection[] = [
  {
    title: 'Yol və infrastruktur',
    data: [
      { id: 'roads', categoryId: 'roads', title: 'Yol və asfalt', keywords: 'çuxur dağılmış asfalt yol', icon: 'road-variant', iconSet: 'mci' },
      { id: 'sidewalk', categoryId: 'roads', title: 'Səki və bordür', keywords: 'sınıq səki bordür piyada', icon: 'walk-outline', iconSet: 'ion' },
      { id: 'water', categoryId: 'water', title: 'Subasma və drenaj', keywords: 'yağış su kanalizasiya', icon: 'water-outline', iconSet: 'ion' },
      { id: 'construction', categoryId: 'construction', title: 'Tikinti sahəsi', keywords: 'hasar qazıntı təhlükəli', icon: 'crane', iconSet: 'mci' },
    ],
  },
  {
    title: 'Təmizlik və ətraf mühit',
    data: [
      { id: 'sanitation', categoryId: 'sanitation', title: 'Zibil və tullantı', keywords: 'konteyner zibillik', icon: 'trash-outline', iconSet: 'ion' },
      { id: 'greenery', categoryId: 'greenery', title: 'Ağaclar və yaşıllıq', keywords: 'aşmış ağac quru', icon: 'tree-outline', iconSet: 'mci' },
    ],
  },
  {
    title: 'İşıq və binalar',
    data: [
      { id: 'lighting', categoryId: 'lighting', title: 'Küçə işığı', keywords: 'yanmayan lampa qaranlıq', icon: 'bulb-outline', iconSet: 'ion' },
      { id: 'facades', categoryId: 'facades', title: 'Bina fasadı', keywords: 'soyulmuş rəng dağılan', icon: 'business-outline', iconSet: 'ion' },
    ],
  },
  {
    title: 'Şəhər abadlığı',
    data: [
      { id: 'signage', categoryId: 'signage', title: 'Reklam və vitrin', keywords: 'zədəli lövhə', icon: 'easel-outline', iconSet: 'ion' },
      { id: 'parks', categoryId: 'parks', title: 'Park və skamya', keywords: 'sınıq skamya atraksion', icon: 'seat-outline', iconSet: 'mci' },
      { id: 'fountain', categoryId: 'parks', title: 'Fontan', keywords: 'işləməyən fontan', icon: 'fountain', iconSet: 'mci' },
      { id: 'seasonal', categoryId: 'seasonal', title: 'Buz və qar', keywords: 'buzlaşma sürüşkən', icon: 'snow-outline', iconSet: 'ion' },
    ],
  },
];

export const ALL_SERVICES: Service[] = SERVICE_SECTIONS.flatMap((s) => s.data);

export type Severity = 'low' | 'medium' | 'critical';

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Aşağı',
  medium: 'Orta',
  critical: 'Kritik',
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  low: '#16A34A',
  medium: '#D97706',
  critical: '#DC2626',
};

export const SEVERITY_POINTS: Record<Severity, number> = {
  low: 10,
  medium: 25,
  critical: 50,
};

export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'resolved';

export const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'Gözləyir',
  approved: 'Təsdiqləndi',
  rejected: 'Rədd edildi',
  in_progress: 'İcrada',
  resolved: 'Həll olundu',
};

/** One badge style for every status, same size everywhere. */
export const STATUS_TONE: Record<ReportStatus, { fg: string; bg: string }> = {
  pending: { fg: '#5B6578', bg: '#EEF1F5' },
  approved: { fg: '#1450C4', bg: '#E7EFFE' },
  in_progress: { fg: '#B45309', bg: '#FEF3C7' },
  resolved: { fg: '#16803C', bg: '#DCFCE7' },
  rejected: { fg: '#C93838', bg: '#FEE2E2' },
};

// Linear lifecycle shown in the report timeline. `rejected` is a terminal off-track
// state and is intentionally NOT part of this order (it gets its own rendering).
export const STATUS_ORDER: ReportStatus[] = ['pending', 'approved', 'in_progress', 'resolved'];
