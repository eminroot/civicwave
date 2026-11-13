/* ==================================================================
   Zəngəzur · Komanda Mərkəzi

   The Veritas console, for Xətai's citizen reports. Every report,
   photo and history entry comes from the CivicWave server (api.js).
   Nothing here is sample data: an empty database shows empty states,
   and every figure is computed from real reports.
   ================================================================== */
(function () {
  'use strict';

  const API = window.CivicAPI;
  const HOUR = 3600e3;
  const DAY = 24 * HOUR;

  /* ------------------------------------------------------------ icons */

  const svg = (inner, sw = 1.6) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const I = {
    grid: svg('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>'),
    inbox: svg('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
    map: svg('<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>'),
    clipboard: svg('<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>'),
    chart: svg('<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
    file: svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'),
    star: svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
    starFill: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon fill="currentColor" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    settings: svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    help: svg('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
    building: svg('<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'),
    alert: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>', 2),
    x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 1.8),
    arrowL: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
    arrowR: svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
    pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    clock: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
    layers: svg('<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>'),
    eye: svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    rotate: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
    logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'),
    user: svg('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    shield: svg('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    swap: svg('<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>'),
    camera: svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
    users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    sparkles: svg('<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>'),
    history: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
    newspaper: svg('<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>'),
    key: svg('<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>'),
    trend: svg('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'),
    printer: svg('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>'),
    sheet: svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>'),
    phone: svg('<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>'),
    send: svg('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'),
    play: svg('<polygon points="6 3 20 12 6 21 6 3"/>'),
    external: svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    wifiOff: svg('<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>'),
    loader: svg('<path d="M21 12a9 9 0 1 1-6.219-8.56"/>', 2),
    more: svg('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>', 2),
    /* categories */
    road: svg('<path d="M7 21 9 3M17 21 15 3M12 5v2M12 11v2M12 17v2"/>'),
    clean: svg('<path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13M10 11v5M14 11v5"/>'),
    green: svg('<path d="M12 22v-7M12 15c0-4 3-6 7-6 0 4-3 6-7 6Zm0-2C12 9 9 6 5 6c0 4 3 7 7 7Z"/>'),
    light: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.2 1 2h6c0-.8.2-1.3 1-2A6 6 0 0 0 12 3Z"/>'),
    infra: svg('<path d="M4 21V8l6-4 6 4M16 21V11l4-2v12M4 21h16M8 12h.01M8 16h.01M12 12h.01M12 16h.01"/>'),
    water: svg('<path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z"/>'),
    signage: svg('<rect x="4" y="4" width="16" height="9" rx="1.5"/><path d="M12 13v7M9 20h6M7.5 7.5h9M7.5 10h6"/>'),
    parks: svg('<path d="M3 11h18M5 11v8M19 11v8M3 14h18M8 19v2M16 19v2M7 11V9a5 5 0 0 1 10 0v2"/>'),
    construction: svg('<path d="M10 4h4l4 16H6L10 4Z"/><path d="M8.8 10h6.4M7.6 15h8.8M4 20h16"/>'),
    seasonal: svg('<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 6l-2.4 1.4M12 6l2.4 1.4M12 18l-2.4-1.4M12 18l2.4 1.4"/>'),
    other: svg('<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.6-.9 1.4M12 16h.01"/>'),
  };

  /* ----------------------------------------------------------- domain */

  const CAT = {
    roads: { name: 'Yollar və asfalt', dept: 'Yol İstismar İdarəsi', urg: 9, icon: 'road' },
    water: { name: 'Su və subasma', dept: 'Sukanal İdarəsi', urg: 10, icon: 'water' },
    sanitation: { name: 'Təmizlik və tullantılar', dept: 'Təmizlik və Tullantı İdarəsi', urg: 6, icon: 'clean' },
    greenery: { name: 'Yaşıllıq və ağaclar', dept: 'Yaşıllaşdırma İdarəsi', urg: 4, icon: 'green' },
    lighting: { name: 'Küçə işıqlandırması', dept: 'İşıqlandırma İdarəsi', urg: 7, icon: 'light' },
    facades: { name: 'Bina fasadları', dept: 'Tikinti və Təmir İdarəsi', urg: 8, icon: 'infra' },
    signage: { name: 'Reklam və vitrinlər', dept: 'Reklam və İnformasiya İdarəsi', urg: 3, icon: 'signage' },
    parks: { name: 'Parklar və avadanlıq', dept: 'Park və Bağ İdarəsi', urg: 4, icon: 'parks' },
    construction: { name: 'Tikinti sahələri', dept: 'Tikinti və Təmir İdarəsi', urg: 7, icon: 'construction' },
    seasonal: { name: 'Buz və mövsümi', dept: 'Kommunal Xidmət', urg: 6, icon: 'seasonal' },
    other: { name: 'Digər', dept: 'Kommunal Xidmət', urg: 3, icon: 'other' },
  };
  const CAT_ALIASES = {
    road: 'roads', yol: 'roads', asfalt: 'roads', pothole: 'roads', su: 'water', flood: 'water', subasma: 'water',
    kanalizasiya: 'water', clean: 'sanitation', 'təmizlik': 'sanitation', zibil: 'sanitation', garbage: 'sanitation',
    waste: 'sanitation', 'tullantı': 'sanitation', green: 'greenery', 'yaşıllıq': 'greenery', 'ağac': 'greenery',
    tree: 'greenery', light: 'lighting', 'işıq': 'lighting', lamp: 'lighting', infra: 'facades', fasad: 'facades',
    facade: 'facades', building: 'facades', reklam: 'signage', sign: 'signage', park: 'parks', tikinti: 'construction',
    buz: 'seasonal', ice: 'seasonal', winter: 'seasonal',
  };
  const DEPTS = [...new Set(Object.values(CAT).map((c) => c.dept))];

  const SEV = {
    low: { name: 'Aşağı', w: 18, dl: 120, pin: 1 },
    medium: { name: 'Orta', w: 46, dl: 72, pin: 2 },
    high: { name: 'Yüksək', w: 68, dl: 48, pin: 3 },
    critical: { name: 'Kritik', w: 90, dl: 24, pin: 4 },
  };
  const SEV_ALIASES = { mid: 'medium', orta: 'medium', crit: 'critical', kritik: 'critical', 'aşağı': 'low', 'yüksək': 'high' };

  const ST = {
    pending: { name: 'Təsdiq gözləyir', tone: 'warn' },
    approved: { name: 'Təsdiqlənib', tone: 'info' },
    in_progress: { name: 'İcrada', tone: 'blue' },
    proof: { name: 'Sübut yoxlanılır', tone: 'warn' },
    resolved: { name: 'Həll edilib', tone: 'ok' },
    rejected: { name: 'Rədd edilib', tone: 'stop' },
  };
  const OPEN = ['pending', 'approved', 'in_progress', 'proof'];
  const SOURCE = { app: 'Mobil tətbiq', telegram: 'Telegram', web: 'Veb', demo: 'Nümunə məlumat' };

  /* Where every case stands, as one bar: a blue scale from waiting to done. */
  const STAGES = [
    { name: 'Həll edilib', color: '#1b55b8', has: (s) => s === 'resolved' },
    { name: 'İcrada', color: '#7d9fdc', has: (s) => s === 'approved' || s === 'in_progress' || s === 'proof' },
    { name: 'Təsdiq gözləyir', color: '#c9d8f3', has: (s) => s === 'pending' },
    { name: 'Rədd edilib', color: '#d8dce4', has: (s) => s === 'rejected' },
  ];

  const ROLES = {
    manager: {
      name: 'Aysel Abbasova', title: 'Rayon meneceri', init: 'AA', dept: null,
      can: { approve: true, reassign: true, proof: true, close: true, export: true, work: false },
      nav: ['overview', 'queue', 'map', 'analytics', 'reports', 'feedback'],
    },
    head: {
      name: 'Rəşad Quliyev', title: 'Departament rəhbəri', init: 'RQ', dept: 'Yol İstismar İdarəsi',
      can: { approve: true, reassign: true, proof: true, close: true, export: true, work: false },
      nav: ['overview', 'queue', 'map', 'analytics', 'reports', 'feedback'],
    },
    worker: {
      name: 'Tural Əliyev', title: 'Sahə işçisi', init: 'TƏ', dept: 'Yol İstismar İdarəsi',
      can: { approve: false, reassign: false, proof: false, close: false, export: false, work: true },
      nav: ['tasks', 'map'],
    },
  };

  const NAV = {
    overview: { label: 'Ümumi baxış', short: 'Baxış', icon: 'grid' },
    queue: { label: 'Müraciət növbəsi', short: 'Növbə', icon: 'inbox' },
    map: { label: 'Xəritə', short: 'Xəritə', icon: 'map' },
    tasks: { label: 'Tapşırıqlarım', short: 'Tapşırıqlar', icon: 'clipboard' },
    analytics: { label: 'Analitika', short: 'Analitika', icon: 'chart' },
    reports: { label: 'Hesabatlar', short: 'Hesabat', icon: 'file' },
    feedback: { label: 'Vətəndaş rəyləri', short: 'Rəylər', icon: 'star' },
    settings: { label: 'Parametrlər', short: 'Ayarlar', icon: 'settings' },
  };

  /* ---------------------------------------------------------- helpers */

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const now = () => Date.now();
  const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];
  const pad = (n) => String(n).padStart(2, '0');

  const LS = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(`zz.${key}`);
        return v == null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`zz.${key}`, JSON.stringify(value));
      } catch {
        /* private mode: preferences are simply not remembered */
      }
    },
  };

  function fmtDate(d) {
    const date = d instanceof Date ? d : new Date(d);
    const y = date.getFullYear() !== new Date().getFullYear() ? ` ${date.getFullYear()}` : '';
    return `${date.getDate()} ${MONTHS[date.getMonth()]}${y}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  const fmtDay = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function ageStr(d) {
    const m = Math.floor((now() - +d) / 60000);
    if (m < 1) return 'indicə';
    if (m < 60) return `${m} dəq əvvəl`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} saat əvvəl`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days} gün əvvəl`;
    return fmtDate(d);
  }

  function spanStr(ms) {
    const m = Math.round(Math.abs(ms) / 60000);
    if (m < 60) return `${Math.max(1, m)} dəq`;
    const h = Math.round(m / 60);
    if (h < 48) return `${h} saat`;
    return `${Math.round(h / 24)} gün`;
  }

  const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const azn = (n) => `${num(n)} ₼`;
  const initials = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  function firstSentence(text) {
    const t = String(text || '').trim();
    if (!t) return '';
    const m = t.match(/^[\s\S]*?[.!?](\s|$)/);
    let s = (m ? m[0] : t).trim().replace(/[.!?]$/, '');
    if (s.length > 80) s = `${s.slice(0, 78).trim()}…`;
    return s;
  }

  const normCat = (v) => {
    const k = String(v || '').toLowerCase().trim();
    return CAT[k] ? k : CAT_ALIASES[k] || 'other';
  };
  const normSev = (v) => {
    const k = String(v || '').toLowerCase().trim();
    return SEV[k] ? k : SEV_ALIASES[k] || 'medium';
  };

  const REGION_NAME = Object.fromEntries(window.CivicGeo.regions.map((r) => [r.key, r.name]));
  const DISTRICT_NAME = Object.fromEntries(window.CivicGeo.districts.map((r) => [r.key, r.name]));
  const placeName = (r) => (r.district ? `${DISTRICT_NAME[r.district]}, Bakı` : placeName(r));

  /* ----------------------------------------------------- report model */

  function toReport(d) {
    const cat = normCat(d.categoryId || d.category);
    const sev = normSev(d.severity);
    const created = new Date(Number(d.createdAt) || Date.parse(d.createdAtISO) || now());
    const status = ST[d.statusText] ? d.statusText : Number(d.status) === 1 ? 'approved' : 'pending';
    const lat = d.location ? Number(d.location.lat) : NaN;
    const lng = d.location ? Number(d.location.lng) : NaN;
    const hasLoc = Number.isFinite(lat) && Number.isFinite(lng);
    const conf = d.confidence == null || d.confidence === '' ? null : Math.round(Number(d.confidence));
    const district = hasLoc ? window.CivicGeo.districtAt(lng, lat) : null;
    return {
      id: String(d.id),
      cat,
      sev,
      status,
      title: d.title || firstSentence(d.explanation) || CAT[cat].name,
      explanation: d.explanation || '',
      dept: d.department || CAT[cat].dept,
      worker: d.worker || null,
      conf: Number.isFinite(conf) ? conf : null,
      cost: Number(d.costMax) || Number(d.costMin) || 0,
      lat: hasLoc ? lat : null,
      lng: hasLoc ? lng : null,
      hasLoc,
      region: district ? 'baku' : hasLoc ? window.CivicGeo.regionAt(lng, lat) : null,
      district,
      addr: d.address || (hasLoc ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : ''),
      note: d.note || '',
      reporter: d.reporter || 'Anonim',
      source: d.source || 'app',
      rating: Number(d.rating) || null,
      imageUrl: API.url(d.imageUrl),
      proofBeforeUrl: API.url(d.proofBeforeUrl),
      proofAfterUrl: API.url(d.proofAfterUrl),
      fixedImageUrl: API.url(d.fixedImageUrl),
      fixVerdict: d.fixVerdict || null,
      resolvedBy: d.resolvedBy || null,
      resolvedAt: d.resolvedAt ? new Date(d.resolvedAt) : null,
      created,
      updatedAt: Number(d.updatedAt) || +created,
      history: Array.isArray(d.history) ? d.history : [],
      /** How many residents sent this problem (the same photo again joins the first report). */
      count: Math.max(1, Number(d.reportCount) || 1),
    };
  }

  const isOpen = (r) => OPEN.includes(r.status);
  const deadlineOf = (r) => +r.created + SEV[r.sev].dl * HOUR;
  const isOverdue = (r) => isOpen(r) && deadlineOf(r) < now();
  /** "3 sakin" next to a report's number when more than one resident sent it. */
  const countTag = (r) => (r.count > 1 ? `<span class="count-tag" title="${r.count} sakin eyni problemi bildirib">${I.users}${r.count} sakin</span>` : '');
  const scoreOf = (r) => {
    if (!isOpen(r)) return 0;
    const ageH = Math.max(0, (now() - +r.created) / HOUR);
    const crowd = Math.min((r.count - 1) * 4, 12); // each extra resident who reported it
    return Math.min(100, Math.round(SEV[r.sev].w + CAT[r.cat].urg + Math.min(ageH / 8, 14) + crowd));
  };
  function dueOf(r) {
    const diff = deadlineOf(r) - now();
    return { over: diff < 0, text: spanStr(diff), sub: diff < 0 ? 'gecikib' : 'qalıb' };
  }

  /* ------------------------------------------------------------ state */

  const emptyFix = () => ({ file: null, url: null, verdict: null, verifying: false, error: null, manual: false });
  const emptyProof = () => ({ before: null, beforeUrl: null, after: null, afterUrl: null });

  const state = {
    role: ROLES[LS.get('role')] ? LS.get('role') : 'manager',
    view: null,
    sel: null,
    backView: null,
    filters: { sev: 'all', cat: 'all', status: 'open', dept: 'all', q: '' },
    sort: { key: 'score', dir: 'desc' },
    mapCat: 'all',
    mapRegion: null,
    mapDistrict: null,
    mapSel: null,
    range: 'week',
    fbFilter: 'all',
    fix: emptyFix(),
    proof: emptyProof(),
    busy: null,
    pop: null,
    conn: 'connecting',
    loaded: false,
    loadError: null,
    meta: { auth: false, signedIn: true, ai: false, maxUploadMb: 12 },
    notify: { newReport: true, overdue: true, ...LS.get('notify', {}) },
    lastSeen: LS.get('lastSeen', 0),
  };

  let REPORTS = [];
  let FEEDBACK = [];
  let internalNav = false;
  const role = () => ROLES[state.role];

  function scopeOf(list) {
    const r = role();
    if (state.role === 'worker') {
      return list.filter((x) => x.dept === r.dept && ['approved', 'in_progress', 'proof'].includes(x.status) && (!x.worker || x.worker === r.name));
    }
    if (state.role === 'head') return list.filter((x) => x.dept === r.dept);
    return list;
  }
  /** Sample reports (npm run seed:demo) only feed the analytics page. */
  const isSample = (r) => r.source === 'demo';
  const scoped = () => scopeOf(REPORTS.filter((r) => !isSample(r)));
  const scopedWithSamples = () => scopeOf(REPORTS);
  const findReport = (id) => REPORTS.find((r) => r.id === String(id));

  function filtered() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase().replace(/^#/, '');
    const rows = scoped().filter((r) => {
      if (f.sev !== 'all' && r.sev !== f.sev) return false;
      if (f.cat !== 'all' && r.cat !== f.cat) return false;
      if (f.status === 'open' && !isOpen(r)) return false;
      if (f.status !== 'open' && f.status !== 'all' && r.status !== f.status) return false;
      if (f.dept !== 'all' && r.dept !== f.dept) return false;
      if (q) {
        const hay = `${r.id} ${r.title} ${r.addr} ${r.explanation} ${r.reporter}`.toLowerCase();
        if (!(r.id === q || hay.includes(q))) return false;
      }
      return true;
    });
    const { key, dir } = state.sort;
    const m = dir === 'asc' ? 1 : -1;
    const val = {
      score: scoreOf,
      deadline: deadlineOf,
      created: (r) => +r.created,
      sev: (r) => SEV[r.sev].w,
      status: (r) => Object.keys(ST).indexOf(r.status),
      conf: (r) => r.conf ?? -1,
      title: (r) => r.title.toLowerCase(),
      dept: (r) => r.dept,
    }[key] || scoreOf;
    return rows.sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av === bv) return +b.created - +a.created;
      return av > bv ? m : -m;
    });
  }

  /* ------------------------------------------------------ small parts */

  const catIcon = (cat) => I[(CAT[cat] || CAT.other).icon];
  const reportHref = (id) => `#/report/${encodeURIComponent(id)}`;

  function photo(url, r, alt = '') {
    if (url) return `<div class="ph"><img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async" data-cat="${r.cat}"></div>`;
    return `<div class="ph ph--empty" aria-hidden="true">${catIcon(r.cat)}</div>`;
  }

  const statusTag = (r) => `<span class="status status--${r.status}">${ST[r.status].name}</span>`;
  const sevMark = (r) => `<span class="sev sev--${r.sev}"><span class="sev__bars"><i></i><i></i><i></i><i></i></span>${SEV[r.sev].name}</span>`;
  const overTag = () => '<span class="status status--over">Gecikib</span>';

  function stars(n, size = 14) {
    let h = '';
    for (let i = 1; i <= 5; i += 1) h += `<span class="${i <= n ? 'is-on' : ''}">${I.starFill}</span>`;
    return `<span class="stars" style="font-size:${size}px" aria-label="${n} ulduz">${h}</span>`;
  }

  const meter = (pct) => `<div class="meter"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;

  function pageHead({ eyebrow, icon, title, sub, actions }) {
    return `<header class="page-head">
      <div class="page-head__text">
        ${eyebrow ? `<span class="page-eyebrow">${icon ? I[icon] : ''}${eyebrow}</span>` : ''}
        <h1 class="page-title">${title}</h1>
        ${sub ? `<p class="page-sub">${sub}</p>` : ''}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </header>`;
  }

  function panel({ title, icon, sub, action, body, cls = '' }) {
    return `<section class="panel rise ${cls}">
      ${title ? `<div class="panel-head"><div class="panel-head__text"><h2 class="panel-title">${icon ? I[icon] : ''}${title}</h2>${sub ? `<p class="panel-sub">${sub}</p>` : ''}</div>${action || ''}</div>` : ''}
      ${body}
    </section>`;
  }

  function stat({ label, value, unit, icon, tone, foot, go }) {
    const tag = go ? 'a' : 'div';
    const attrs = go ? ` href="#/${go}" data-go="${go}"` : '';
    const shown = typeof value === 'number' ? `<span data-count="${value}">${num(value)}</span>` : value;
    return `<${tag} class="stat"${attrs}>
      <div class="stat__top"><span class="stat__icon${tone ? ` stat__icon--${tone}` : ''}">${I[icon]}</span><span class="stat__label">${label}</span></div>
      <div class="stat__value">${shown}${unit ? `<small>${unit}</small>` : ''}</div>
      ${foot ? `<div class="stat__foot">${foot}</div>` : ''}
    </${tag}>`;
  }

  const empty = ({ icon = 'inbox', title, body, action }) =>
    `<div class="empty rise"><span class="empty__icon">${I[icon]}</span><h3>${title}</h3>${body ? `<p>${body}</p>` : ''}${action || ''}</div>`;

  function seg(key, options, value) {
    return `<div class="seg" role="group" data-seggroup="${key}"><span class="navfill" data-fill="seg-${key}"></span>${options
      .map((o) => `<button type="button" class="${o.value === value ? 'is-active' : ''}" aria-pressed="${o.value === value}" data-seg="${key}" data-val="${esc(o.value)}">${o.label}</button>`)
      .join('')}</div>`;
  }

  /** A report as a Veritas project row. With `onMap`, picking it selects the pin. */
  function prow(r, { onMap = false } = {}) {
    const d = dueOf(r);
    const attrs = onMap ? `href="${reportHref(r.id)}" data-mapsel="${esc(r.id)}"` : `href="${reportHref(r.id)}" data-open="${esc(r.id)}"`;
    return `<a class="v-prow" ${attrs}>
      <div class="v-prow__img">${photo(r.imageUrl, r)}</div>
      <div class="v-prow__body">
        <div class="v-prow__title">${esc(r.title)}</div>
        <div class="v-prow__meta">${I.pin}<span>${esc(r.addr || 'Ünvan göstərilməyib')}</span><span>·</span><span class="mono">#${esc(r.id)}</span>${countTag(r)}</div>
      </div>
      <div class="v-prow__extra">${statusTag(r)}${isOpen(r) ? `<span class="${d.over ? 'is-over' : ''}">${d.text} ${d.sub}</span>` : `<span>${ageStr(r.created)}</span>`}</div>
    </a>`;
  }

  /** A report as a Veritas project card. */
  function pcard(r) {
    const d = dueOf(r);
    return `<a class="v-pcard" href="${reportHref(r.id)}" data-open="${esc(r.id)}">
      <span class="v-pcard__media">${photo(r.imageUrl, r, r.title)}<span class="v-pcard__cause">${catIcon(r.cat)}${CAT[r.cat].name}</span>${isOverdue(r) ? '<span class="v-pcard__done">Gecikib</span>' : ''}</span>
      <div class="v-pcard__body">
        <div class="v-pcard__title">${esc(r.title)}</div>
        <div class="v-pcard__place">${I.pin}<span>${esc(r.addr || 'Ünvan göstərilməyib')}</span></div>
        <div>${sevMark(r)}</div>
        <div class="v-pcard__foot"><span class="${d.over ? 'is-over' : ''}">${I.clock}<span><b>${d.text}</b> ${d.sub}</span></span>${statusTag(r)}</div>
      </div>
    </a>`;
  }

  function connectionNotice() {
    if (state.loadError && !state.loaded) {
      return `<div class="notice notice--stop rise"><span class="notice__icon">${I.wifiOff}</span><div class="notice__text"><strong>Məlumatları yükləmək alınmadı.</strong> ${esc(state.loadError)}. Yenidən cəhd edilir.</div><button class="btn btn--ghost" data-retry>Yenidən yoxla</button></div>`;
    }
    if (state.conn === 'offline' && state.loaded) {
      return `<div class="notice notice--warn rise"><span class="notice__icon">${I.wifiOff}</span><div class="notice__text">Canlı əlaqə kəsilib. Göstərilən məlumat son yüklənmə anına aiddir.</div><button class="btn btn--ghost" data-retry>Yenilə</button></div>`;
    }
    return '';
  }

  const skeleton = () => `${connectionNotice()}
    <div class="v-statrow">${'<div class="skel" style="height:136px"></div>'.repeat(4)}</div>
    <div class="cols cols--3-2"><div class="skel" style="height:380px"></div><div class="skel" style="height:380px"></div></div>`;

  /* ================================================================ VIEWS */

  function statusBar(all) {
    const parts = STAGES.map((s) => ({ ...s, n: all.filter((r) => s.has(r.status)).length }));
    const bar = parts.filter((p) => p.n).map((p) => `<i style="flex:${p.n};background:${p.color}" title="${p.name}: ${p.n}"></i>`).join('');
    const legend = parts.map((p) => `<span><i style="background:${p.color}"></i>${p.name} <b>${p.n}</b></span>`).join('');
    return `<div class="v-moneybar" role="img" aria-label="${parts.map((p) => `${p.name} ${p.n}`).join(', ')}">${bar}</div><div class="v-legend v-legend--console">${legend}</div>`;
  }

  function rankList(items, attr) {
    if (!items.length) return '<p class="v-empty">Hələ məlumat yoxdur.</p>';
    const top = Math.max(1, ...items.map((x) => x.n));
    return `<ol class="v-rank">${items
      .map(
        (x, i) => `<li><button type="button" class="v-rank__row" ${attr}="${esc(x.key)}">
          <span class="v-rank__n">${i + 1}</span>
          <span class="v-rank__name"><span>${esc(x.name)}</span><i style="width:${(x.n / top) * 100}%"></i></span>
          <span class="v-rank__val">${x.n}</span>
        </button></li>`,
      )
      .join('')}</ol>`;
  }

  function historyLabel(r, h) {
    if (h.kind === 'created') return { t: 'Müraciət qəbul edildi', m: SOURCE[(h.detail && h.detail.source) || r.source] || 'Mobil tətbiq' };
    if (h.kind === 'duplicate') return { t: 'Eyni problem yenidən bildirildi', m: [h.actor, SOURCE[h.detail && h.detail.source]].filter(Boolean).join(' · ') };
    if (h.kind === 'proof') return { t: 'Həll sübutu göndərildi', m: h.actor };
    if (h.kind === 'department') return { t: `Departament dəyişdi: ${(h.detail && h.detail.to) || ''}`, m: h.actor };
    if (h.kind === 'worker') return { t: h.detail && h.detail.worker ? `İcraçı təyin edildi: ${h.detail.worker}` : 'İcraçı götürüldü', m: h.actor };
    if (h.kind === 'status') {
      const v = h.detail && h.detail.verdict;
      const map = {
        approved: 'Təsdiqləndi',
        rejected: 'Rədd edildi',
        in_progress: h.from === 'proof' ? 'Sübut geri qaytarıldı, iş davam edir' : 'İşə başlanıldı',
        proof: 'Həll sübutu göndərildi',
        resolved: 'Həll edildi və bağlandı',
        pending: 'Yenidən baxışa qaytarıldı',
      };
      const extra = h.to === 'resolved' && v ? (v.manual ? 'əl ilə təsdiq' : `AI təsdiqi ${v.confidence}%`) : '';
      return { t: map[h.to] || 'Status dəyişdi', m: [h.actor, extra].filter(Boolean).join(' · ') };
    }
    return { t: 'Dəyişiklik', m: h.actor };
  }

  /* ------------------------------------------------------- overview */

  function viewOverview() {
    const r = role();
    const head = pageHead({
      eyebrow: r.dept || 'Xətai rayonu',
      icon: 'building',
      title: 'Ümumi baxış',
      actions: `<a class="btn btn--ghost" href="#/map" data-go="map">Xəritə</a><a class="btn btn--primary" href="#/queue" data-go="queue">${I.inbox}Növbəni aç</a>`,
    });
    if (!state.loaded) return head + skeleton();

    const all = scoped();
    const open = all.filter(isOpen);
    const pending = all.filter((x) => x.status === 'pending');
    const over = all.filter(isOverdue);
    const resolved = all.filter((x) => x.status === 'resolved');
    const new24 = all.filter((x) => now() - +x.created < DAY).length;
    const week = resolved.filter((x) => x.resolvedAt && now() - +x.resolvedAt < 7 * DAY).length;
    const oldest = pending.reduce((a, x) => (!a || x.created < a.created ? x : a), null);

    const stats = `<div class="v-statrow rise">
      ${stat({ label: 'Açıq müraciət', value: open.length, icon: 'inbox', tone: 'blue', go: 'queue', foot: new24 ? `Son 24 saatda ${new24} yeni` : 'Son 24 saatda yeni yoxdur' })}
      ${stat({ label: 'Təsdiq gözləyir', value: pending.length, icon: 'clock', foot: oldest ? `Ən köhnəsi ${ageStr(oldest.created)}` : 'Hamısına baxılıb' })}
      ${stat({ label: 'Gecikib', value: over.length, icon: 'alert', foot: over.length ? 'Son tarixi keçib' : 'Gecikən iş yoxdur' })}
      ${stat({ label: 'Həll edilib', value: resolved.length, icon: 'check', foot: `Bu həftə ${week}` })}
    </div>`;

    if (!all.length) {
      return `${head}${connectionNotice()}${stats}${empty({
        icon: 'phone',
        title: 'Hələ müraciət yoxdur',
      })}`;
    }

    const recent = [...all].sort((a, b) => b.created - a.created).slice(0, 5);
    const events = all
      .flatMap((x) => x.history.map((h) => ({ x, h })))
      .sort((a, b) => b.h.at - a.h.at)
      .slice(0, 6);
    const today = new Date();
    const feed = events.length
      ? `<ul class="v-feed">${events
          .map(({ x, h }) => {
            const at = new Date(h.at);
            const { t, m } = historyLabel(x, h);
            return `<li><time datetime="${at.toISOString()}">${sameDay(at, today) ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : fmtDay(at)}</time><div><a href="${reportHref(x.id)}" data-open="${esc(x.id)}">${esc(x.title)}</a><p>${esc(t)}${m ? ` · ${esc(m)}` : ''}</p></div></li>`;
          })
          .join('')}</ul>`
      : empty({ icon: 'newspaper', title: 'Hələ ki sakitdir' });
    const urgent = [...open].sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 3);

    return `${head}${connectionNotice()}${stats}
      ${panel({ title: 'Müraciətlər hansı mərhələdədir', icon: 'layers', body: statusBar(all) })}
      <div class="cols cols--3-2 rise">
        ${panel({ title: 'Son müraciətlər', icon: 'inbox', action: `<a class="link-btn" href="#/queue" data-go="queue">Hamısı${I.arrowR}</a>`, body: `<div class="v-plist">${recent.map((x) => prow(x)).join('')}</div>` })}
        ${panel({ title: 'Son yeniliklər', icon: 'newspaper', body: feed })}
      </div>
      ${urgent.length ? panel({ title: 'Təcili baxılmalı olanlar', icon: 'alert', body: `<div class="v-pgrid">${urgent.map(pcard).join('')}</div>` }) : ''}`;
  }

  /* ---------------------------------------------------------- queue */

  function toolbar() {
    const f = state.filters;
    const present = new Set(scoped().map((r) => r.cat));
    const sel = (key, opts, value, label) =>
      `<label class="v-select${value !== opts[0][0] ? ' is-set' : ''}"><select data-filter="${key}" aria-label="${label}">${opts
        .map(([v, l]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`)
        .join('')}</select></label>`;
    const cats = [['all', 'Bütün kateqoriyalar'], ...Object.keys(CAT).filter((k) => present.has(k)).map((k) => [k, CAT[k].name])];
    const sts = [['open', 'Açıq olanlar'], ['all', 'Bütün statuslar'], ...Object.keys(ST).map((k) => [k, ST[k].name])];
    const depts = [['all', 'Bütün departamentlər'], ...DEPTS.map((d) => [d, d])];
    return `<div class="toolbar rise">
      ${seg('sev', [{ value: 'all', label: 'Hamısı' }, ...Object.keys(SEV).map((k) => ({ value: k, label: SEV[k].name }))], f.sev)}
      ${sel('status', sts, f.status, 'Status')}
      ${sel('cat', cats, f.cat, 'Kateqoriya')}
      ${state.role === 'manager' ? sel('dept', depts, f.dept, 'Departament') : ''}
      ${f.q ? `<span class="qchip">“${esc(f.q)}”<button type="button" class="icon-btn" data-clear-q aria-label="Axtarışı sil">${I.x}</button></span>` : ''}
      <span class="toolbar__gap"></span>
      <span class="toolbar__count"><b>${filtered().length}</b> müraciət</span>
    </div>`;
  }

  function viewQueue() {
    const head = pageHead({
      eyebrow: 'Müraciətlər',
      icon: 'inbox',
      title: 'Müraciət növbəsi',
      actions: role().can.export ? `<button type="button" class="btn btn--ghost" data-export="csv">${I.download}CSV yüklə</button>` : '',
    });
    if (!state.loaded) return head + skeleton();
    const rows = filtered();
    const cols = [
      { k: 'title', l: 'Müraciət' },
      { k: 'sev', l: 'Ciddilik' },
      { k: 'status', l: 'Status' },
      { k: 'dept', l: 'Departament' },
      { k: 'conf', l: 'AI etibarı' },
      { k: 'score', l: 'Prioritet' },
      { k: 'deadline', l: 'Son tarix' },
    ];
    const ths = cols
      .map((c) => {
        const on = state.sort.key === c.k;
        return `<th class="sortable${on ? ' is-sorted' : ''}" data-sort="${c.k}" aria-sort="${on ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">${c.l}${on ? `<span class="caret">${state.sort.dir === 'asc' ? '▲' : '▼'}</span>` : ''}</th>`;
      })
      .join('');
    const body = rows
      .map((r) => {
        const d = dueOf(r);
        const open = isOpen(r);
        const sc = scoreOf(r);
        return `<tr class="${isOverdue(r) ? 'is-over' : ''}" data-open="${esc(r.id)}" tabindex="0">
          <td><div class="cell-main"><div class="cell-thumb">${photo(r.imageUrl, r)}</div><div><div class="cell-title">${esc(r.title)}</div><div class="cell-sub"><span class="mono">#${esc(r.id)}</span> · ${esc(r.addr || CAT[r.cat].name)}${countTag(r)}</div></div></div></td>
          <td>${sevMark(r)}</td>
          <td>${statusTag(r)}</td>
          <td><div class="cell-who"><b>${esc(r.worker || 'Təyin olunmayıb')}</b><span>${esc(r.dept)}</span></div></td>
          <td class="num">${r.conf != null ? `${r.conf}%` : '<span class="quiet">yoxdur</span>'}</td>
          <td>${open ? `<div class="prio${sc > 80 ? ' prio--hot' : ''}"><b>${sc}</b>${meter(sc)}</div>` : '<span class="quiet">bağlıdır</span>'}</td>
          <td>${open ? `<div class="due${d.over ? ' is-over' : ''}"><b>${d.text}</b><span>${d.sub}</span></div>` : `<div class="due"><b>${fmtDay(r.resolvedAt || new Date(r.updatedAt))}</b><span>${r.status === 'resolved' ? 'həll edilib' : 'bağlanıb'}</span></div>`}</td>
        </tr>`;
      })
      .join('');
    const content = rows.length
      ? `<section class="panel panel--flush rise"><div class="tbl-scroll qtable"><table class="tbl"><thead><tr>${ths}</tr></thead><tbody>${body}</tbody></table></div><div class="qlist">${rows.map((r) => prow(r)).join('')}</div></section>`
      : empty({
          icon: 'search',
          title: scoped().length ? 'Heç nə tapılmadı' : 'Hələ müraciət yoxdur',
          action: scoped().length ? '<button type="button" class="btn btn--ghost" data-clear-filters>Filtrləri sıfırla</button>' : '',
        });
    return `${head}${connectionNotice()}${toolbar()}${content}`;
  }

  /* ------------------------------------------------------------ map */

  let MAP = null;
  let MINI = null;

  const mapReports = () => scoped().filter((r) => r.hasLoc && r.status !== 'rejected' && (state.mapCat === 'all' || r.cat === state.mapCat));

  /** The place a report is counted under on the map: its Baku district, or else its region. */
  const areaOf = (r) => (r.district ? { type: 'district', key: r.district } : r.region ? { type: 'region', key: r.region } : null);

  function toPin(r) {
    return {
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      title: r.title,
      sub: `${ST[r.status].name}${isOverdue(r) ? ' · gecikib' : ''} · ${CAT[r.cat].name}`,
      w: SEV[r.sev].pin,
      state: !isOpen(r) ? 'done' : isOverdue(r) ? 'over' : 'open',
    };
  }

  function mapChips() {
    const rows = scoped().filter((r) => r.hasLoc && r.status !== 'rejected');
    const cats = Object.keys(CAT).filter((k) => rows.some((r) => r.cat === k));
    return `<div class="v-chips v-mapgrid__chips" role="group" aria-label="Kateqoriya üzrə süzgəc" id="mapChips">
      <button type="button" class="v-chip${state.mapCat === 'all' ? ' on' : ''}" data-mapcat="all" aria-pressed="${state.mapCat === 'all'}">Bütün kateqoriyalar</button>
      ${cats.map((k) => `<button type="button" class="v-chip${state.mapCat === k ? ' on' : ''}" data-mapcat="${k}" aria-pressed="${state.mapCat === k}">${catIcon(k)}${CAT[k].name}</button>`).join('')}
    </div>`;
  }

  function viewMap() {
    const head = pageHead({
      eyebrow: 'Xətai rayonu',
      icon: 'map',
      title: 'Xəritə',
    });
    if (!state.loaded) return head + skeleton();
    return `${head}${connectionNotice()}
      <div class="v-mapgrid rise">
        <div class="v-mapgrid__map">
          ${mapChips()}
          <div id="mapHost"></div>
          <div class="v-mapgrid__keys" aria-hidden="true">
            <span><i style="background:var(--blue)"></i>Açıq</span>
            <span><i style="background:#a4433a"></i>Gecikib</span>
            <span><i style="background:#fff"></i>Həll edilib</span>
          </div>
          <p class="v-mapgrid__hint">Rayon sərhədləri: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap iştirakçıları</a>, <a href="https://www.geoboundaries.org" target="_blank" rel="noopener">geoBoundaries</a> (CC BY-SA 3.0)</p>
        </div>
        <aside class="v-mapgrid__side" id="mapSide" aria-live="polite">${mapSide()}</aside>
      </div>`;
  }

  function areaCard({ title, sub, here, back }) {
    const open = here.filter(isOpen);
    const list = [...open.sort((a, b) => scoreOf(b) - scoreOf(a)), ...here.filter((r) => !isOpen(r))].slice(0, 8);
    return `<div class="v-regioncard">
        <button type="button" class="v-back" ${back}>${I.arrowL}Bütün ərazilər</button>
        <h2>${esc(title)}</h2>
        <p class="v-regioncard__az">${sub}</p>
        <dl class="v-stats">
          <div><dt>Açıq</dt><dd>${open.length}</dd></div>
          <div><dt>Gecikib</dt><dd>${here.filter(isOverdue).length}</dd></div>
          <div><dt>Həll edilib</dt><dd>${here.filter((r) => r.status === 'resolved').length}</dd></div>
          <div><dt>Cəmi</dt><dd>${here.length}</dd></div>
        </dl>
        <div class="v-regioncard__list">${list.length ? list.map((r) => prow(r, { onMap: true })).join('') : '<p class="v-empty">Burada hələ müraciət yoxdur.</p>'}</div>
      </div>`;
  }

  function mapSide() {
    const rows = mapReports();
    const live = state.conn === 'live'
      ? '<span class="v-live__badge"><i></i>Canlı</span>'
      : '<span class="v-live__badge v-live__badge--off"><i></i>Əlaqə yoxdur</span>';

    const sel = state.mapSel && findReport(state.mapSel);
    if (sel) {
      const r = sel;
      const d = dueOf(r);
      const backTo = state.mapDistrict ? DISTRICT_NAME[state.mapDistrict] : state.mapRegion ? REGION_NAME[state.mapRegion] : 'Bütün ərazilər';
      return `<div class="v-regioncard">
        <button type="button" class="v-back" data-mapback>${I.arrowL}${esc(backTo)}</button>
        <div class="v-regioncard__photo">${photo(r.imageUrl, r, r.title)}</div>
        <div class="dp-tags">${statusTag(r)}${sevMark(r)}</div>
        <h2>${esc(r.title)}</h2>
        <p class="v-regioncard__where">${I.pin}<span>${esc(r.addr || 'Ünvan göstərilməyib')}${placeName(r) ? ` · ${esc(placeName(r))}` : ''}</span></p>
        <dl class="v-stats">
          <div><dt>Kateqoriya</dt><dd class="is-text">${CAT[r.cat].name}</dd></div>
          <div><dt>Daxil olub</dt><dd class="is-text">${ageStr(r.created)}</dd></div>
          <div><dt>${isOpen(r) ? 'Son tarix' : 'Status'}</dt><dd class="is-text" style="${d.over && isOpen(r) ? 'color:#a4433a' : ''}">${isOpen(r) ? `${d.text} ${d.sub}` : ST[r.status].name}</dd></div>
          <div><dt>Prioritet</dt><dd>${isOpen(r) ? scoreOf(r) : '<span class="quiet" style="font-size:15px">bağlıdır</span>'}</dd></div>
        </dl>
        <a class="btn btn--primary btn--block" href="${reportHref(r.id)}" data-open="${esc(r.id)}">Müraciəti aç${I.arrowR}</a>
      </div>`;
    }

    if (state.mapDistrict) {
      const key = state.mapDistrict;
      return areaCard({ title: DISTRICT_NAME[key] || key, sub: 'Bakı şəhərinin rayonu', here: rows.filter((r) => r.district === key), back: 'data-mapregion=""' });
    }
    if (state.mapRegion) {
      const key = state.mapRegion;
      return areaCard({ title: REGION_NAME[key] || key, sub: 'iqtisadi rayonu', here: rows.filter((r) => r.region === key), back: 'data-mapregion=""' });
    }

    const open = rows.filter(isOpen);
    const over = open.filter(isOverdue);
    const areas = {};
    for (const r of open) {
      const a = areaOf(r);
      if (!a) continue;
      const id = `${a.type}:${a.key}`;
      if (!areas[id]) areas[id] = { ...a, n: 0, name: a.type === 'district' ? `${DISTRICT_NAME[a.key]}, Bakı` : REGION_NAME[a.key] };
      areas[id].n += 1;
    }
    const ranked = Object.values(areas).sort((a, b) => b.n - a.n);
    const top = Math.max(1, ...ranked.map((x) => x.n));
    const rank = ranked.length
      ? `<ol class="v-rank">${ranked
          .map(
            (x, i) => `<li><button type="button" class="v-rank__row" ${x.type === 'district' ? 'data-mapdistrict' : 'data-mapregion'}="${esc(x.key)}">
              <span class="v-rank__n">${i + 1}</span>
              <span class="v-rank__name"><span>${esc(x.name)}</span><i style="width:${(x.n / top) * 100}%"></i></span>
              <span class="v-rank__val">${x.n}</span>
            </button></li>`,
          )
          .join('')}</ol>`
      : '';
    return `<div class="v-live">${live}</div>
      <dl class="v-stats v-stats--three">
        <div><dt>Açıq</dt><dd>${open.length}</dd></div>
        <div><dt>Gecikib</dt><dd${over.length ? ' class="is-over"' : ''}>${over.length}</dd></div>
        <div><dt>Həll edilib</dt><dd>${rows.filter((r) => r.status === 'resolved').length}</dd></div>
      </dl>
      ${rank}`;
  }

  function mountMap() {
    const host = $('#mapHost');
    if (!host) return;
    unmountMap();
    MAP = window.CivicMap.create(host, {
      ariaLabel: 'Müraciətlərin xəritəsi',
      onPick: (id) => selectReport(id),
    });
    drawMap();
    const sel = state.mapSel && findReport(state.mapSel);
    if (sel && sel.hasLoc) MAP.select(sel.id, { fly: false }).center(sel.lng, sel.lat, 16);
    else if (state.mapDistrict) MAP.showArea('district', state.mapDistrict);
    else if (state.mapRegion) MAP.showArea('region', state.mapRegion);
  }

  function unmountMap() {
    if (MAP) {
      MAP.destroy();
      MAP = null;
    }
  }

  function drawMap() {
    if (!MAP) return;
    MAP.setReports(mapReports().map(toPin));
  }

  function updateMapSide() {
    const side = $('#mapSide');
    if (side) side.innerHTML = mapSide();
  }

  function selectRegion(key) {
    state.mapRegion = key || null;
    state.mapDistrict = null;
    state.mapSel = null;
    if (MAP) MAP.select(null, { fly: false }).showArea(key ? 'region' : null, key);
    updateMapSide();
  }

  function selectDistrict(key) {
    state.mapDistrict = key || null;
    state.mapRegion = key ? 'baku' : null;
    state.mapSel = null;
    if (MAP) MAP.select(null, { fly: false }).showArea(key ? 'district' : null, key);
    updateMapSide();
  }

  function selectReport(id) {
    const r = id && findReport(id);
    state.mapSel = r ? r.id : null;
    if (r && r.district && !state.mapDistrict) state.mapDistrict = r.district;
    if (r && r.region && !state.mapRegion) state.mapRegion = r.region;
    if (MAP) {
      if (state.mapDistrict) MAP.showArea('district', state.mapDistrict, { fit: false });
      MAP.select(state.mapSel);
    }
    updateMapSide();
  }

  function mapBack() {
    state.mapSel = null;
    if (state.mapDistrict) return selectDistrict(state.mapDistrict);
    return selectRegion(state.mapRegion);
  }

  function mountMini(r) {
    const host = $('#miniMap');
    if (!host || !r || !r.hasLoc) return;
    unmountMini();
    MINI = window.CivicMap.create(host, { compact: true, ariaLabel: `${r.title}: yeri` });
    MINI.setReports([toPin(r)]).select(r.id, { fly: false }).center(r.lng, r.lat, 15.5);
  }

  function unmountMini() {
    if (MINI) {
      MINI.destroy();
      MINI = null;
    }
  }

  /* ---------------------------------------------------------- tasks */

  function viewTasks() {
    const r = role();
    const head = pageHead({
      eyebrow: r.dept,
      icon: 'clipboard',
      title: 'Tapşırıqlarım',
    });
    if (!state.loaded) return head + skeleton();
    const rows = scoped().sort((a, b) => deadlineOf(a) - deadlineOf(b));
    if (!rows.length) return `${head}${connectionNotice()}${empty({ icon: 'check', title: 'Hazırda iş yoxdur' })}`;
    return `${head}${connectionNotice()}<div class="v-pgrid rise">${rows.map(pcard).join('')}</div>`;
  }

  /* ------------------------------------------------------ analytics */

  function dailyChart(all, days = 14) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const first = start.getTime() - (days - 1) * DAY;
    const buckets = Array.from({ length: days }, (_, i) => ({ d: new Date(first + i * DAY), n: 0 }));
    for (const r of all) {
      const idx = Math.floor((+r.created - first) / DAY);
      if (idx >= 0 && idx < days) buckets[idx].n += 1;
    }
    const max = Math.max(4, ...buckets.map((b) => b.n));
    const Wc = 640;
    const Hc = 210;
    const top = 20;
    const bottom = 26;
    const slot = Wc / days;
    const bw = Math.min(28, slot * 0.58);
    const y = (v) => top + (Hc - top - bottom) * (1 - v / max);
    const grid = [0, 0.5, 1].map((t) => `<line x1="0" x2="${Wc}" y1="${y(max * t).toFixed(1)}" y2="${y(max * t).toFixed(1)}"/>`).join('');
    const bars = buckets
      .map((b, i) => {
        const x = i * slot + (slot - bw) / 2;
        const h = Math.max(b.n ? 3 : 0, Hc - bottom - y(b.n));
        const today = i === days - 1;
        const label = today ? 'Bu gün' : fmtDay(b.d);
        return `<g class="bar-g${today ? ' is-today' : ''}" data-n="${b.n}" data-label="${label}" tabindex="0" role="img" aria-label="${label}: ${b.n} müraciət">
          <rect class="hit" x="${(i * slot).toFixed(1)}" y="0" width="${slot.toFixed(1)}" height="${Hc - bottom}"/>
          <rect class="bar" x="${x.toFixed(1)}" y="${(Hc - bottom - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="5"/>
          ${b.n ? `<text class="val" x="${(x + bw / 2).toFixed(1)}" y="${(Hc - bottom - h - 6).toFixed(1)}" text-anchor="middle">${b.n}</text>` : ''}
          ${i % 2 === (days - 1) % 2 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${Hc - 6}" text-anchor="middle">${today ? 'Bu gün' : b.d.getDate()}</text>` : ''}</g>`;
      })
      .join('');
    return { total: buckets.reduce((s, b) => s + b.n, 0), svg: `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${Wc} ${Hc}" aria-label="Son ${days} gündə gündəlik müraciət sayı"><g class="grid">${grid}</g>${bars}</svg><div class="chart-tip" hidden></div></div>` };
  }

  function viewAnalytics() {
    const head = pageHead({
      eyebrow: 'Göstəricilər',
      icon: 'chart',
      title: 'Analitika',
      actions: REPORTS.some(isSample) ? '<span class="chip">Nümunə məlumat daxildir</span>' : '',
    });
    if (!state.loaded) return head + skeleton();
    const all = scopedWithSamples();
    if (!all.length) return `${head}${connectionNotice()}${empty({ icon: 'chart', title: 'Hələ məlumat yoxdur' })}`;
    const resolved = all.filter((r) => r.status === 'resolved');
    const timed = resolved.filter((r) => r.resolvedAt);
    const avgMs = timed.length ? timed.reduce((s, r) => s + (+r.resolvedAt - +r.created), 0) / timed.length : null;
    const onTime = timed.filter((r) => +r.resolvedAt <= deadlineOf(r)).length;
    const avg = avgMs == null ? null : avgMs < 48 * HOUR ? { v: Math.max(1, Math.round(avgMs / HOUR)), u: 'saat' } : { v: Math.round(avgMs / DAY), u: 'gün' };

    const stats = `<div class="v-statrow rise">
      ${stat({ label: 'Ümumi müraciət', value: all.length, icon: 'inbox', tone: 'blue', foot: `Açıq: ${all.filter(isOpen).length}` })}
      ${stat({ label: 'Həll edilib', value: resolved.length, icon: 'check', foot: `Ümumi sayın ${Math.round((resolved.length / all.length) * 100)}%-i` })}
      ${stat({ label: 'Orta həll müddəti', value: avg ? avg.v : 'Hələ yoxdur', unit: avg ? avg.u : '', icon: 'clock', foot: avg ? `${timed.length} bağlanmış iş üzrə` : 'Bağlanmış iş yoxdur' })}
      ${stat({ label: 'Vaxtında həll', value: timed.length ? Math.round((onTime / timed.length) * 100) : 'Hələ yoxdur', unit: timed.length ? '%' : '', icon: 'shield', foot: timed.length ? `${onTime} iş son tarixdən əvvəl` : 'Bağlanmış iş yoxdur' })}
    </div>`;

    const chart = dailyChart(all);
    const statusRows = Object.keys(ST)
      .map((k) => {
        const n = all.filter((r) => r.status === k).length;
        return `<div class="srow"><span class="srow__name">${statusTag({ status: k })}</span><span class="srow__val">${n} · ${Math.round((n / all.length) * 100)}%</span>${meter((n / all.length) * 100)}</div>`;
      })
      .join('');
    const deptRows = DEPTS.map((d) => {
      const rows = all.filter((r) => r.dept === d);
      return { d, n: rows.length, open: rows.filter(isOpen).length, over: rows.filter(isOverdue).length, done: rows.filter((r) => r.status === 'resolved').length };
    })
      .filter((x) => x.n)
      .sort((a, b) => b.open - a.open);
    const deptTable = `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Departament</th><th class="right">Açıq</th><th class="right">Gecikib</th><th class="right">Həll edilib</th></tr></thead><tbody>${deptRows
      .map((x) => `<tr data-fdept-row="${esc(x.d)}"><td class="strong">${esc(x.d)}</td><td class="right num">${x.open}</td><td class="right num" style="${x.over ? 'color:#a4433a' : ''}">${x.over}</td><td class="right num">${x.done}</td></tr>`)
      .join('')}</tbody></table></div>`;
    const byCat = Object.keys(CAT)
      .map((k) => ({ key: k, name: CAT[k].name, n: all.filter((r) => r.cat === k).length }))
      .filter((x) => x.n)
      .sort((a, b) => b.n - a.n);

    return `${head}${connectionNotice()}${stats}
      <div class="cols cols--3-2 cols--stretch rise">
        ${panel({ title: 'Gündəlik müraciətlər', icon: 'trend', sub: `Son 14 gündə ${chart.total} müraciət`, body: chart.svg })}
        ${panel({ title: 'Status bölgüsü', icon: 'layers', body: statusRows })}
      </div>
      <div class="cols cols--3-2 rise">
        ${panel({ title: 'Departamentlər', icon: 'building', cls: 'panel--flush', body: deptTable })}
        ${panel({ title: 'Kateqoriyalar', icon: 'grid', body: rankList(byCat, 'data-fcat') })}
      </div>`;
  }

  /* -------------------------------------------------------- reports */

  function rangeRows() {
    const all = scoped();
    if (state.range === 'all') return all;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (state.range === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    else start.setDate(1);
    return all.filter((r) => r.created >= start);
  }

  function viewReports() {
    const head = pageHead({
      eyebrow: 'İxrac',
      icon: 'file',
      title: 'Hesabatlar',
      actions: seg('range', [{ value: 'week', label: 'Bu həftə' }, { value: 'month', label: 'Bu ay' }, { value: 'all', label: 'Hamısı' }], state.range),
    });
    if (!state.loaded) return head + skeleton();
    const rows = rangeRows().sort((a, b) => b.created - a.created);
    const stats = `<div class="v-statrow v-statrow--3 rise">
      ${stat({ label: 'Müraciət', value: rows.length, icon: 'inbox', tone: 'blue' })}
      ${stat({ label: 'Həll edilib', value: rows.filter((r) => r.status === 'resolved').length, icon: 'check' })}
      ${stat({ label: 'Açıq', value: rows.filter(isOpen).length, icon: 'clock' })}
    </div>`;
    const exp = `<div class="row-list">
      <button type="button" class="row-item" data-export="csv" ${rows.length ? '' : 'disabled'}><span class="row-item__mark row-item__mark--blue">${I.sheet}</span><span class="row-item__body"><span class="row-item__title">Excel cədvəli (CSV)</span><span class="row-item__meta">${rows.length} sətir, bütün sahələrlə</span></span>${I.download}</button>
      <button type="button" class="row-item" data-export="print" ${rows.length ? '' : 'disabled'}><span class="row-item__mark">${I.printer}</span><span class="row-item__body"><span class="row-item__title">Çap və ya PDF</span><span class="row-item__meta">Önizləmədəki cədvəl çap olunur</span></span>${I.arrowR}</button>
    </div>`;
    const table = rows.length
      ? `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>İD</th><th>Müraciət</th><th>Status</th><th>Departament</th><th>Daxil olub</th></tr></thead><tbody>${rows
          .map((r) => `<tr data-open="${esc(r.id)}" tabindex="0"><td class="mono">#${esc(r.id)}</td><td><div class="cell-title" style="max-width:320px">${esc(r.title)}</div></td><td>${statusTag(r)}</td><td>${esc(r.dept)}</td><td class="num">${fmtDate(r.created)}</td></tr>`)
          .join('')}</tbody></table></div>`
      : '<div class="empty"><span class="empty__icon">' + I.file + '</span><h3>Bu dövrdə müraciət yoxdur</h3><p>Başqa dövr seçin.</p></div>';
    return `${head}${connectionNotice()}${stats}
      <div class="cols cols--2-3 rise">
        ${panel({ title: 'Formatı seçin', icon: 'download', body: exp })}
        ${panel({ title: 'Önizləmə', icon: 'eye', sub: `${rows.length} müraciət`, cls: rows.length ? 'panel--flush' : '', body: table })}
      </div>`;
  }

  /* ------------------------------------------------------- feedback */

  function viewFeedback() {
    const head = pageHead({
      eyebrow: 'Məmnuniyyət',
      icon: 'star',
      title: 'Vətəndaş rəyləri',
    });
    if (!state.loaded) return head + skeleton();
    const all = FEEDBACK;
    if (!all.length) return `${head}${connectionNotice()}${empty({ icon: 'star', title: 'Hələ rəy yoxdur' })}`;
    const avg = all.reduce((s, f) => s + f.rating, 0) / all.length;
    const avgText = avg.toFixed(1).replace('.', ',');
    const positive = Math.round((all.filter((f) => f.rating >= 4).length / all.length) * 100);
    const stats = `<div class="v-statrow v-statrow--3 rise">
      ${stat({ label: 'Orta qiymət', value: avgText, unit: '/ 5', icon: 'star', tone: 'blue' })}
      ${stat({ label: 'Ümumi rəy', value: all.length, icon: 'inbox' })}
      ${stat({ label: 'Müsbət rəy', value: positive, unit: '%', icon: 'check', foot: '4 və 5 ulduz' })}
    </div>`;
    const dist = [5, 4, 3, 2, 1]
      .map((s) => {
        const n = all.filter((f) => f.rating === s).length;
        const pct = Math.round((n / all.length) * 100);
        return `<div class="srow"><span class="srow__name">${stars(s, 13)}</span><span class="srow__val">${n} · ${pct}%</span>${meter(pct)}</div>`;
      })
      .join('');
    const rows = state.fbFilter === 'all' ? all : all.filter((f) => f.rating === Number(state.fbFilter));
    const list = rows.length
      ? rows
          .map((f) => {
            const rep = f.reportId && findReport(f.reportId);
            return `<article class="fb">
              <div class="fb__head">${stars(f.rating, 15)}<span>${ageStr(f.created)}</span></div>
              <p class="fb__text${f.comment ? '' : ' fb__text--empty'}">${f.comment ? esc(f.comment) : 'Şərh yazılmayıb'}</p>
              <div class="fb__foot"><span class="fb__who"><span class="avatar avatar--sm">${esc(initials(f.reporter))}</span>${esc(f.reporter)}</span>
                ${f.category ? `<span class="quiet">${esc(f.category)}</span>` : ''}
                ${f.reportId ? (rep ? `<a class="link-btn" href="${reportHref(f.reportId)}" data-open="${esc(f.reportId)}">Müraciət #${esc(f.reportId)}${I.arrowR}</a>` : `<span class="quiet">Müraciət #${esc(f.reportId)}</span>`) : ''}
              </div>
            </article>`;
          })
          .join('')
      : '<p class="v-empty">Bu qiymətdə rəy yoxdur.</p>';
    return `${head}${connectionNotice()}${stats}
      <div class="cols cols--2-3 rise">
        ${panel({ title: 'Qiymət bölgüsü', icon: 'chart', body: `<div class="bigscore"><div class="bigscore__num">${avgText}<small> / 5</small></div>${stars(Math.round(avg), 20)}</div>${dist}` })}
        ${panel({
          title: 'Rəylər',
          icon: 'star',
          action: seg('fbFilter', [{ value: 'all', label: 'Hamısı' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ★` }))], state.fbFilter),
          body: list,
        })}
      </div>`;
  }

  /* ------------------------------------------------------- settings */

  function viewSettings() {
    const r = role();
    const sw = (key, title, sub) =>
      `<div class="setrow"><div><div class="setrow__t">${title}</div><div class="setrow__s">${sub}</div></div><button type="button" class="switch${state.notify[key] ? ' is-on' : ''}" role="switch" aria-checked="${state.notify[key]}" data-notify="${key}" aria-label="${title}"></button></div>`;
    const roles = Object.entries(ROLES)
      .map(
        ([k, x]) => `<button type="button" class="row-item${state.role === k ? ' is-on' : ''}" data-role="${k}">
          <span class="avatar">${x.init}</span>
          <span class="row-item__body"><span class="row-item__title">${x.name}</span><span class="row-item__meta">${x.title}${x.dept ? ` · ${x.dept}` : ''}</span></span>
          ${state.role === k ? `<span class="popover__check">${I.check}</span>` : ''}
        </button>`,
      )
      .join('');
    const access = r.can.approve ? (r.dept ? `Departament: ${r.dept}` : 'Bütün rayon üzrə tam giriş') : 'Sahə işləri: yalnız öz tapşırıqları';
    return `${pageHead({ eyebrow: 'Hesab', icon: 'user', title: 'Parametrlər' })}
      <div class="cols cols--2 rise">
        <div class="stack">
          ${panel({ title: 'Profil', icon: 'user', body: `<div class="profile"><span class="avatar avatar--lg">${r.init}</span><div><div class="profile__name">${r.name}</div><div class="profile__role">${r.title}</div></div></div><div class="hint hint--blue" style="margin-top:16px">${I.shield}${access}</div>` })}
          ${panel({ title: 'Bildirişlər', icon: 'bell', body: `${sw('newReport', 'Yeni müraciət gələndə xəbər ver', 'Ekranın küncündə qısa bildiriş görünür')}${sw('overdue', 'Gecikən işləri zəngdə göstər', 'Son tarixi keçən müraciətlər bildirişlərə düşür')}` })}
          ${state.meta.auth ? panel({ title: 'Sessiya', icon: 'key', body: `<p class="muted" style="margin-bottom:14px;font-size:14px">Bu cihazda panelə giriş açıqdır.</p><button type="button" class="btn btn--danger" data-logout>${I.logout}Çıxış</button>` }) : ''}
        </div>
        ${panel({ title: 'Rol', icon: 'swap', body: `<div class="rolepick">${roles}</div>` })}
      </div>`;
  }

  /* --------------------------------------------------------- detail */

  function timeline(r) {
    const items = r.history.map((h) => {
      const { t, m } = historyLabel(r, h);
      const tone = h.to === 'rejected' ? 'is-stop' : h.to === 'resolved' ? 'is-ok' : 'is-done';
      return `<div class="tl ${tone}"><span class="tl__dot">${h.to === 'rejected' ? I.x : I.check}</span><div><div class="tl__title">${esc(t)}</div><div class="tl__meta">${fmtDate(new Date(h.at))}${m ? ` · ${esc(m)}` : ''}</div></div></div>`;
    });
    const next = {
      pending: 'Rəhbərin qərarı gözlənilir',
      approved: 'İcraçı işə başlamalıdır',
      in_progress: 'Həll sübutu gözlənilir',
      proof: 'Rəhbər sübutu yoxlamalıdır',
    }[r.status];
    if (next) items.push(`<div class="tl is-next"><span class="tl__dot"></span><div><div class="tl__title">${next}</div><div class="tl__meta">Son tarix: ${fmtDate(new Date(deadlineOf(r)))}</div></div></div>`);
    return `<div class="timeline">${items.join('')}</div>`;
  }

  function viewDetail() {
    const back = '<button type="button" class="v-back" data-back>' + I.arrowL + 'Geri</button>';
    if (!state.loaded) return back + skeleton();
    const r = findReport(state.sel);
    if (!r) {
      return `${back}${empty({ icon: 'search', title: 'Müraciət tapılmadı', body: `#${esc(state.sel)} nömrəli müraciət yoxdur və ya silinib.`, action: '<a class="btn btn--ghost" href="#/queue" data-go="queue">Növbəyə qayıt</a>' })}`;
    }
    const head = pageHead({
      eyebrow: `<span class="mono">#${esc(r.id)}</span>&nbsp;·&nbsp;${CAT[r.cat].name}${countTag(r)}`,
      icon: CAT[r.cat].icon,
      title: esc(r.title),
      sub: `${esc(r.addr || 'Ünvan göstərilməyib')} · ${fmtDate(r.created)}`,
      actions: `<div class="dp-tags">${sevMark(r)}${statusTag(r)}${isOverdue(r) ? overTag() : ''}</div>`,
    });
    const after = r.fixedImageUrl || r.proofAfterUrl;
    const beforeAfter = after
      ? panel({
          title: r.status === 'resolved' ? 'Əvvəl və sonra' : 'Həll sübutu',
          icon: 'camera',
          sub: r.status === 'resolved' ? `Bağlayan: ${esc(r.resolvedBy || 'naməlum')}` : 'Sahə işçisinin göndərdiyi fotolar',
          body: `<div class="ba">
            <figure><div class="ba__img">${photo(r.proofBeforeUrl || r.imageUrl, r, 'Əvvəl')}</div><figcaption>Əvvəl</figcaption></figure>
            <figure><div class="ba__img">${photo(after, r, 'Sonra')}</div><figcaption>Sonra${r.fixVerdict && !r.fixVerdict.manual ? ` · AI təsdiqi ${r.fixVerdict.confidence}%` : ''}</figcaption></figure>
          </div>${r.fixVerdict && r.fixVerdict.reason ? `<p class="prose" style="margin-top:12px">${esc(r.fixVerdict.reason)}</p>` : ''}`,
        })
      : '';
    const cost = r.cost ? `≈ ${azn(r.cost)}` : 'Qiymətləndirilməyib';
    const main = `<div class="dp-main">
      <section class="panel panel--flush"><div class="dp-photo">${r.imageUrl ? `<span class="dp-photo__tag">${I.camera}Vətəndaşın çəkdiyi foto</span><a class="dp-photo__open" href="${esc(r.imageUrl)}" target="_blank" rel="noopener">${I.external}Tam ölçü</a>` : ''}${photo(r.imageUrl, r, r.title)}</div></section>
      ${panel({
        title: 'AI təhlili',
        icon: 'sparkles',
        body: `${r.explanation ? `<p class="prose">${esc(r.explanation)}</p>` : '<p class="prose quiet">Təsvir yoxdur.</p>'}
          <dl class="v-stats v-stats--row">
            <div><dt>Kateqoriya</dt><dd class="is-text">${CAT[r.cat].name}</dd></div>
            <div><dt>Ciddilik</dt><dd class="is-text">${sevMark(r)}</dd></div>
            <div><dt>Təxmini xərc</dt><dd class="is-text">${cost}</dd></div>
            <div><dt>Etibarlılıq</dt><dd>${r.conf != null ? `${r.conf}%` : '<span class="quiet" style="font-size:15px">yoxdur</span>'}</dd></div>
          </dl>`,
      })}
      ${beforeAfter}
      ${panel({
        title: 'Vətəndaşın qeydi',
        icon: 'user',
        body: `<div class="quote${r.note ? '' : ' quote--empty'}">${r.note ? esc(r.note) : 'Vətəndaş əlavə qeyd yazmayıb.'}
          <div class="quote__by"><span class="avatar avatar--sm">${esc(initials(r.reporter))}</span>${esc(r.reporter)} · ${ageStr(r.created)}${r.rating ? ` · ${stars(r.rating, 12)}` : ''}</div></div>`,
      })}
      ${panel({
        title: 'Yer',
        icon: 'pin',
        body: r.hasLoc
          ? `<div class="v-pmap"><div id="miniMap"></div><div class="loc__row"><div><div class="loc__addr">${esc(r.addr)}</div><div class="loc__coord mono">${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}${placeName(r) ? ` · ${esc(placeName(r))}` : ''}</div></div><a class="link-btn" href="https://www.openstreetmap.org/?mlat=${r.lat}&amp;mlon=${r.lng}#map=18/${r.lat}/${r.lng}" target="_blank" rel="noopener">Küçə xəritəsində aç${I.external}</a></div></div>`
          : `<div class="hint">${I.pin}${esc(r.addr || 'Koordinat göndərilməyib')}</div>`,
      })}
      ${panel({ title: 'Tarixçə', icon: 'history', body: timeline(r) })}
    </div>`;
    return `${back}${head}${connectionNotice()}<div class="dp-grid rise">${main}<aside class="dp-side" id="dpSide">${sidePanel(r)}</aside></div>`;
  }

  function btn(act, label, cls = 'btn--ghost', icon = '', disabled = false) {
    const busy = state.busy === act;
    return `<button type="button" class="btn ${cls} btn--block${busy ? ' is-busy' : ''}" data-act="${act}" ${disabled || (state.busy && !busy) ? 'disabled' : ''}>${busy ? `<span class="spin">${I.loader}</span>` : icon ? I[icon] : ''}${label}</button>`;
  }

  function dropzone(slot, url, label, tag) {
    return `<label class="dropzone${url ? ' is-filled' : ''}" data-drop="${slot}">
      ${tag ? `<span class="dropzone__tag">${tag}</span>` : ''}
      ${url ? `<img src="${esc(url)}" alt=""><span class="dropzone__swap">Dəyiş</span>` : `${I.camera}<span>${label}</span>`}
      <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-file="${slot}">
    </label>`;
  }

  function closeCard() {
    const fx = state.fix;
    const ai = state.meta.ai;
    let verdict = '';
    if (fx.verifying) {
      verdict = `<div class="verdict verdict--wait"><span class="verdict__ic"><span class="spin">${I.loader}</span></span><div><div class="verdict__h">Foto yoxlanılır</div><div class="verdict__sub">Əvvəlki problemlə tutuşdurulur</div></div></div>`;
    } else if (fx.error) {
      verdict = `<div class="verdict verdict--err"><span class="verdict__ic">${I.x}</span><div><div class="verdict__h">Yoxlama alınmadı</div><div class="verdict__sub">${esc(fx.error)}</div></div></div>`;
    } else if (fx.verdict) {
      const ok = fx.verdict.approved;
      verdict = `<div class="verdict verdict--${ok ? 'ok' : 'no'}"><span class="verdict__ic">${ok ? I.check : I.x}</span><div><div class="verdict__h">${ok ? 'Təmir təsdiqləndi' : 'Təmir kifayət deyil'} · ${fx.verdict.confidence}%</div><div class="verdict__sub">${esc(fx.verdict.reason || '')}</div></div></div>`;
    }
    const canClose = fx.file && (!ai || (fx.verdict && fx.verdict.approved) || fx.manual);
    const override = ai && fx.file && !canClose && !fx.verifying ? '<div class="act__center"><button type="button" class="linkbtn" data-act="manual">AI olmadan təsdiqlə</button></div>' : '';
    return panel({
      title: 'Həll et və bağla',
      icon: 'camera',
      body: `<div class="act">
        ${dropzone('fix', fx.url, 'Həll fotosunu seçin', 'Sonra')}
        ${verdict}
        <div class="act__btns">
          ${ai && fx.file && !fx.verifying ? btn('verify', fx.verdict ? 'Yenidən yoxla' : 'AI ilə yoxla', 'btn--ghost', 'sparkles') : ''}
          ${btn('close', 'İşi bağla', 'btn--primary', 'check', !canClose)}
        </div>
        ${override}
      </div>`,
    });
  }

  function proofCard() {
    const p = state.proof;
    return panel({
      title: 'Həll sübutu',
      icon: 'camera',
      body: `<div class="act">
        <div class="proofgrid">${dropzone('before', p.beforeUrl, 'Əvvəl, istəyə görə', 'Əvvəl')}${dropzone('after', p.afterUrl, 'Sonra', 'Sonra')}</div>
        ${btn('submitProof', 'Sübutu göndər', 'btn--primary', 'send', !p.after)}
      </div>`,
    });
  }

  function sidePanel(r) {
    const me = role();
    const can = me.can;
    let act = '';
    if (r.status === 'pending' && can.approve) {
      act = panel({
        title: 'Qərar gözləyir',
        icon: 'clock',
        body: `<div class="act"><div class="act__btns">${btn('approve', 'Təsdiqlə', 'btn--primary', 'check')}${btn('reject', 'Rədd et', 'btn--danger', 'x')}${can.reassign ? btn('reassign', 'Başqa departamentə ötür', 'btn--ghost', 'swap') : ''}</div></div>`,
      });
    } else if (['approved', 'in_progress'].includes(r.status) && can.close) {
      act = closeCard() + (can.reassign ? `<div>${btn('reassign', 'Başqa departamentə ötür', 'btn--quiet', 'swap')}</div>` : '');
    } else if (r.status === 'approved' && can.work) {
      act = panel({ title: 'Yeni iş', icon: 'clipboard', body: `<div class="act">${btn('start', 'İşə başla', 'btn--primary', 'play')}</div>` });
    } else if (r.status === 'in_progress' && can.work && (!r.worker || r.worker === me.name)) {
      act = proofCard();
    } else if (r.status === 'proof' && can.proof) {
      act = panel({
        title: 'Sübutu yoxlayın',
        icon: 'eye',
        body: `<div class="act"><div class="act__btns">${btn('approveProof', 'Təsdiqlə və bağla', 'btn--primary', 'check')}${btn('rejectProof', 'Geri qaytar', 'btn--danger', 'rotate')}</div></div>`,
      });
    } else if (r.status === 'proof') {
      act = `<div class="hint hint--blue">${I.clock}Rəhbərin təsdiqini gözləyir</div>`;
    } else if (r.status === 'resolved') {
      act = `<div class="hint hint--ok">${I.check}Həll edilib${r.resolvedBy ? `, ${esc(r.resolvedBy)}` : ''}${r.resolvedAt ? ` · ${fmtDate(r.resolvedAt)}` : ''}</div>`;
    } else if (r.status === 'rejected') {
      act = `<div class="hint hint--stop">${I.x}Müraciət rədd edilib</div>${can.approve ? `<div>${btn('reopen', 'Yenidən baxışa qaytar', 'btn--quiet', 'rotate')}</div>` : ''}`;
    } else {
      act = `<div class="hint">${I.eye}Bu rolda bu mərhələdə əməliyyat yoxdur</div>`;
    }
    const d = dueOf(r);
    const facts = panel({
      title: 'Məlumat',
      icon: 'file',
      body: `<div class="facts">
        <div class="fact"><span>Departament</span><b>${esc(r.dept)}</b></div>
        <div class="fact"><span>İcraçı</span><b>${r.worker ? esc(r.worker) : '<span class="quiet">təyin olunmayıb</span>'}</b></div>
        ${isOpen(r) ? `<div class="fact"><span>Prioritet</span><b class="num">${scoreOf(r)} / 100</b></div><div class="fact"><span>Son tarix</span><b class="${d.over ? 'is-over' : ''}">${d.text} ${d.sub}</b></div>` : ''}
        <div class="fact"><span>Daxil olub</span><b>${fmtDate(r.created)}</b></div>
        <div class="fact"><span>Mənbə</span><b>${SOURCE[r.source] || esc(r.source)}</b></div>
        <div class="fact"><span>Göndərən</span><b>${esc(r.reporter)}</b></div>
      </div>`,
    });
    return act + facts;
  }

  /* ======================================================== SHELL RENDER */

  const fillMemory = {};

  /** Moves a `.navfill` plate under the live element, travelling from where it
   *  was on the previous render. */
  function placeFill(fill, target, key) {
    if (!fill) return;
    if (!target || !target.offsetParent) {
      fill.classList.remove('is-on');
      delete fillMemory[key];
      return;
    }
    const box = fill.parentElement;
    const br = box.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const pos = {
      x: tr.left - br.left + box.scrollLeft - (box.clientLeft || 0),
      y: tr.top - br.top + box.scrollTop - (box.clientTop || 0),
      w: tr.width,
      h: tr.height,
    };
    const prev = fillMemory[key];
    const apply = (p) => {
      fill.style.transform = `translate(${p.x}px, ${p.y}px)`;
      fill.style.width = `${p.w}px`;
      fill.style.height = `${p.h}px`;
    };
    fill.classList.remove('is-moving');
    if (prev && (prev.x !== pos.x || prev.y !== pos.y || prev.w !== pos.w)) {
      apply(prev);
      fill.classList.add('is-on');
      void fill.offsetWidth;
      fill.classList.add('is-moving');
    }
    apply(pos);
    fill.classList.add('is-on');
    fillMemory[key] = pos;
  }

  function syncFills(root = document) {
    for (const fill of $$('.navfill', root)) {
      const key = fill.dataset.fill;
      const box = fill.parentElement;
      const target = key === 'rail' || key === 'mobile' ? $('.rail__item.is-live .rail__tile', box) : $('button.is-active', box);
      placeFill(fill, target, key);
    }
  }

  function navItem(key, live, badge = '') {
    const n = NAV[key];
    return `<a class="rail__item${live ? ' is-live' : ''}" href="#/${key}" data-go="${key}" ${live ? 'aria-current="page"' : ''}>
      <span class="rail__tile">${I[n.icon]}${badge}</span>
      <span class="rail__label">${n.short}</span>
    </a>`;
  }

  function badgeFor(key) {
    if (!state.loaded) return '';
    const all = scoped();
    let n = 0;
    let cls = '';
    if (key === 'queue') n = all.filter((r) => r.status === 'pending').length;
    if (key === 'tasks') n = all.length;
    if (key === 'map') {
      n = all.filter(isOverdue).length;
      cls = ' rail__badge--stop';
    }
    return n ? `<span class="rail__badge${cls}">${n > 99 ? '99+' : n}</span>` : '';
  }

  const activeNav = () => (state.view === 'detail' ? state.backView || role().nav[0] : state.view);

  function renderRail() {
    const live = activeNav();
    $('#rail').innerHTML = `<span class="navfill" data-fill="rail"></span>
      <div class="rail__group">${role().nav.map((k) => navItem(k, k === live, badgeFor(k))).join('')}</div>
      <span class="rail__rule" aria-hidden="true"></span>
      <div class="rail__group rail__group--foot">${navItem('settings', live === 'settings')}</div>`;
  }

  function mobileSplit() {
    const items = [...role().nav, 'settings'];
    if (items.length <= 5) return { primary: items, rest: [] };
    return { primary: items.slice(0, 4), rest: items.slice(4) };
  }

  function renderMobileBar() {
    const live = activeNav();
    const { primary, rest } = mobileSplit();
    const moreLive = rest.includes(live);
    $('#mobilebar').innerHTML = `<div class="mobilebar__row"><span class="navfill" data-fill="mobile"></span>
      ${primary.map((k) => navItem(k, k === live, badgeFor(k))).join('')}
      ${rest.length ? `<button type="button" class="rail__item${moreLive ? ' is-live' : ''}" data-more aria-label="Bütün bölmələr"><span class="rail__tile">${I.more}</span><span class="rail__label">Daha çox</span></button>` : ''}
    </div>`;
  }

  function openSheet() {
    closeSheet();
    const live = activeNav();
    const scrim = document.createElement('div');
    scrim.className = 'sheet-scrim';
    scrim.dataset.sheet = '';
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.dataset.sheet = '';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Bütün bölmələr');
    sheet.innerHTML = `<div class="sheet__grip"></div><div class="sheet__grid">${mobileSplit().rest.map((k) => navItem(k, k === live)).join('')}</div>`;
    scrim.addEventListener('click', closeSheet);
    document.body.append(scrim, sheet);
  }
  const closeSheet = () => $$('[data-sheet]').forEach((el) => el.remove());

  /* --------------------------------------------------------- top bar */

  function notes() {
    const out = [];
    if (!state.loaded) return out;
    const all = scoped();
    if (state.conn === 'offline') out.push({ tone: 'warn', title: 'Canlı əlaqə kəsilib' });
    const fresh = all.filter((r) => +r.created > state.lastSeen && now() - +r.created < 3 * DAY);
    if (fresh.length && state.lastSeen) out.push({ tone: 'info', title: `${fresh.length} yeni müraciət`, body: fresh.slice(0, 2).map((r) => r.title).join(', '), go: role().nav.includes('queue') ? 'queue' : 'tasks', fresh: true });
    if (state.notify.overdue) {
      all.filter(isOverdue)
        .sort((a, b) => deadlineOf(a) - deadlineOf(b))
        .slice(0, 5)
        .forEach((r) => out.push({ tone: 'stop', title: `#${r.id} · ${r.title}`, body: `${dueOf(r).text} gecikib · ${r.dept}`, open: r.id }));
    }
    const pending = all.filter((r) => r.status === 'pending').length;
    if (pending && role().can.approve) out.push({ tone: 'warn', title: `${pending} müraciət təsdiq gözləyir`, body: 'Növbədə baxın', go: 'queue', filter: 'pending' });
    const proof = all.filter((r) => r.status === 'proof').length;
    if (proof && role().can.proof) out.push({ tone: 'warn', title: `${proof} həll sübutu yoxlanılmalıdır`, body: 'Sahə işçilərinin fotoları', go: 'queue', filter: 'proof' });
    return out;
  }

  function renderTopMeta() {
    const r = role();
    const open = state.loaded ? scoped().filter(isOpen).length : 0;
    const list = notes();
    const alert = list.some((n) => n.tone === 'stop' || n.fresh);
    const target = r.nav.includes('queue') ? 'queue' : 'tasks';
    const chip = state.conn === 'offline' || (state.loadError && !state.loaded)
      ? `<span class="chip chip--warn optional">${I.wifiOff}Əlaqə yoxdur</span>`
      : `<a class="chip optional" href="#/${target}" data-go="${target}" title="Hələ bağlanmamış müraciətlər">${I.inbox}Açıq müraciət <b>${state.loaded ? open : '…'}</b></a>`;
    const pop = state.pop;
    const helpPop = pop === 'help'
      ? `<div class="popover popover--right"><div class="popover__label">Kömək</div>
          <ul class="popover__help">
            <li><span><b>/</b> istənilən yerdən axtarışı açır, <b>Esc</b> bağlayır.</span></li>
            <li><span>Müraciətin yolu: təsdiq gözləyir, təsdiqlənib, icrada, sübut yoxlanılır, həll edilib.</span></li>
            <li><span>Son tarix ciddiliyə görədir: kritik 24 saat, yüksək 48, orta 72, aşağı 120 saat.</span></li>
          </ul></div>`
      : '';
    const alertsPop = pop === 'alerts'
      ? `<div class="popover popover--right"><div class="popover__label">Bildirişlər</div>${list.length
          ? list.map((n) => `<button type="button" class="popover__row" data-note data-note-open="${esc(n.open || '')}" data-note-go="${n.go || ''}" data-note-filter="${n.filter || ''}"><span class="popover__dot popover__dot--${n.tone}"></span><span class="grow"><span class="popover__title">${esc(n.title)}</span><span class="popover__meta">${esc(n.body)}</span></span></button>`).join('')
          : '<div class="popover__empty">Yeni bildiriş yoxdur.</div>'}</div>`
      : '';
    const menuPop = pop === 'menu'
      ? `<div class="popover popover--right"><div class="popover__label">Rolu dəyiş</div>
          ${Object.entries(ROLES).map(([k, x]) => `<button type="button" class="popover__row" data-role="${k}"><span class="avatar avatar--sm">${x.init}</span><span class="grow"><span class="popover__title">${x.name}</span><span class="popover__meta">${x.title}</span></span>${state.role === k ? `<span class="popover__check">${I.check}</span>` : ''}</button>`).join('')}
          <div class="popover__rule"></div>
          <a class="popover__row" href="#/settings" data-go="settings">${I.settings}<span class="popover__title">Parametrlər</span></a>
          ${state.meta.auth ? `<div class="popover__rule"></div><button type="button" class="popover__row popover__row--danger" data-logout>${I.logout}<span class="popover__title">Çıxış</span></button>` : ''}
        </div>`
      : '';
    $('#topMeta').innerHTML = `${chip}
      <div class="topbar__pop-anchor"><button type="button" class="topbar__icon-btn" data-pop="help" aria-label="Kömək" aria-expanded="${pop === 'help'}">${I.help}</button>${helpPop}</div>
      <div class="topbar__pop-anchor"><button type="button" class="topbar__icon-btn" data-pop="alerts" aria-label="Bildirişlər${list.length ? ` (${list.length})` : ''}" aria-expanded="${pop === 'alerts'}">${I.bell}${alert ? '<span class="topbar__notif-dot"></span>' : ''}</button>${alertsPop}</div>
      <div class="topbar__pop-anchor"><button type="button" class="topbar__avatar" data-pop="menu" aria-label="Hesab menyusu" aria-expanded="${pop === 'menu'}"><span class="avatar">${r.init}</span><span class="topbar__avatar-text"><span class="topbar__avatar-name">${r.name}</span><span class="topbar__avatar-role">${r.title}</span></span></button>${menuPop}</div>`;
  }

  /* ---------------------------------------------------------- search */

  let searchCursor = 0;
  let searchResults = [];

  function runSearch() {
    const input = $('#globalSearch');
    const pop = $('#searchPop');
    const raw = input.value.trim();
    const q = raw.toLowerCase();
    $('#searchKbd').hidden = Boolean(input.value);
    if (!q) {
      pop.hidden = true;
      searchResults = [];
      return;
    }
    const pages = [...role().nav, 'settings']
      .filter((k) => NAV[k].label.toLowerCase().includes(q))
      .map((k) => ({ kind: 'page', key: k, title: NAV[k].label, meta: 'Bölmə', icon: NAV[k].icon }));
    const qq = q.replace(/^#/, '');
    const reports = scoped()
      .filter((r) => r.id === qq || `${r.title} ${r.addr} ${r.explanation}`.toLowerCase().includes(qq))
      .sort((a, b) => (a.id === qq ? -1 : b.id === qq ? 1 : b.created - a.created))
      .slice(0, 6)
      .map((r) => ({ kind: 'report', key: r.id, title: r.title, meta: `#${r.id} · ${ST[r.status].name} · ${r.addr || CAT[r.cat].name}`, r }));
    searchResults = [...pages.slice(0, 3), ...reports];
    if (role().nav.includes('queue')) searchResults.push({ kind: 'queue', key: q, title: `Növbədə “${raw}” axtar`, meta: 'Bütün uyğun müraciətlər', icon: 'search' });
    searchCursor = Math.min(searchCursor, Math.max(0, searchResults.length - 1));
    pop.innerHTML = searchResults.length
      ? searchResults
          .map(
            (x, i) => `<button type="button" class="popover__row${i === searchCursor ? ' is-active' : ''}" data-sres="${i}">
              ${x.kind === 'report' ? `<span class="popover__thumb ph${x.r.imageUrl ? '' : ' ph--empty'}">${x.r.imageUrl ? `<img src="${esc(x.r.imageUrl)}" alt="" data-cat="${x.r.cat}">` : catIcon(x.r.cat)}</span>` : I[x.icon]}
              <span class="grow"><span class="popover__title">${esc(x.title)}</span><span class="popover__meta">${esc(x.meta)}</span></span>
            </button>`,
          )
          .join('')
      : `<div class="popover__empty">“${esc(raw)}” üzrə heç nə tapılmadı.</div>`;
    pop.hidden = false;
  }

  function pickSearch(i) {
    const x = searchResults[i];
    if (!x) return;
    const input = $('#globalSearch');
    if (x.kind === 'page') go(x.key);
    if (x.kind === 'report') go('detail', x.key);
    if (x.kind === 'queue') {
      state.filters = { sev: 'all', cat: 'all', status: 'all', dept: 'all', q: input.value.trim() };
      go('queue');
    }
    input.value = '';
    input.blur();
    runSearch();
  }

  /* ------------------------------------------------------------ render */

  const VIEWS = {
    overview: viewOverview,
    queue: viewQueue,
    map: viewMap,
    tasks: viewTasks,
    analytics: viewAnalytics,
    reports: viewReports,
    feedback: viewFeedback,
    settings: viewSettings,
    detail: viewDetail,
  };

  let detailSig = '';

  function render({ enter = false } = {}) {
    renderRail();
    renderMobileBar();
    renderTopMeta();
    const view = $('#view');
    const y = window.scrollY;
    unmountMap();
    unmountMini();
    view.innerHTML = VIEWS[state.view]();
    view.classList.remove('is-entering');
    if (enter) {
      void view.offsetWidth;
      view.classList.add('is-entering');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      countUp(view);
    } else {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    }
    if (state.view === 'map') mountMap();
    if (state.view === 'detail') {
      const r = findReport(state.sel);
      mountMini(r);
      detailSig = r ? `${r.id}:${r.updatedAt}` : 'none';
    }
    document.title = `${state.view === 'detail' ? `#${state.sel}` : NAV[state.view].label} · Zəngəzur`;
    requestAnimationFrame(() => syncFills());
  }

  /** After data changes: redraw in place, without the entrance motion. */
  function refresh() {
    renderRail();
    renderMobileBar();
    renderTopMeta();
    if (state.view === 'map' && MAP) {
      drawMap();
      updateMapSide();
      const chips = $('#mapChips');
      if (chips) chips.outerHTML = mapChips();
      requestAnimationFrame(() => syncFills());
      return;
    }
    if (state.view === 'detail') {
      const r = findReport(state.sel);
      const sig = r ? `${r.id}:${r.updatedAt}` : 'none';
      if (sig === detailSig && state.loaded && $('#dpSide')) {
        requestAnimationFrame(() => syncFills());
        return;
      }
    }
    render();
  }

  function refreshSide() {
    const r = findReport(state.sel);
    const side = $('#dpSide');
    if (r && side) side.innerHTML = sidePanel(r);
  }

  function countUp(root) {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || document.hidden) return;
    for (const el of $$('[data-count]', root)) {
      const to = Number(el.dataset.count);
      if (!Number.isFinite(to) || to === 0) continue;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 900);
        el.textContent = num(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
      // Frames stop in a background tab; never leave a figure stuck at zero.
      setTimeout(() => {
        el.textContent = num(to);
      }, 1100);
    }
  }

  /* ----------------------------------------------------------- routing */

  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'report' && parts[1]) return { view: 'detail', sel: decodeURIComponent(parts[1]) };
    return { view: parts[0] || null, sel: null };
  }

  function route() {
    const { view, sel } = parseHash();
    const allowed = [...role().nav, 'settings', 'detail'];
    const prevView = state.view;
    state.view = allowed.includes(view) ? view : role().nav[0];
    if (state.view === 'detail') {
      if (prevView && prevView !== 'detail') state.backView = prevView;
      if (state.sel !== sel) {
        state.fix = emptyFix();
        state.proof = emptyProof();
        state.busy = null;
      }
      state.sel = sel;
    } else {
      state.sel = null;
      state.backView = null;
    }
  }

  function go(view, sel) {
    state.pop = null;
    closeSheet();
    const target = view === 'detail' ? reportHref(sel) : `#/${view}`;
    if (location.hash === target) {
      route();
      render({ enter: true });
    } else {
      location.hash = target;
    }
  }

  window.addEventListener('hashchange', () => {
    internalNav = true;
    route();
    render({ enter: true });
  });

  /* ------------------------------------------------------------- data */

  let reloadTimer = null;
  let pendingKinds = new Set();
  let knownIds = null;

  async function loadReports() {
    const { reports } = await API.reports();
    const next = reports.map(toReport);
    if (knownIds && state.notify.newReport) {
      const mine = new Set(scopeOf(next.filter((r) => !isSample(r))).map((r) => r.id));
      next
        .filter((r) => !knownIds.has(r.id) && mine.has(r.id))
        .slice(0, 3)
        .forEach((r) => toast(`Yeni müraciət #${r.id}: ${r.title}`, 'info', () => go('detail', r.id)));
    }
    knownIds = new Set(next.map((r) => r.id));
    REPORTS = next;
  }

  async function loadFeedback() {
    const { feedbacks } = await API.feedbacks();
    FEEDBACK = feedbacks
      .map((f) => ({
        id: f.id,
        rating: Math.max(1, Math.min(5, Math.round(Number(f.rating) || 0))),
        comment: (f.comment || '').trim(),
        reportId: f.reportId ? String(f.reportId) : '',
        category: f.category || '',
        reporter: f.reporter || 'Anonim',
        created: new Date(Number(f.createdAt) || now()),
      }))
      .sort((a, b) => b.created - a.created);
  }

  async function reload(kinds = new Set(['report', 'feedback'])) {
    const first = !state.loaded;
    try {
      const jobs = [];
      if (kinds.has('report')) jobs.push(loadReports());
      if (kinds.has('feedback')) jobs.push(loadFeedback());
      await Promise.all(jobs);
      state.loaded = true;
      state.loadError = null;
    } catch (err) {
      if (err.status === 401) return showSignIn();
      state.loadError = err.message || 'Naməlum xəta';
    }
    // The first real data gets the entrance; later changes redraw in place.
    if (first && state.loaded) render({ enter: true });
    else refresh();
    return undefined;
  }

  function scheduleReload(kind) {
    if (kind === 'hello' || kind === 'poll') {
      pendingKinds.add('report');
      pendingKinds.add('feedback');
    } else {
      pendingKinds.add(kind === 'feedback' ? 'feedback' : 'report');
    }
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      const kinds = pendingKinds;
      pendingKinds = new Set();
      reload(kinds);
    }, 200);
  }

  /* ---------------------------------------------------------- actions */

  function replaceReport(data) {
    if (!data) return;
    const next = toReport(data);
    const i = REPORTS.findIndex((r) => r.id === next.id);
    if (i >= 0) REPORTS[i] = next;
    else REPORTS.unshift(next);
  }

  async function run(act, fn, okMsg) {
    state.busy = act;
    refreshSide();
    try {
      const res = await fn();
      if (res && res.report) replaceReport(res.report);
      state.busy = null;
      if (okMsg) toast(okMsg, 'ok');
      return res;
    } catch (err) {
      state.busy = null;
      if (err.status === 401) {
        showSignIn();
        return null;
      }
      toast(err.message || 'Əməliyyat alınmadı', 'warn');
      refreshSide();
      return null;
    }
  }

  async function setStatus(r, statusText, msg, extra = {}) {
    const res = await run(statusText, () => API.patch(r.id, { statusText, actor: role().name, ...extra }), msg);
    if (res) render();
  }

  async function handleAction(act) {
    const r = findReport(state.sel);
    if (!r || (state.busy && act !== 'manual')) return undefined;
    const me = role().name;
    switch (act) {
      case 'approve':
        return setStatus(r, 'approved', `#${r.id} təsdiqləndi`);
      case 'reject':
        return setStatus(r, 'rejected', `#${r.id} rədd edildi`);
      case 'reopen':
        return setStatus(r, 'pending', `#${r.id} yenidən baxışa qaytarıldı`);
      case 'start':
        return setStatus(r, 'in_progress', `#${r.id} üzərində iş başladı`, { worker: me });
      case 'approveProof':
        return setStatus(r, 'resolved', `#${r.id} həll edildi və bağlandı`);
      case 'rejectProof':
        return setStatus(r, 'in_progress', `#${r.id} sübutu geri qaytarıldı`);
      case 'reassign':
        return pickDept(r);
      case 'manual':
        state.fix.manual = true;
        return refreshSide();
      case 'verify': {
        const fx = state.fix;
        if (!fx.file) return undefined;
        fx.verifying = true;
        fx.error = null;
        fx.verdict = null;
        refreshSide();
        try {
          const { verdict } = await API.verifyFix(r.id, fx.file);
          fx.verdict = verdict;
        } catch (err) {
          if (err.status === 401) return showSignIn();
          fx.error = err.message || 'Yoxlama alınmadı';
        }
        fx.verifying = false;
        return refreshSide();
      }
      case 'close': {
        const fx = state.fix;
        if (!fx.file) return undefined;
        const verdict = fx.verdict
          ? { ...fx.verdict, manual: Boolean(fx.manual && !fx.verdict.approved) }
          : { approved: false, resolved: false, confidence: 0, reason: '', manual: true };
        const res = await run('close', () => API.resolve(r.id, { photo: fx.file, actor: me, verdict }), `#${r.id} həll fotosu ilə bağlandı`);
        if (res) {
          if (fx.url) URL.revokeObjectURL(fx.url);
          state.fix = emptyFix();
          render();
        }
        return undefined;
      }
      case 'submitProof': {
        const p = state.proof;
        if (!p.after) return undefined;
        const res = await run('submitProof', () => API.proof(r.id, { before: p.before, after: p.after, actor: me }), `#${r.id} sübutu göndərildi`);
        if (res) {
          [p.beforeUrl, p.afterUrl].forEach((u) => u && URL.revokeObjectURL(u));
          state.proof = emptyProof();
          render();
        }
        return undefined;
      }
      default:
        return undefined;
    }
  }

  function pickDept(r) {
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML = `<div class="dialog" role="dialog" aria-label="Departamenti dəyiş">
      <div class="dialog__head"><h2>Başqa departamentə ötür</h2><p>Müraciət seçdiyiniz departamentin növbəsinə keçəcək.</p></div>
      ${DEPTS.map((d) => `<button type="button" class="popover__row" data-pickdept="${esc(d)}">${I.building}<span class="grow"><span class="popover__title">${esc(d)}</span></span>${d === r.dept ? `<span class="popover__check">${I.check}</span>` : ''}</button>`).join('')}
    </div>`;
    scrim.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pickdept]');
      if (b) {
        const dep = b.dataset.pickdept;
        scrim.remove();
        if (dep === r.dept) return;
        const res = await run('reassign', () => API.patch(r.id, { department: dep, actor: role().name }), `#${r.id} ${dep} departamentinə ötürüldü`);
        if (res) render();
        return;
      }
      if (!e.target.closest('.dialog')) scrim.remove();
    });
    document.body.append(scrim);
    const first = $('[data-pickdept]', scrim);
    if (first) first.focus({ preventScroll: true });
  }

  function exportCSV() {
    const rows = state.view === 'reports' ? rangeRows() : filtered();
    if (!rows.length) return toast('İxrac üçün müraciət yoxdur', 'warn');
    const head = ['İD', 'Başlıq', 'Kateqoriya', 'Ciddilik', 'Status', 'Departament', 'İcraçı', 'Prioritet', 'AI etibarı', 'Ünvan', 'Ərazi', 'Enlik', 'Uzunluq', 'Göndərən', 'Mənbə', 'Daxil olub', 'Son tarix'];
    const cell = (v) => {
      const s = String(v ?? '');
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const lines = [head.join(',')].concat(
      rows.map((r) =>
        [r.id, r.title, CAT[r.cat].name, SEV[r.sev].name, ST[r.status].name, r.dept, r.worker || '', isOpen(r) ? scoreOf(r) : '', r.conf ?? '', r.addr, placeName(r), r.lat ?? '', r.lng ?? '', r.reporter, SOURCE[r.source] || r.source, iso(r.created), iso(new Date(deadlineOf(r)))]
          .map(cell)
          .join(','),
      ),
    );
    const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `zengezur-muracietler-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`${rows.length} sətir yükləndi`, 'ok');
    return undefined;
  }

  /* ----------------------------------------------------------- toasts */

  function toast(msg, kind = 'ok', onClick) {
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    el.innerHTML = `<span class="toast__ic">${kind === 'ok' ? I.check : kind === 'warn' ? I.alert : I.bell}</span><span>${esc(msg)}</span>`;
    if (onClick) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        onClick();
        el.remove();
      });
    }
    $('#toasts').append(el);
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 300);
    }, kind === 'info' ? 6000 : 3600);
  }

  /* ------------------------------------------------------------ files */

  function takeFile(slot, file) {
    if (!file) return undefined;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast('JPEG, PNG və ya WEBP şəkil seçin', 'warn');
    if (file.size > state.meta.maxUploadMb * 1048576) return toast(`Şəkil ${state.meta.maxUploadMb} MB-dan böyük olmamalıdır`, 'warn');
    const url = URL.createObjectURL(file);
    if (slot === 'fix') {
      if (state.fix.url) URL.revokeObjectURL(state.fix.url);
      state.fix = { ...emptyFix(), file, url };
    } else {
      const key = slot === 'before' ? 'before' : 'after';
      if (state.proof[`${key}Url`]) URL.revokeObjectURL(state.proof[`${key}Url`]);
      state.proof[key] = file;
      state.proof[`${key}Url`] = url;
    }
    refreshSide();
    return undefined;
  }

  /* ------------------------------------------------------------ events */

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return undefined;
    const modified = e.metaKey || e.ctrlKey || e.shiftKey;

    if (t.closest('[data-home]')) {
      e.preventDefault();
      return go(role().nav[0]);
    }
    const sres = t.closest('[data-sres]');
    if (sres) return pickSearch(Number(sres.dataset.sres));
    const mapsel = t.closest('[data-mapsel]');
    if (mapsel) {
      if (modified) return undefined;
      e.preventDefault();
      return selectReport(mapsel.dataset.mapsel);
    }
    const nav = t.closest('[data-go]');
    if (nav) {
      if (modified) return undefined;
      e.preventDefault();
      return go(nav.dataset.go);
    }
    const open = t.closest('[data-open]');
    if (open) {
      if (modified) return undefined;
      e.preventDefault();
      return go('detail', open.dataset.open);
    }
    if (t.closest('[data-back]')) {
      if (internalNav && history.length > 1) return history.back();
      return go(role().nav.includes('queue') ? 'queue' : role().nav[0]);
    }
    const act = t.closest('[data-act]');
    if (act) return handleAction(act.dataset.act);

    const pop = t.closest('[data-pop]');
    if (pop) {
      state.pop = state.pop === pop.dataset.pop ? null : pop.dataset.pop;
      renderTopMeta();
      if (state.pop === 'alerts') {
        // Seen once the list is open; the "new" note stays until it closes.
        state.lastSeen = now();
        LS.set('lastSeen', state.lastSeen);
      }
      return undefined;
    }
    const note = t.closest('[data-note]');
    if (note) {
      const { noteOpen, noteGo, noteFilter } = note.dataset;
      state.pop = null;
      renderTopMeta();
      if (noteOpen) return go('detail', noteOpen);
      if (noteFilter) state.filters = { sev: 'all', cat: 'all', status: noteFilter, dept: 'all', q: '' };
      if (noteGo) return go(noteGo);
      return undefined;
    }
    const roleBtn = t.closest('[data-role]');
    if (roleBtn) {
      state.role = roleBtn.dataset.role;
      LS.set('role', state.role);
      state.pop = null;
      state.filters = { sev: 'all', cat: 'all', status: 'open', dept: 'all', q: '' };
      state.mapRegion = null;
      state.mapDistrict = null;
      state.mapSel = null;
      toast(`${ROLES[state.role].title} kimi işləyirsiniz`, 'info');
      if (state.view === 'detail' || [...role().nav, 'settings'].includes(state.view)) {
        route();
        return render({ enter: true });
      }
      return go(role().nav[0]);
    }
    if (t.closest('[data-logout]')) return logout();
    if (t.closest('[data-more]')) return openSheet();
    if (t.closest('[data-retry]')) return reload();

    const segBtn = t.closest('[data-seg]');
    if (segBtn) {
      const key = segBtn.dataset.seg;
      if (key === 'sev') state.filters.sev = segBtn.dataset.val;
      else state[key] = segBtn.dataset.val;
      return render();
    }
    const sort = t.closest('[data-sort]');
    if (sort) {
      const k = sort.dataset.sort;
      if (state.sort.key === k) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      else state.sort = { key: k, dir: k === 'title' || k === 'deadline' ? 'asc' : 'desc' };
      return render();
    }
    const fcat = t.closest('[data-fcat]');
    if (fcat) {
      state.filters = { sev: 'all', cat: fcat.dataset.fcat, status: 'open', dept: 'all', q: '' };
      return go('queue');
    }
    const fdept = t.closest('[data-fdept-row]');
    if (fdept) {
      state.filters = { sev: 'all', cat: 'all', status: 'open', dept: state.role === 'manager' ? fdept.dataset.fdeptRow : 'all', q: '' };
      return go('queue');
    }
    if (t.closest('[data-clear-filters]')) {
      state.filters = { sev: 'all', cat: 'all', status: 'all', dept: 'all', q: '' };
      return render();
    }
    if (t.closest('[data-clear-q]')) {
      state.filters.q = '';
      return render();
    }
    const mapcat = t.closest('[data-mapcat]');
    if (mapcat) {
      state.mapCat = mapcat.dataset.mapcat;
      state.mapSel = null;
      const chips = $('#mapChips');
      if (chips) chips.outerHTML = mapChips();
      drawMap();
      updateMapSide();
      return undefined;
    }
    const mapregion = t.closest('[data-mapregion]');
    if (mapregion) return selectRegion(mapregion.dataset.mapregion || null);
    const mapdistrict = t.closest('[data-mapdistrict]');
    if (mapdistrict) return selectDistrict(mapdistrict.dataset.mapdistrict || null);
    if (t.closest('[data-mapback]')) return mapBack();
    const ex = t.closest('[data-export]');
    if (ex) return ex.dataset.export === 'csv' ? exportCSV() : window.print();
    const sw = t.closest('[data-notify]');
    if (sw) {
      const k = sw.dataset.notify;
      state.notify[k] = !state.notify[k];
      LS.set('notify', state.notify);
      return render();
    }

    if (state.pop && !t.closest('.topbar__pop-anchor')) {
      state.pop = null;
      renderTopMeta();
    }
    if (!t.closest('#searchWrap')) $('#searchPop').hidden = true;
    return undefined;
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-filter]')) {
      state.filters[t.dataset.filter] = t.value;
      render();
    }
    if (t.matches('[data-file]')) takeFile(t.dataset.file, t.files && t.files[0]);
  });

  document.addEventListener('dragover', (e) => {
    const dz = e.target instanceof Element && e.target.closest('[data-drop]');
    if (!dz) return;
    e.preventDefault();
    dz.classList.add('is-drag');
  });
  document.addEventListener('dragleave', (e) => {
    const dz = e.target instanceof Element && e.target.closest('[data-drop]');
    if (dz) dz.classList.remove('is-drag');
  });
  document.addEventListener('drop', (e) => {
    const dz = e.target instanceof Element && e.target.closest('[data-drop]');
    if (!dz) return;
    e.preventDefault();
    dz.classList.remove('is-drag');
    takeFile(dz.dataset.drop, e.dataTransfer.files && e.dataTransfer.files[0]);
  });

  /* The daily chart: the bar under the cursor (or keyboard focus) lights up, the others
     fade, and a small card gives that day's count. */
  function barTip(g, on) {
    const chart = g.ownerSVGElement;
    const wrap = chart && chart.parentElement;
    const tip = wrap && wrap.querySelector('.chart-tip');
    if (!tip) return;
    chart.querySelectorAll('.bar-g.is-hot').forEach((x) => x.classList.remove('is-hot'));
    chart.classList.toggle('is-hovering', on);
    if (!on) {
      tip.hidden = true;
      return;
    }
    g.classList.add('is-hot');
    const bar = g.querySelector('.bar').getBoundingClientRect();
    const box = wrap.getBoundingClientRect();
    const n = Number(g.dataset.n);
    tip.innerHTML = `<b>${n} müraciət</b><span>${esc(g.dataset.label)}</span>`;
    tip.style.left = `${bar.left + bar.width / 2 - box.left}px`;
    tip.style.top = `${bar.top - box.top}px`;
    tip.hidden = false;
  }
  const barOf = (node) => (node instanceof Element ? node.closest('.bar-g') : null);
  document.addEventListener('mouseover', (e) => {
    const g = barOf(e.target);
    if (g) barTip(g, true);
  });
  document.addEventListener('mouseout', (e) => {
    const g = barOf(e.target);
    if (g && barOf(e.relatedTarget) !== g) barTip(g, false);
  });
  document.addEventListener('focusin', (e) => {
    const g = barOf(e.target);
    if (g) barTip(g, true);
  });
  document.addEventListener('focusout', (e) => {
    const g = barOf(e.target);
    if (g) barTip(g, false);
  });

  // A photo that fails to load falls back to the category plate.
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      const ph = img.closest('.ph');
      if (!ph) return;
      ph.classList.add('ph--empty');
      ph.innerHTML = catIcon(img.dataset.cat || 'other');
    },
    true,
  );

  const searchInput = $('#globalSearch');
  searchInput.addEventListener('input', () => {
    searchCursor = 0;
    runSearch();
  });
  searchInput.addEventListener('focus', runSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchCursor = Math.min(searchCursor + 1, searchResults.length - 1);
      runSearch();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchCursor = Math.max(searchCursor - 1, 0);
      runSearch();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickSearch(searchCursor);
    } else if (e.key === 'Escape') {
      searchInput.value = '';
      runSearch();
      searchInput.blur();
    }
  });

  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement && document.activeElement.tagName) || '');
    if (e.key === '/' && !typing) {
      e.preventDefault();
      searchInput.focus();
      return undefined;
    }
    if (e.key === 'Escape') {
      if ($('.scrim')) return $('.scrim').remove();
      if ($('[data-sheet]')) return closeSheet();
      if (state.pop) {
        state.pop = null;
        return renderTopMeta();
      }
      if (state.view === 'map' && state.mapSel) return mapBack();
      if (state.view === 'map' && (state.mapRegion || state.mapDistrict)) return selectRegion(null);
    }
    if ((e.key === 'Enter' || e.key === ' ') && !typing && document.activeElement && document.activeElement.matches('tr[data-open]')) {
      e.preventDefault();
      go('detail', document.activeElement.dataset.open);
    }
    return undefined;
  });

  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      for (const k of Object.keys(fillMemory)) delete fillMemory[k];
      syncFills();
    }, 120);
  });

  /* ------------------------------------------------------------ sign in */

  function showSignIn(message) {
    $('#app').hidden = true;
    const box = $('#signin');
    box.hidden = false;
    box.innerHTML = `<div class="signin"><form class="signin__card" id="signinForm">
      <div class="signin__brand"><img src="gerb.svg" alt=""><b aria-label="Zəngəzur">Z<span class="schwa">e</span>ng<span class="schwa">e</span>zur</b><span>Xətai rayonu</span></div>
      <div><h1>Komanda mərkəzinə giriş</h1><p style="margin-top:8px">Davam etmək üçün rayon administratorunun verdiyi giriş açarını daxil edin.</p></div>
      <label class="field"><span class="field__label">Giriş açarı</span><span class="field__wrap">${I.key}<input type="password" name="key" autocomplete="current-password" required></span></label>
      <p class="field__error" id="signinError" ${message ? '' : 'hidden'}>${esc(message || '')}</p>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Daxil ol${I.arrowR}</button>
    </form></div>`;
    const form = $('#signinForm');
    form.key.focus({ preventScroll: true });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = $('button[type="submit"]', form);
      b.classList.add('is-busy');
      try {
        await API.login(form.key.value);
        box.hidden = true;
        box.innerHTML = '';
        boot();
      } catch (err) {
        b.classList.remove('is-busy');
        const p = $('#signinError');
        p.textContent = err.message || 'Giriş alınmadı';
        p.hidden = false;
      }
    });
  }

  let unsubscribe = null;
  let retryTimer = null;

  async function logout() {
    try {
      await API.logout();
    } catch {
      /* the cookie is cleared by the server; nothing to undo here */
    }
    if (unsubscribe) unsubscribe();
    location.hash = '';
    showSignIn();
  }

  /* --------------------------------------------------------------- boot */

  async function boot() {
    try {
      state.meta = { ...state.meta, ...(await API.meta()) };
    } catch (err) {
      state.loadError = err.message;
    }
    if (state.meta.auth && !state.meta.signedIn) return showSignIn();

    $('#signin').hidden = true;
    $('#app').hidden = false;
    route();
    render({ enter: true });
    await reload();

    if (unsubscribe) unsubscribe();
    unsubscribe = API.subscribe({
      onChange: (d) => scheduleReload(d.kind || 'report'),
      onState: (s) => {
        if (state.conn === s) return;
        state.conn = s;
        refresh();
      },
    });
    // Once a minute: retry when disconnected, otherwise move ages and deadlines on.
    clearInterval(retryTimer);
    retryTimer = setInterval(() => {
      if (!state.loaded || state.conn !== 'live') reload();
      else refresh();
    }, 60000);
    return undefined;
  }

  window.CIVIC = { state, reports: () => REPORTS, reload, go };
  boot();
})();
