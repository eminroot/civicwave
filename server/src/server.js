import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { config, uploadsDir } from './config.js';
import * as store from './db.js';
import { CATEGORIES, STATUSES } from './db.js';
import {
  HttpError, SECURITY_HEADERS, clientIp, cookies, formFile, formText, isHttps, isMultipart,
  rateLimit, readForm, readJson, sendJson,
} from './http.js';
import { IMAGE_TYPES, decodeBase64Image, removeImage, saveImage, sniffImage } from './images.js';
import { aiEnabled, chatReply, classifyPhoto, openaiEnabled, verifyFix } from './ai.js';

/* ==================================================================
   CivicWave server
   - the citizen app and the Telegram bot POST reports with a photo
   - the command center reads, triages and closes them
   - photos are files under data/uploads, rows live in SQLite
   - every change is pushed to open dashboards over Server-Sent Events
   ================================================================== */

/* ------------------------------------------------------------ helpers */

const str = (value, max) => (value == null ? '' : String(value)).trim().slice(0, max);

function int(value, min, max) {
  if (value === '' || value == null) return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
}

function coord(value, limit) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

const SEVERITY_ALIASES = {
  low: 'low', 'aşağı': 'low', asagi: 'low', 1: 'low',
  medium: 'medium', mid: 'medium', orta: 'medium', 2: 'medium',
  high: 'high', 'yüksək': 'high', yuksek: 'high', 3: 'high',
  critical: 'critical', crit: 'critical', kritik: 'critical', urgent: 'critical', 4: 'critical',
};
const normSeverity = (value) => SEVERITY_ALIASES[String(value ?? '').toLowerCase().trim()] || 'medium';
const normCategory = (value) => {
  const v = String(value ?? '').toLowerCase().trim();
  return CATEGORIES.includes(v) ? v : 'other';
};

const imageUrl = (rel) => (rel ? `${config.publicUrl}/${rel}` : null);
const approvedFlag = (status) => (['approved', 'in_progress', 'proof', 'resolved'].includes(status) ? 1 : 0);

