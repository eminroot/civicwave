/**
 * CivicWave server client.
 *
 * Each report goes to our own server: the photo is uploaded with the AI result and the
 * place, the server stores both and gives back a sequential id. The command center reads
 * the same records, and the officers' decisions come back here through a small status
 * endpoint that only reveals the reports this phone sent.
 *
 * The server address comes from EXPO_PUBLIC_API_URL in `.env`, for example
 * http://192.168.1.67:8090 while testing on the same Wi-Fi, or https://<domain> in production.
 */
import { File as FsFile } from 'expo-file-system';
import { AppState, Platform } from 'react-native';

import { CategoryId, ReportStatus, Severity } from '@/constants/categories';

const BASE = String(process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

export type ReportUpload = {
  uri: string;
  mime: string;
  explanation: string;
  category: string;
  categoryId: CategoryId;
  severity: Severity;
  department: string;
  confidence: number;
  note?: string;
  address: string;
  lat: number;
  lng: number;
  reporter?: string;
  costMin?: number;
  costMax?: number;
};

export type UploadResult = { id: string; imageUrl: string | null };

function requireBase() {
  if (!BASE) throw new Error('Server ünvanı təyin edilməyib (EXPO_PUBLIC_API_URL)');
}

export async function request(path: string, init: RequestInit, timeoutMs: number) {
  requireBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error((body && body.message) || `Server ${res.status}`);
    return body;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw new Error('Server vaxtında cavab vermədi');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Sends the photo and the report to the server. Resolves with the new report's id. */
export async function uploadReport(data: ReportUpload): Promise<UploadResult> {
  const ext = data.mime.includes('png') ? 'png' : data.mime.includes('webp') ? 'webp' : 'jpg';
  const form = new FormData();
  if (Platform.OS === 'web') {
    // In a browser the photo has to be a real Blob.
    const blob = await (await fetch(data.uri)).blob();
    form.append('photo', blob, `photo.${ext}`);
  } else {
    // On phones `fetch` is Expo's own (since SDK 54), which reads a file part only from an
    // expo-file-system File. The older React Native { uri, name, type } part makes it throw
    // before anything is sent.
    form.append('photo', new FsFile(data.uri) as unknown as Blob, `photo.${ext}`);
  }
  const fields: Record<string, string> = {
    explanation: data.explanation,
    category: data.category,
    categoryId: data.categoryId,
    severity: data.severity,
    department: data.department,
    confidence: String(Math.round(data.confidence)),
    note: data.note ?? '',
    address: data.address,
    location: JSON.stringify({ lat: data.lat, lng: data.lng }),
    reporter: data.reporter ?? 'Anonim',
    source: 'app',
  };
  if (data.costMin) fields.costMin = String(Math.round(data.costMin));
  if (data.costMax) fields.costMax = String(Math.round(data.costMax));
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  const body = await request('/api/reports', { method: 'POST', body: form, headers: { Accept: 'application/json' } }, 60000);
  return { id: String(body.id), imageUrl: body.imageUrl ?? null };
}

/**
 * The server keeps the dashboard's two status fields: `status` (1 from approval on, 0 while
 * pending or rejected) and `statusText` (the exact stage). The app shows the exact stage.
 */
type RemoteStatus = { status?: number | string; statusText?: string };

export function mapRemoteStatus(raw: RemoteStatus): ReportStatus {
  switch (String(raw.statusText || '').toLowerCase()) {
    case 'rejected':
      return 'rejected';
    case 'approved':
      return 'approved';
    case 'in_progress':
    case 'proof': // being checked by a manager: still in progress for the citizen
      return 'in_progress';
    case 'resolved':
      return 'resolved';
    case 'pending':
      return 'pending';
  }
  return Number(raw.status) === 1 ? 'approved' : 'pending';
}

export type RemoteStatusMap = Record<string, ReportStatus>;

/**
 * Asks the server every few seconds for the status of this phone's reports (the ids come
 * from `getIds`) and calls `onChange` with { [serverId]: status }. Pauses while the app is
 * in the background and checks again as soon as it comes back. Returns a stop function.
 */
export function subscribeReportStatuses(
  getIds: () => string[],
  onChange: (map: RemoteStatusMap) => void,
  intervalMs = 8000,
): () => void {
  let stopped = false;
  let busy = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (ms: number) => {
    if (timer) clearTimeout(timer);
    if (!stopped) timer = setTimeout(tick, ms);
  };

  const tick = async () => {
    if (stopped || busy || AppState.currentState === 'background') return;
    const ids = getIds().slice(0, 200);
    if (BASE && ids.length) {
      busy = true;
      try {
        const body = await request(`/api/public/statuses?ids=${encodeURIComponent(ids.join(','))}`, { method: 'GET' }, 15000);
        const map: RemoteStatusMap = {};
        for (const [id, s] of Object.entries((body && body.statuses) || {})) map[id] = mapRemoteStatus(s as RemoteStatus);
        if (!stopped) onChange(map);
      } catch {
        // offline or the server is restarting: try again on the next tick
      } finally {
        busy = false;
      }
    }
    schedule(intervalMs);
  };

  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') schedule(0);
  });
  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    sub.remove();
  };
}

export type FeedbackUpload = {
  rating: number; // 1..5
  comment?: string;
  reportId?: string;
  category?: string;
  reporter?: string;
};

/** Sends a citizen's rating and comment. Resolves with the feedback id. */
export async function submitFeedback(data: FeedbackUpload): Promise<string> {
  const body = await request(
    '/api/feedbacks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        rating: data.rating,
        comment: data.comment ?? '',
        reportId: data.reportId ?? '',
        category: data.category ?? '',
        reporter: data.reporter ?? 'Anonim',
      }),
    },
    20000,
  );
  return String(body.id);
}
