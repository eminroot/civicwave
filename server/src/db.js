import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config, uploadsDir } from './config.js';

/* ------------------------------------------------------------------
   One SQLite file holds every report, its history and the citizens'
   feedback. Photos are files on disk; a row stores their path.
   Everything here is synchronous: never await inside a transaction.
   ------------------------------------------------------------------ */

export const STATUSES = ['pending', 'approved', 'in_progress', 'proof', 'resolved', 'rejected'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const CATEGORIES = [
  'roads', 'water', 'sanitation', 'greenery', 'lighting', 'facades',
  'signage', 'parks', 'construction', 'seasonal', 'other',
];

fs.mkdirSync(config.dataDir, { recursive: true });
export const db = new DatabaseSync(path.join(config.dataDir, 'civicwave.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

const version = db.prepare('PRAGMA user_version').get().user_version;
if (version < 1) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      title             TEXT NOT NULL DEFAULT '',
      explanation       TEXT NOT NULL DEFAULT '',
      category          TEXT NOT NULL DEFAULT '',
      category_id       TEXT NOT NULL DEFAULT 'other',
      severity          TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
      confidence        INTEGER,
      department        TEXT NOT NULL DEFAULT '',
      address           TEXT NOT NULL DEFAULT '',
      lat               REAL,
      lng               REAL,
      reporter          TEXT NOT NULL DEFAULT 'Anonim',
      note              TEXT NOT NULL DEFAULT '',
      source            TEXT NOT NULL DEFAULT 'app',
      rating            INTEGER,
      telegram_user_id  TEXT,
      cost_min          INTEGER,
      cost_max          INTEGER,
      image_path        TEXT,
      status            TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','in_progress','proof','resolved','rejected')),
      worker            TEXT,
      proof_before_path TEXT,
      proof_after_path  TEXT,
      fixed_image_path  TEXT,
      fix_verdict       TEXT,
      resolved_by       TEXT,
      resolved_at       INTEGER,
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reports_created ON reports (created_at DESC);
    CREATE INDEX IF NOT EXISTS reports_status ON reports (status);

    CREATE TABLE IF NOT EXISTS report_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id   INTEGER NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
      kind        TEXT NOT NULL,
      from_status TEXT,
      to_status   TEXT,
      actor       TEXT,
      detail      TEXT,
      at          INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_report ON report_events (report_id, at);

    CREATE TABLE IF NOT EXISTS feedbacks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment     TEXT NOT NULL DEFAULT '',
      report_id   TEXT NOT NULL DEFAULT '',
      category    TEXT NOT NULL DEFAULT '',
      reporter    TEXT NOT NULL DEFAULT 'Anonim',
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS feedbacks_created ON feedbacks (created_at DESC);

    PRAGMA user_version = 1;
  `);
}
if (version < 2) {
  // v2: each photo's fingerprint, so the same photo sent again joins its first report,
  // and how many residents have reported that problem.
  db.exec(`
    ALTER TABLE reports ADD COLUMN photo_hash TEXT;
    ALTER TABLE reports ADD COLUMN report_count INTEGER NOT NULL DEFAULT 1;
    CREATE INDEX IF NOT EXISTS reports_photo_hash ON reports (photo_hash);
    PRAGMA user_version = 2;
  `);
}

/** SQLite binds null, numbers, strings and buffers; anything else becomes null. */
const v = (x) => (x === undefined || x === null || Number.isNaN(x) ? null : typeof x === 'boolean' ? Number(x) : x);

let depth = 0;

/** Runs `fn` in one transaction. A nested call joins the outer one, so an error
 *  anywhere rolls the whole unit back. */
export function tx(fn) {
  if (depth > 0) {
    depth += 1;
    try {
      return fn();
    } finally {
      depth -= 1;
    }
  }
  db.exec('BEGIN IMMEDIATE');
  depth = 1;
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    depth = 0;
  }
}

/* ---------------------------------------------------------------- reports */

const qInsertReport = db.prepare(`
  INSERT INTO reports (
    id, title, explanation, category, category_id, severity, confidence, department, address,
    lat, lng, reporter, note, source, rating, telegram_user_id, cost_min, cost_max, image_path,
    status, worker, fixed_image_path, fix_verdict, resolved_by, resolved_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const qGetReport = db.prepare('SELECT * FROM reports WHERE id = ?');
const qListReports = db.prepare('SELECT * FROM reports ORDER BY created_at DESC, id DESC');
const qInsertEvent = db.prepare(`
  INSERT INTO report_events (report_id, kind, from_status, to_status, actor, detail, at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const qEventsFor = db.prepare('SELECT * FROM report_events WHERE report_id = ? ORDER BY at, id');
const qAllEvents = db.prepare('SELECT * FROM report_events ORDER BY at, id');
const qCountReports = db.prepare('SELECT COUNT(*) AS n FROM reports');

/**
 * Inserts a report and its "created" event. `r.id` and `r.createdAt` are only for
 * imports that keep the old numbering; new reports take the next id.
 */
export function createReport(r) {
  const at = r.createdAt || Date.now();
  return tx(() => {
    const info = qInsertReport.run(
      v(r.id), r.title || '', r.explanation || '', r.category || '', r.categoryId || 'other',
      r.severity || 'medium', v(r.confidence), r.department || '', r.address || '',
      v(r.lat), v(r.lng), r.reporter || 'Anonim', r.note || '', r.source || 'app', v(r.rating),
      v(r.telegramUserId), v(r.costMin), v(r.costMax), v(r.imagePath),
      r.status || 'pending', v(r.worker), v(r.fixedImagePath), v(r.fixVerdict ? JSON.stringify(r.fixVerdict) : null),
      v(r.resolvedBy), v(r.resolvedAt), at, r.updatedAt || at,
    );
    const id = Number(info.lastInsertRowid);
    qInsertEvent.run(id, 'created', null, 'pending', r.reporter || 'Anonim', JSON.stringify({ source: r.source || 'app' }), at);
    if (r.photoHash) qSetHash.run(r.photoHash, id);
    return id;
  });
}

/* ------------------------------------------------- the same photo, the same report */

const qByHash = db.prepare('SELECT * FROM reports WHERE photo_hash = ? ORDER BY id LIMIT 1');
const qSetHash = db.prepare('UPDATE reports SET photo_hash = ? WHERE id = ?');
const qBumpCount = db.prepare('UPDATE reports SET report_count = report_count + 1, updated_at = ? WHERE id = ?');
const qUnhashed = db.prepare("SELECT id, image_path FROM reports WHERE photo_hash IS NULL AND image_path IS NOT NULL AND image_path <> ''");

/** The photo's fingerprint: identical files give the same one. */
export const photoHash = (buf) => createHash('sha256').update(buf).digest('hex');

/** The first report that came with exactly this photo, if any. */
export const findByPhotoHash = (hash) => qByHash.get(hash);

/** Another resident sent the same photo: the report counts one more and its history says who. */
export function addReporter(id, { reporter = 'Anonim', source = 'app', at = Date.now() } = {}) {
  return tx(() => {
    qBumpCount.run(at, Number(id));
    qInsertEvent.run(Number(id), 'duplicate', null, null, reporter, JSON.stringify({ source }), at);
  });
}

/** Fingerprints the photos of reports made before fingerprints existed. Returns how many. */
export function backfillPhotoHashes() {
  let n = 0;
  for (const row of qUnhashed.all()) {
    try {
      qSetHash.run(photoHash(fs.readFileSync(path.join(uploadsDir, path.basename(row.image_path)))), row.id);
      n += 1;
    } catch {
      /* the photo file is gone; nothing to match against */
    }
  }
  return n;
}

export const getReport = (id) => qGetReport.get(Number(id));
export const listReports = () => qListReports.all();
export const countReports = () => qCountReports.get().n;
export const eventsFor = (id) => qEventsFor.all(Number(id));

export function eventsByReport() {
  const map = new Map();
  for (const e of qAllEvents.all()) {
    if (!map.has(e.report_id)) map.set(e.report_id, []);
    map.get(e.report_id).push(e);
  }
  return map;
}

export function addEvent(reportId, kind, { from = null, to = null, actor = null, detail = null, at = Date.now() } = {}) {
  qInsertEvent.run(Number(reportId), kind, v(from), v(to), v(actor), detail == null ? null : JSON.stringify(detail), at);
}

/** Columns a request may change, by their API name. */
const COLUMNS = {
  status: 'status',
  department: 'department',
  worker: 'worker',
  proofBeforePath: 'proof_before_path',
  proofAfterPath: 'proof_after_path',
  fixedImagePath: 'fixed_image_path',
  fixVerdict: 'fix_verdict',
  resolvedBy: 'resolved_by',
  resolvedAt: 'resolved_at',
};

export function updateReport(id, changes, at = Date.now()) {
  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(changes)) {
    const col = COLUMNS[key];
    if (!col) throw new Error(`unknown column ${key}`);
    sets.push(`${col} = ?`);
    values.push(key === 'fixVerdict' && value != null ? JSON.stringify(value) : v(value));
  }
  if (!sets.length) return;
  sets.push('updated_at = ?');
  values.push(at, Number(id));
  db.prepare(`UPDATE reports SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

/** Status of each id that exists, for the citizen app. */
export function statusesFor(ids) {
  const clean = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);
  if (!clean.length) return [];
  return db
    .prepare(`SELECT id, status, updated_at FROM reports WHERE id IN (${clean.map(() => '?').join(',')})`)
    .all(...clean);
}

/* -------------------------------------------------------------- feedbacks */

const qInsertFeedback = db.prepare(`
  INSERT INTO feedbacks (id, rating, comment, report_id, category, reporter, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const qListFeedbacks = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC, id DESC');

export function createFeedback(f) {
  const info = qInsertFeedback.run(
    v(f.id), f.rating, f.comment || '', f.reportId || '', f.category || '', f.reporter || 'Anonim', f.createdAt || Date.now(),
  );
  return Number(info.lastInsertRowid);
}

export const listFeedbacks = () => qListFeedbacks.all();
