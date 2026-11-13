/**
 * Firebase integration — writes to the SAME project/schema as the mobile app:
 *   image  -> Cloud Storage  reports/<id>.jpg
 *   record -> Realtime DB     /reports/<id>
 * IDs are sequential (1, 2, 3 …) via a transaction on /counters/reportId,
 * shared with the mobile app so both sources stay in one numbering.
 *
 * Storage upload uses the REST endpoint (rules are public for the hackathon);
 * the Realtime Database uses the modular SDK so the id counter is transactional.
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref as dbRef, runTransaction, set } from 'firebase/database';

import { FIREBASE } from '../config.js';

const app = initializeApp(FIREBASE);
const db = getDatabase(app);
const BUCKET = FIREBASE.storageBucket;

async function nextReportId() {
  const result = await runTransaction(dbRef(db, 'counters/reportId'), (cur) => (cur || 0) + 1);
  return Number(result.snapshot.val()) || 1;
}

async function uploadImage(id, buffer, mime) {
  const ext = mime.includes('png') ? 'png' : 'jpg';
  const objectPath = `reports/${id}.${ext}`;
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(
    objectPath
  )}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': mime },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Storage ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const meta = await res.json();
  const token = Array.isArray(meta.downloadTokens)
    ? meta.downloadTokens[0]
    : (meta.downloadTokens || '').split(',')[0];
  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(
    objectPath
  )}?alt=media&token=${token}`;
  return { imageUrl, storagePath: objectPath };
}

/**
 * @param {Buffer} buffer image bytes
 * @param {string} mime   image content-type
 * @param {object} data   { explanation, categoryId, category, severity, confidence,
 *                          department, note, address, lat, lng, reporter, rating, telegramUserId }
 */
export async function uploadReportToFirebase(buffer, mime, data) {
  const id = String(await nextReportId());
  const { imageUrl, storagePath } = await uploadImage(id, buffer, mime);

  const createdAt = Date.now();
  await set(dbRef(db, `reports/${id}`), {
    id,
    imageUrl,
    storagePath,
    explanation: data.explanation,
    category: data.category,
    categoryId: data.categoryId,
    severity: data.severity,
    confidence: data.confidence,
    department: data.department,
    note: data.note ?? '',
    rating: data.rating ?? null,
    address: data.address,
    location: { lat: data.lat, lng: data.lng },
    reporter: data.reporter ?? 'Telegram istifadəçisi',
    source: 'telegram',
    telegramUserId: data.telegramUserId ?? null,
    status: 'pending',
    createdAt,
    createdAtISO: new Date(createdAt).toISOString(),
  });

  return { id, imageUrl };
}