function parseJsonColumn(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A database row as the API shows it. Field names match the old Firebase records,
 *  so every client keeps reading `status` (0/1) and `statusText` as before. */
function present(row, events = store.eventsFor(row.id)) {
  return {
    id: String(row.id),
    title: row.title,
    explanation: row.explanation,
    category: row.category,
    categoryId: row.category_id,
    severity: row.severity,
    confidence: row.confidence,
    department: row.department,
    address: row.address,
    location: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null,
    reporter: row.reporter,
    note: row.note,
    source: row.source,
    rating: row.rating,
    costMin: row.cost_min,
    costMax: row.cost_max,
    imageUrl: imageUrl(row.image_path),
    status: approvedFlag(row.status),
    statusText: row.status,
    worker: row.worker,
    proofBeforeUrl: imageUrl(row.proof_before_path),
    proofAfterUrl: imageUrl(row.proof_after_path),
    fixedImageUrl: imageUrl(row.fixed_image_path),
    fixVerdict: parseJsonColumn(row.fix_verdict),
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    createdAtISO: new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at,
    /** How many residents reported it (the same photo sent again counts here). */
    reportCount: row.report_count ?? 1,
    history: events.map((e) => ({
      kind: e.kind,
      from: e.from_status,
      to: e.to_status,
      actor: e.actor,
      detail: parseJsonColumn(e.detail),
      at: e.at,
    })),
  };
}

function findReport(idText) {
  const row = store.getReport(Number(idText));
  if (!row) throw new HttpError(404, 'not_found', 'Müraciət tapılmadı');
  return row;
}

function sanitizeReport(fields) {
  let loc = fields.location;
  if (typeof loc === 'string') {
    try {
      loc = JSON.parse(loc);
    } catch {
      loc = null;
    }
  }
  const lat = coord(loc?.lat ?? fields.lat, 90);
  const lng = coord(loc?.lng ?? fields.lng, 180);
  const both = lat != null && lng != null;
  const source = str(fields.source, 20).toLowerCase();
  return {
    title: str(fields.title, 200),
    explanation: str(fields.explanation ?? fields.description, 4000),
    category: str(fields.category, 120),
    categoryId: normCategory(fields.categoryId ?? fields.category),
    severity: normSeverity(fields.severity),
    confidence: int(fields.confidence, 0, 100),
    department: str(fields.department, 160),
    address: str(fields.address, 300),
    lat: both ? lat : null,
    lng: both ? lng : null,
    reporter: str(fields.reporter, 120) || 'Anonim',
    note: str(fields.note, 2000),
    source: ['app', 'telegram', 'web'].includes(source) ? source : 'app',
    rating: int(fields.rating, 1, 5),
    telegramUserId: str(fields.telegramUserId, 40) || null,
    costMin: int(fields.costMin, 0, 100_000_000),
    costMax: int(fields.costMax ?? fields.cost, 0, 100_000_000),
  };
}

function parseVerdict(text) {
  if (!text) return null;
  try {
    const j = typeof text === 'string' ? JSON.parse(text) : text;
    if (!j || typeof j !== 'object') return null;
    return {
      approved: j.approved === true,
      resolved: j.resolved === true,
      confidence: int(j.confidence, 0, 100) ?? 0,
      reason: str(j.reason, 600),
      manual: j.manual === true,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------ live updates */

const streams = new Set();
let rev = 0;

function broadcast(kind, id = null) {
  rev += 1;
  const msg = `event: change\ndata: ${JSON.stringify({ rev, kind, id: id == null ? null : String(id) })}\n\n`;
  for (const res of streams) res.write(msg);
}

setInterval(() => {
  for (const res of streams) res.write(': ping\n\n');
}, 25000).unref();

/* ---------------------------------------------------------- staff auth */

const SESSION_COOKIE = 'cw_staff';
const sessionToken = config.staffKey
  ? createHmac('sha256', config.staffKey).update('civicwave-staff-session-v1').digest('hex')
  : '';

function sameSecret(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function isStaff(req) {
  if (!config.staffKey) return true;
  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ') && sameSecret(auth.slice(7).trim(), config.staffKey)) return true;
  const c = cookies(req)[SESSION_COOKIE];
  return Boolean(c) && sameSecret(c, sessionToken);
}

function requireStaff(req) {
  if (!isStaff(req)) throw new HttpError(401, 'staff_only', 'Panelə daxil olun');
}

const allowReport = rateLimit({ windowMs: 10 * 60_000, max: 20 });
const allowFeedback = rateLimit({ windowMs: 10 * 60_000, max: 30 });
const allowLogin = rateLimit({ windowMs: 60_000, max: 8 });
const allowAi = rateLimit({ windowMs: 10 * 60_000, max: 40 });
const allowClassify = rateLimit({ windowMs: 10 * 60_000, max: 40 });
const allowChat = rateLimit({ windowMs: 10 * 60_000, max: 80 });

/* ------------------------------------------------------------- routes */

async function health(req, res) {
  sendJson(res, 200, { ok: true, time: Date.now() });
}

async function meta(req, res) {
  sendJson(res, 200, {
    auth: Boolean(config.staffKey),
    signedIn: isStaff(req),
    ai: aiEnabled(),
    chat: openaiEnabled(),
    maxUploadMb: Math.round(config.maxUploadBytes / 1048576),
  });
}

async function login(req, res) {
  if (!config.staffKey) return sendJson(res, 200, { ok: true });
  if (!allowLogin(clientIp(req))) throw new HttpError(429, 'slow_down', 'Çox cəhd edildi, bir dəqiqə gözləyin');
  const body = await readJson(req, 4096);
  if (!sameSecret(str(body.key, 400), config.staffKey)) throw new HttpError(401, 'wrong_key', 'Açar düzgün deyil');
  const secure = isHttps(req) ? '; Secure' : '';
  sendJson(res, 200, { ok: true }, {
    'Set-Cookie': `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure}`,
  });
}

async function logout(req, res) {
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
}

async function events(req, res) {
  requireStaff(req);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...SECURITY_HEADERS,
  });
  res.write(`retry: 4000\nevent: hello\ndata: ${JSON.stringify({ rev })}\n\n`);
  streams.add(res);
  req.on('close', () => streams.delete(res));
}

async function listReports(req, res) {
  requireStaff(req);
  const byReport = store.eventsByReport();
  const reports = store.listReports().map((row) => present(row, byReport.get(row.id) || []));
  sendJson(res, 200, { reports, rev });
}

async function getReport(req, res, [, id]) {
  requireStaff(req);
  sendJson(res, 200, { report: present(findReport(id)) });
}

/** The citizen app and the Telegram bot send a report here: multipart with a `photo`
 *  file, or JSON with `photoBase64`. Replies with the new sequential id. */
async function createReport(req, res) {
  if (!allowReport(clientIp(req))) {
    throw new HttpError(429, 'slow_down', 'Çox sayda müraciət göndərildi, bir az sonra yenidən cəhd edin');
  }
  let fields;
  let photo;
  if (isMultipart(req)) {
    const form = await readForm(req, config.maxUploadBytes + 512 * 1024);
    fields = {};
    for (const [key, value] of form.entries()) if (typeof value === 'string') fields[key] = value;
    photo = await formFile(form, 'photo', 'image');
  } else {
    fields = await readJson(req, Math.ceil(config.maxUploadBytes * 1.37) + 64 * 1024);
    photo = decodeBase64Image(fields.photoBase64 ?? fields.imageBase64);
  }
  if (!photo || !photo.length) throw new HttpError(400, 'photo_required', 'Şəkil tələb olunur');
  if (photo.length > config.maxUploadBytes) throw new HttpError(413, 'too_large', 'Şəkil çox böyükdür');

  const input = sanitizeReport(fields);
  // The very same photo again (another resident, or the same one twice): it joins the
  // first report and gets its number instead of opening a new case.
  const hash = store.photoHash(photo);
  const same = store.findByPhotoHash(hash);
  if (same) {
    store.addReporter(same.id, { reporter: input.reporter, source: input.source });
    broadcast('report', same.id);
    const row = store.getReport(same.id);
    return sendJson(res, 200, {
      id: String(row.id),
      imageUrl: imageUrl(row.image_path),
      status: approvedFlag(row.status),
      statusText: row.status,
      createdAt: row.created_at,
      duplicate: true,
      reportCount: row.report_count,
    });
  }
  const imagePath = await saveImage(photo, 'report');
  let id;
  try {
    id = store.createReport({ ...input, imagePath, photoHash: hash });
  } catch (err) {
    await removeImage(imagePath);
    throw err;
  }
  broadcast('report', id);
  const row = store.getReport(id);
  sendJson(res, 201, {
    id: String(id),
    imageUrl: imageUrl(row.image_path),
    status: 0,
    statusText: 'pending',
    createdAt: row.created_at,
  });
}

/** Status, department or worker, from the command center. */
async function patchReport(req, res, [, id]) {
  requireStaff(req);
  const row = findReport(id);
  const body = await readJson(req, 16 * 1024);
  const actor = str(body.actor, 120) || null;
  const now = Date.now();

  store.tx(() => {
    if (body.statusText != null) {
      const next = String(body.statusText);
      if (!STATUSES.includes(next)) throw new HttpError(400, 'bad_status', 'Naməlum status');
      if (next !== row.status) {
        const changes = { status: next };
        if (next === 'resolved') {
          changes.resolvedBy = actor;
          changes.resolvedAt = now;
          if (!row.fixed_image_path && row.proof_after_path) changes.fixedImagePath = row.proof_after_path;
        }
        if (next === 'in_progress' && !row.worker && body.worker === undefined && actor) changes.worker = actor;
        store.updateReport(row.id, changes, now);
        store.addEvent(row.id, 'status', { from: row.status, to: next, actor, at: now });
      }
    }
    if (body.department != null) {
      const department = str(body.department, 160);
      if (department && department !== row.department) {
        store.updateReport(row.id, { department }, now);
        store.addEvent(row.id, 'department', { actor, detail: { from: row.department, to: department }, at: now });
      }
    }
    if (body.worker !== undefined) {
      const worker = body.worker == null ? null : str(body.worker, 120) || null;
      if (worker !== row.worker) {
        store.updateReport(row.id, { worker }, now);
        store.addEvent(row.id, 'worker', { actor, detail: { worker }, at: now });
      }
    }
  });

  broadcast('report', row.id);
  sendJson(res, 200, { report: present(store.getReport(row.id)) });
}

/** A field worker's before and after photos; the case then waits for a manager. */
async function submitProof(req, res, [, id]) {
  requireStaff(req);
  const row = findReport(id);
  const form = await readForm(req, config.maxUploadBytes * 2 + 512 * 1024);
  const after = await formFile(form, 'after', 'photo');
  if (!after) throw new HttpError(400, 'photo_required', 'Sonrakı vəziyyətin fotosu tələb olunur');
  const before = await formFile(form, 'before');
  const actor = str(formText(form, 'actor'), 120) || null;

  const afterPath = await saveImage(after, `report${row.id}-after`);
  const beforePath = before ? await saveImage(before, `report${row.id}-before`) : null;
  const now = Date.now();
  try {
    store.tx(() => {
      store.updateReport(row.id, {
        proofAfterPath: afterPath,
        proofBeforePath: beforePath || row.proof_before_path,
        status: 'proof',
        worker: row.worker || actor,
      }, now);
      store.addEvent(row.id, 'proof', { from: row.status, to: 'proof', actor, at: now });
    });
  } catch (err) {
    await removeImage(afterPath);
    await removeImage(beforePath);
    throw err;
  }
  broadcast('report', row.id);
  sendJson(res, 200, { report: present(store.getReport(row.id)) });
}

/** A manager closes the case with a photo of the fixed place. */
async function resolveReport(req, res, [, id]) {
  requireStaff(req);
  const row = findReport(id);
  const form = await readForm(req, config.maxUploadBytes + 512 * 1024);
  const photo = await formFile(form, 'photo');
  if (!photo) throw new HttpError(400, 'photo_required', 'Həll fotosu tələb olunur');
  const actor = str(formText(form, 'actor'), 120) || null;
  const verdict = parseVerdict(formText(form, 'verdict'));

  const fixedPath = await saveImage(photo, `report${row.id}-fixed`);
  const now = Date.now();
  try {
    store.tx(() => {
      store.updateReport(row.id, {
        status: 'resolved',
        fixedImagePath: fixedPath,
        fixVerdict: verdict,
        resolvedBy: actor,
        resolvedAt: now,
      }, now);
      store.addEvent(row.id, 'status', {
        from: row.status, to: 'resolved', actor, at: now,
        detail: { photo: true, verdict: verdict ? { approved: verdict.approved, confidence: verdict.confidence, manual: verdict.manual } : null },
      });
    });
  } catch (err) {
    await removeImage(fixedPath);
    throw err;
  }
  broadcast('report', row.id);
  sendJson(res, 200, { report: present(store.getReport(row.id)) });
}

async function verifyFixRoute(req, res, [, id]) {
  requireStaff(req);
  if (!aiEnabled()) throw new HttpError(503, 'ai_unavailable', 'AI yoxlaması bu serverdə qoşulmayıb');
  if (!allowAi(clientIp(req))) throw new HttpError(429, 'slow_down', 'Çox sayda yoxlama, bir az gözləyin');
  const row = findReport(id);
  const form = await readForm(req, config.maxUploadBytes + 512 * 1024);
  const photo = await formFile(form, 'photo');
  const kind = sniffImage(photo);
  if (!kind) throw new HttpError(415, 'unsupported_image', 'Yalnız JPEG, PNG və ya WEBP şəkil qəbul olunur');
  const verdict = await verifyFix(row, photo, kind.mime);
  sendJson(res, 200, { verdict });
}

/** The app's photo check: the photo (base64) with the citizen's note, and on a second
 *  round the answers to the AI's questions. Nothing is stored. */
async function aiClassify(req, res) {
  if (!openaiEnabled()) throw new HttpError(503, 'ai_unavailable', 'AIDIN hələ qoşulmayıb');
  if (!allowClassify(clientIp(req))) throw new HttpError(429, 'slow_down', 'Çox sayda yoxlama, bir az gözləyin');
  const body = await readJson(req, Math.ceil(config.maxUploadBytes * 1.37) + 64 * 1024);
  const image = decodeBase64Image(body.photoBase64);
  if (!image || !image.length) throw new HttpError(400, 'photo_required', 'Şəkil tələb olunur');
  if (image.length > config.maxUploadBytes) throw new HttpError(413, 'too_large', 'Şəkil çox böyükdür');
  const kind = sniffImage(image);
  if (!kind) throw new HttpError(415, 'unsupported_image', 'Yalnız JPEG, PNG və ya WEBP şəkil qəbul olunur');
  const answers = (Array.isArray(body.answers) ? body.answers : [])
    .slice(0, 4)
    .map((a) => ({ question: str(a?.question, 300), answer: str(a?.answer, 600) }))
    .filter((a) => a.question);
  const analysis = await classifyPhoto({ image, mime: kind.mime, note: str(body.note, 1000), answers });
  sendJson(res, 200, { analysis });
}

/** AIDIN. `citizen` is the app's chat; `staff` is the website's, which sends along the
 *  reports its user can see, so it needs the staff key when one is set. */
async function aiChat(req, res) {
  const body = await readJson(req, 256 * 1024);
  const mode = body.mode === 'staff' ? 'staff' : 'citizen';
  if (mode === 'staff') requireStaff(req);
  if (!openaiEnabled()) throw new HttpError(503, 'ai_unavailable', 'AIDIN hələ qoşulmayıb');
  if (!allowChat(clientIp(req))) throw new HttpError(429, 'slow_down', 'Çox sual göndərildi, bir az gözləyin');
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-20)
    .map((m) => ({ role: m?.role === 'assistant' || m?.role === 'model' ? 'assistant' : 'user', text: str(m?.text, 4000) }))
    .filter((m) => m.text);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    throw new HttpError(400, 'message_required', 'Sual yazın');
  }
  const reply = await chatReply({ mode, messages, context: mode === 'staff' ? str(body.context, 120_000) : '' });
  sendJson(res, 200, { reply });
}

/** For the citizen app: the lifecycle of the reports it sent, nothing else. */
async function publicStatuses(req, res, _match, url) {
  const ids = String(url.searchParams.get('ids') || '').split(',');
  const statuses = {};
  for (const row of store.statusesFor(ids)) {
    statuses[String(row.id)] = { status: approvedFlag(row.status), statusText: row.status, updatedAt: row.updated_at };
  }
  sendJson(res, 200, { statuses });
}

async function listFeedbacks(req, res) {
  requireStaff(req);
  const feedbacks = store.listFeedbacks().map((f) => ({
    id: String(f.id),
    rating: f.rating,
    comment: f.comment,
    reportId: f.report_id,
    category: f.category,
    reporter: f.reporter,
    createdAt: f.created_at,
  }));
  sendJson(res, 200, { feedbacks });
}

async function createFeedback(req, res) {
  if (!allowFeedback(clientIp(req))) throw new HttpError(429, 'slow_down', 'Bir az sonra yenidən cəhd edin');
  const body = await readJson(req, 16 * 1024);
  const rating = int(body.rating, 1, 5);
  if (!rating) throw new HttpError(400, 'rating_required', 'Qiymət 1 ilə 5 arasında olmalıdır');
  const id = store.createFeedback({
    rating,
    comment: str(body.comment, 2000),
    reportId: str(body.reportId, 40),
    category: str(body.category, 120),
    reporter: str(body.reporter, 120) || 'Anonim',
  });
  broadcast('feedback', id);
  sendJson(res, 201, { id: String(id) });
}

const routes = [
  ['GET', /^\/api\/health$/, health],
  ['GET', /^\/api\/meta$/, meta],
  ['POST', /^\/api\/session$/, login],
  ['DELETE', /^\/api\/session$/, logout],
  ['GET', /^\/api\/events$/, events],
  ['GET', /^\/api\/reports$/, listReports],
  ['POST', /^\/api\/reports$/, createReport],
  ['GET', /^\/api\/reports\/(\d+)$/, getReport],
  ['PATCH', /^\/api\/reports\/(\d+)$/, patchReport],
  ['POST', /^\/api\/reports\/(\d+)\/proof$/, submitProof],
  ['POST', /^\/api\/reports\/(\d+)\/resolve$/, resolveReport],
  ['POST', /^\/api\/reports\/(\d+)\/verify-fix$/, verifyFixRoute],
  ['GET', /^\/api\/public\/statuses$/, publicStatuses],
  ['POST', /^\/api\/ai\/classify$/, aiClassify],
  ['POST', /^\/api\/ai\/chat$/, aiChat],
  ['GET', /^\/api\/feedbacks$/, listFeedbacks],
  ['POST', /^\/api\/feedbacks$/, createFeedback],
];

/* -------------------------------------------------------------- files */

const WEB_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

// The map library comes from unpkg (pinned, with integrity hashes) and draws
// OpenFreeMap's tiles; it runs its tile work in blob: web workers.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://tiles.openfreemap.org",
  "connect-src 'self' https://tiles.openfreemap.org",
  "worker-src 'self' blob:",
  "child-src blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

async function sendFile(req, res, file, type, cache, extra = {}) {
  let st;
  try {
    st = await fsp.stat(file);
  } catch {
    throw new HttpError(404, 'not_found', 'Tapılmadı');
  }
  if (!st.isFile()) throw new HttpError(404, 'not_found', 'Tapılmadı');
  const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const headers = { ETag: etag, 'Cache-Control': cache, ...SECURITY_HEADERS, ...extra };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  res.writeHead(200, { ...headers, 'Content-Type': type, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

async function serveStatic(req, res, pathname) {
  if (pathname.startsWith('/uploads/')) {
    requireStaff(req);
    const name = pathname.slice('/uploads/'.length);
    const m = /^[A-Za-z0-9_-]+\.(jpg|png|webp)$/.exec(name);
    if (!m) throw new HttpError(404, 'not_found', 'Tapılmadı');
    const cache = `${config.staffKey ? 'private' : 'public'}, max-age=31536000, immutable`;
    return sendFile(req, res, path.join(uploadsDir, name), IMAGE_TYPES[m[1]], cache);
  }

  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'bad_path', 'Yanlış ünvan');
  }
  if (rel.endsWith('/')) rel += 'index.html';
  let ext = path.extname(rel).toLowerCase();
  // Page paths without an extension get the app shell.
  if (!ext) {
    rel = '/index.html';
    ext = '.html';
  }
  const type = WEB_TYPES[ext];
  const hidden = rel.split('/').some((seg) => seg.startsWith('.'));
  const file = path.resolve(config.webDir, `.${rel}`);
  if (!type || hidden || !file.startsWith(config.webDir + path.sep)) throw new HttpError(404, 'not_found', 'Tapılmadı');
  return sendFile(req, res, file, type, 'no-cache', ext === '.html' ? { 'Content-Security-Policy': CSP } : {});
}

/* ------------------------------------------------------------- server */

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    return sendJson(res, 400, { error: 'bad_url' });
  }
  const pathname = url.pathname;
  const api = pathname.startsWith('/api/');

  try {
    if (api) {
      // The citizen endpoints are called from apps on other origins; the staff ones
      // ride on a SameSite=Strict cookie that cross-origin requests never carry.
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '600',
        });
        return res.end();
      }
      const method = req.method === 'HEAD' ? 'GET' : req.method;
      for (const [m, re, handler] of routes) {
        if (m !== method) continue;
        const match = re.exec(pathname);
        if (match) return await handler(req, res, match, url);
      }
      throw new HttpError(404, 'not_found', 'Belə bir ünvan yoxdur');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed', 'İcazə verilmir');
    await serveStatic(req, res, pathname);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (!(err instanceof HttpError)) console.error(`[server] ${req.method} ${pathname}`, err);
    if (res.headersSent) return res.destroy();
    // Whatever body is still arriving is read and dropped by Node once this reply
    // ends, so even a client that is mid-upload gets the message.
    sendJson(res, status, {
      error: err.code || 'server_error',
      message: err instanceof HttpError ? err.message : 'Serverdə xəta baş verdi',
    });
  } finally {
    if (api && pathname !== '/api/events') {
      console.log(`${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  }
});

server.listen(config.port, config.host, () => {
  console.log(`CivicWave server on http://localhost:${config.port}`);
  console.log(`  data: ${config.dataDir}`);
  console.log(`  web:  ${config.webDir}`);
  console.log(`  reports in the database: ${store.countReports()}`);
  const hashed = store.backfillPhotoHashes();
  if (hashed) console.log(`  photo fingerprints added for ${hashed} older reports`);
  if (!config.staffKey) console.log('  STAFF_KEY is not set: the dashboard and its API are open to anyone who can reach this port.');
  if (openaiEnabled()) console.log(`  OpenAI is on (${config.openaiModel}): AIDIN chats, photo check and fix check.`);
  else console.log('  OPENAI_API_KEY is not set in server/.env: the AIDIN chats and the photo check are off.');
  if (!aiEnabled()) console.log('  No AI key: fix photos are confirmed by hand.');
});

function shutdown() {
  for (const res of streams) res.end();
  server.close(() => {
    store.db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
