/** Issue categories — kept in sync with the mobile app (src/constants/categories.ts). */

export const CATEGORY_NAMES = {
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

export const DEPARTMENTS = {
  roads: 'Yol-Nəqliyyat İdarəsi',
  water: 'Mənzil-Kommunal Təsərrüfatı',
  sanitation: 'Təmizlik və Tullantı İdarəsi',
  greenery: 'Yaşıllaşdırma İdarəsi',
  lighting: 'İşıqlandırma Xidməti',
  facades: 'Memarlıq və Şəhərsalma İdarəsi',
  signage: 'Reklam və İnformasiya İdarəsi',
  parks: 'Abadlıq və Bağçılıq İdarəsi',
  construction: 'Tikinti Nəzarəti İdarəsi',
  seasonal: 'Kommunal Təcili Xidmət',
};

export const CATEGORY_EMOJI = {
  roads: '🛣️',
  water: '💧',
  sanitation: '🗑️',
  greenery: '🌳',
  lighting: '💡',
  facades: '🏚️',
  signage: '🪧',
  parks: '🎢',
  construction: '🚧',
  seasonal: '❄️',
};

export const CATEGORY_IDS = Object.keys(CATEGORY_NAMES);

export const SEVERITY_LABEL = {
  low: 'Aşağı',
  medium: 'Orta',
  critical: 'Kritik',
};

export const SEVERITY_EMOJI = {
  low: '🟢',
  medium: '🟡',
  critical: '🔴',
};
