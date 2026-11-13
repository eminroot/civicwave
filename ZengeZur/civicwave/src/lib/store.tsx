import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  CategoryId,
  ReportStatus,
  SEVERITY_POINTS,
  Severity,
} from '@/constants/categories';
import { BASE_POINTS } from '@/constants/user';
import { subscribeReportStatuses, uploadReport } from '@/lib/api';
import { weekStart } from '@/lib/format';

export type Report = {
  id: string;
  /** The report's id on the CivicWave server (set once the upload succeeds). */
  serverId?: string;
  /** Left over from the Firebase days; not used, and never matched against server ids. */
  firebaseId?: string;
  categoryId: CategoryId;
  categoryName: string;
  title: string;
  severity: Severity;
  status: ReportStatus;
  department: string;
  costMin: number;
  costMax: number;
  confidence: number;
  note?: string;
  photoUri?: string;
  photoMime?: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: number;
  points: number;
  firstReporter?: boolean;
  /** Name sent with the report, or "Anonim". */
  reporter?: string;
  /** Failed sends so far; the report is sent again until it reaches the server. */
  sendAttempts?: number;
  sendError?: string;
};

/** sent: on the server · sending: upload running · waiting: will be sent again soon ·
 *  stuck: has no photo left to send, so it can only stay on the phone */
export type SendState = 'sent' | 'sending' | 'waiting' | 'stuck';

/** The day the CivicWave server took over from Firebase. */
const SERVER_ERA = Date.UTC(2026, 10, 12);

/**
 * Reports from before the server (months old, sent to Firebase). They can't be followed
 * any more and their photos are gone from the phone, so they are dropped on load.
 */
const isLegacy = (r: Report) => !r.serverId && (Boolean(r.firebaseId) || !(r.createdAt >= SERVER_ERA));

const STORAGE_KEY = 'civicwave.reports.v1';
const RETRY_EVERY_MS = 30_000;
const AUTO_RETRY_LIMIT = 8;

// Xətai rough centre
export const XATAI = { lat: 40.3836, lng: 49.8889 };

const SEED: Report[] = [
  {
    id: 'seed-1',
    categoryId: 'roads',
    categoryName: 'Yollar və Asfalt',
    title: 'Yolda dərin çuxur',
    severity: 'critical',
    status: 'in_progress',
    department: 'Yol İstismar İdarəsi',
    costMin: 400,
    costMax: 900,
    confidence: 94,
    address: 'Babək prospekti',
    lat: 40.38994,
    lng: 49.89868,
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    points: 50,
    firstReporter: true,
  },
  {
    id: 'seed-2',
    categoryId: 'lighting',
    categoryName: 'Küçə İşıqlandırması',
    title: 'Yanmayan küçə lampası',
    severity: 'medium',
    status: 'approved',
    department: 'İşıqlandırma İdarəsi',
    costMin: 80,
    costMax: 150,
    confidence: 88,
    address: 'Yusif Səfərov küçəsi',
    lat: 40.3837,
    lng: 49.86398,
    createdAt: Date.now() - 1000 * 60 * 60 * 9,
    points: 25,
  },
  {
    id: 'seed-3',
    categoryId: 'sanitation',
    categoryName: 'Təmizlik və Tullantılar',
    title: 'Daşmış zibil konteyneri',
    severity: 'medium',
    status: 'resolved',
    department: 'Təmizlik və Tullantı İdarəsi',
    costMin: 30,
    costMax: 60,
    confidence: 91,
    address: 'Sabit Orucov küçəsi',
    lat: 40.38059,
    lng: 49.87195,
    createdAt: Date.now() - 1000 * 60 * 60 * 50,
    points: 25,
  },
  {
    id: 'seed-4',
    categoryId: 'greenery',
    categoryName: 'Yaşıllıq və Ağaclar',
    title: 'Aşma təhlükəsi olan ağac',
    severity: 'critical',
    status: 'pending',
    department: 'Yaşıllaşdırma İdarəsi',
    costMin: 150,
    costMax: 350,
    confidence: 79,
    address: 'Xocalı prospekti',
    lat: 40.38235,
    lng: 49.87005,
    createdAt: Date.now() - 1000 * 60 * 30,
    points: 0,
  },
];

export type NewReport = Omit<
  Report,
  'createdAt' | 'status' | 'points' | 'serverId' | 'sendAttempts' | 'sendError'
>;

type Ctx = {
  reports: Report[]; // this phone's reports, newest first
  allReports: Report[]; // this phone's + the district samples (for the map)
  totalPoints: number;
  earnedPoints: number;
  /** Points from this phone's reports sent since Monday. */
  weekPoints: number;
  ready: boolean;
  addReport: (r: NewReport) => Report;
  sendState: (r: Report) => SendState;
  /** Sends one waiting report again now (the retry button). */
  resend: (id: string) => void;
};

const ReportsContext = createContext<Ctx | null>(null);

