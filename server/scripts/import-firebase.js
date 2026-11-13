/* Copies the old Firebase data into this server: every /reports record with its
   photos, and every /feedbacks record. Report numbers are kept where they are plain
   integers, so citizens' ids stay the same.

     npm run import:firebase -- --url https://<project>-default-rtdb.firebaseio.com --auth <token>

   The database rules are no longer public, so pass a database secret or an ID token
   with --auth. Reports whose number already exists here are skipped.            */

import { createFeedback, createReport, getReport, CATEGORIES } from '../src/db.js';
import { saveImage } from '../src/images.js';

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const base = String(arg('url') || '').replace(/\/+$/, '');
const auth = arg('auth');
if (!base) {
  console.error('Usage: npm run import:firebase -- --url https://<project>-default-rtdb.firebaseio.com [--auth <token>]');
  process.exit(1);
}

async function readNode(node) {
  const res = await fetch(`${base}/${node}.json${auth ? `?auth=${encodeURIComponent(auth)}` : ''}`);
  const body = await res.json().catch(() => null);
  if (!res.ok || (body && body.error)) throw new Error(`/${node}: ${body?.error || res.status}`);
  return body || {};
}

async function download(url, prefix) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return await saveImage(Buffer.from(await res.arrayBuffer()), prefix);
  } catch (err) {
    console.warn(`  photo not copied (${err.message}): ${url.slice(0, 80)}`);
    return null;
  }
}

const SEV = { low: 'low', medium: 'medium', mid: 'medium', high: 'high', critical: 'critical', crit: 'critical' };
const LIFE = ['pending', 'approved', 'in_progress', 'proof', 'resolved', 'rejected'];

function lifecycle(d) {
  const text = String(d.statusText || (typeof d.status === 'string' && !/^\d+$/.test(d.status) ? d.status : '')).toLowerCase();
  if (LIFE.includes(text)) return text;
  return Number(d.status) === 1 ? 'approved' : 'pending';
}

const reports = await readNode('reports');
let copied = 0;
let skipped = 0;
for (const [key, d] of Object.entries(reports)) {
  if (key === 'counters' || !d || typeof d !== 'object') continue;
  const keepId = /^\d+$/.test(key) && !getReport(Number(key)) ? Number(key) : null;
  if (/^\d+$/.test(key) && !keepId) {
    skipped += 1;
    continue;
  }
  const imagePath = await download(d.imageUrl, 'report');
  const fixedImagePath = await download(d.fixedImageUrl, 'report-fixed');
  const createdAt = Number(d.createdAt) || Date.parse(d.createdAtISO) || Date.now();
  const status = lifecycle(d);
  createReport({
    id: keepId,
    title: d.title || '',
    explanation: d.explanation || d.description || '',
    category: d.category || '',
    categoryId: CATEGORIES.includes(d.categoryId) ? d.categoryId : 'other',
    severity: SEV[String(d.severity || '').toLowerCase()] || 'medium',
    confidence: Number.isFinite(Number(d.confidence)) ? Math.round(Number(d.confidence)) : null,
    department: d.department || '',
    address: d.address || '',
    lat: d.location?.lat ?? null,
    lng: d.location?.lng ?? null,
    reporter: d.reporter || 'Anonim',
    note: d.note || '',
    source: d.source === 'telegram' ? 'telegram' : 'app',
    rating: Number(d.rating) || null,
    telegramUserId: d.telegramUserId != null ? String(d.telegramUserId) : null,
    imagePath,
    status,
    fixedImagePath,
    fixVerdict: d.fixVerdict || null,
    resolvedBy: d.resolvedBy || null,
    resolvedAt: Number(d.resolvedAt) || null,
    createdAt,
    updatedAt: Number(d.resolvedAt) || createdAt,
  });
  copied += 1;
  console.log(`  report ${keepId ?? '(new number)'} copied${imagePath ? ' with photo' : ''}`);
}

const feedbacks = await readNode('feedbacks');
let fb = 0;
for (const d of Object.values(feedbacks)) {
  if (!d || typeof d !== 'object') continue;
  const rating = Math.round(Number(d.rating));
  if (!(rating >= 1 && rating <= 5)) continue;
  createFeedback({
    rating,
    comment: d.comment || '',
    reportId: d.reportId != null ? String(d.reportId) : '',
    category: d.category || '',
    reporter: d.reporter || 'Anonim',
    createdAt: Number(d.createdAt) || Date.now(),
  });
  fb += 1;
}

console.log(`Done: ${copied} reports copied, ${skipped} skipped (number already used), ${fb} feedback entries.`);