/** Reports made before the server existed went to Firebase; they must not be sent twice. */
const canSend = (r: Report) => !r.serverId && !r.firebaseId && Boolean(r.photoUri);

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState<ReadonlySet<string>>(() => new Set());
  const inflight = useRef(new Set<string>());
  const reportsRef = useRef(reports);

  // Declared first so the effects below always read the latest list.
  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const stored: Report[] = raw ? JSON.parse(raw) : [];
        // Saved back by the effect below, so the old reports are gone for good.
        setReports(Array.isArray(stored) ? stored.filter((r) => r && !isLegacy(r)) : []);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Save after every change, once the stored list has been read.
  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reports)).catch(() => {});
  }, [reports, ready]);

  const patch = useCallback((id: string, changes: Partial<Report>) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }, []);

  const send = useCallback(
    async (r: Report) => {
      if (!canSend(r) || inflight.current.has(r.id)) return;
      inflight.current.add(r.id);
      setSending(new Set(inflight.current));
      try {
        const res = await uploadReport({
          uri: r.photoUri!,
          mime: r.photoMime || 'image/jpeg',
          explanation: r.title,
          category: r.categoryName,
          categoryId: r.categoryId,
          severity: r.severity,
          department: r.department,
          confidence: r.confidence,
          note: r.note,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          reporter: r.reporter,
          costMin: r.costMin,
          costMax: r.costMax,
        });
        patch(r.id, { serverId: res.id, sendError: undefined });
      } catch (e) {
        const message = (e as Error)?.message || 'Göndərilmədi';
        console.warn('Report upload failed:', message);
        const current = reportsRef.current.find((x) => x.id === r.id);
        patch(r.id, { sendError: message, sendAttempts: (current?.sendAttempts ?? 0) + 1 });
      } finally {
        inflight.current.delete(r.id);
        setSending(new Set(inflight.current));
      }
    },
    [patch]
  );

  const addReport = useCallback<Ctx['addReport']>(
    (r) => {
      const report: Report = {
        ...r,
        createdAt: Date.now(),
        status: 'pending',
        points: 0, // points granted on approval (BRD BR-1)
      };
      setReports((prev) => [report, ...prev.filter((x) => x.id !== report.id)]);
      send(report);
      return report;
    },
    [send]
  );

  const resend = useCallback(
    (id: string) => {
      const r = reportsRef.current.find((x) => x.id === id);
      if (!r) return;
      patch(id, { sendAttempts: 0, sendError: undefined });
      send(r);
    },
    [patch, send]
  );

  // Anything that did not reach the server goes again: right after start, whenever the
  // app comes back to the front, and every 30 s while the app is open.
  useEffect(() => {
    if (!ready) return;
    const retry = () => {
      for (const r of reportsRef.current) {
        if (canSend(r) && (r.sendAttempts ?? 0) < AUTO_RETRY_LIMIT) send(r);
      }
    };
    retry();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retry();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') retry();
    }, RETRY_EVERY_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [ready, send]);

  // Ask the server for the officers' decisions on this phone's reports and reflect them
  // on the matching local report. The dashboard is the source of truth for `status`.
  useEffect(() => {
    const openIds = () =>
      reportsRef.current
        .filter((r) => r.serverId && r.status !== 'resolved' && r.status !== 'rejected')
        .map((r) => r.serverId as string);
    return subscribeReportStatuses(openIds, (statusById) => {
      setReports((prev) => {
        let changed = false;
        const next = prev.map((r) => {
          const remote = r.serverId ? statusById[r.serverId] : undefined;
          if (remote && remote !== r.status) {
            changed = true;
            return { ...r, status: remote };
          }
          return r;
        });
        return changed ? next : prev;
      });
    });
  }, []);

  const value = useMemo<Ctx>(() => {
    // only approved, in-progress and resolved reports count: pending isn't earned yet
    // and rejected never earns.
    const counted = reports.filter(
      (r) => r.status === 'approved' || r.status === 'in_progress' || r.status === 'resolved'
    );
    const sum = (list: Report[]) => list.reduce((s, r) => s + (SEVERITY_POINTS[r.severity] || 0), 0);
    const earnedPoints = sum(counted);
    const since = weekStart().getTime();
    const weekPoints = sum(counted.filter((r) => r.createdAt >= since));
    return {
      reports,
      allReports: [...reports, ...SEED],
      totalPoints: BASE_POINTS + earnedPoints,
      earnedPoints,
      weekPoints,
      ready,
      addReport,
      sendState: (r) =>
        r.serverId ? 'sent' : sending.has(r.id) ? 'sending' : canSend(r) ? 'waiting' : 'stuck',
      resend,
    };
  }, [reports, ready, addReport, sending, resend]);

  return <ReportsContext value={value}>{children}</ReportsContext>;
}

export function useReports(): Ctx {
  const ctx = use(ReportsContext);
  if (!ctx) throw new Error('useReports must be used within ReportsProvider');
  return ctx;
}
