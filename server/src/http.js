import { Readable, Transform } from 'node:stream';
import { config } from './config.js';

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};

export function sendJson(res, status, body, extra = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...extra,
  });
  res.end(data);
}

const tooLarge = () =>
  new HttpError(413, 'too_large', `Fayl çox böyükdür (ən çox ${Math.round(config.maxUploadBytes / 1048576)} MB)`);

function checkDeclaredLength(req, max) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > max) throw tooLarge();
}

export async function readBuffer(req, max) {
  checkDeclaredLength(req, max);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw tooLarge();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req, max = 64 * 1024) {
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    throw new HttpError(415, 'json_required', 'Sorğu JSON formatında olmalıdır');
  }
  const buf = await readBuffer(req, max);
  try {
    const body = JSON.parse(buf.toString('utf8') || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return body;
  } catch {
    throw new HttpError(400, 'bad_json', 'JSON oxunmadı');
  }
}

export const isMultipart = (req) => String(req.headers['content-type'] || '').startsWith('multipart/form-data');

/** Parses multipart/form-data with the platform's own parser, capped at `max` bytes. */
export async function readForm(req, max) {
  if (!isMultipart(req)) throw new HttpError(415, 'multipart_required', 'Sorğu multipart/form-data olmalıdır');
  checkDeclaredLength(req, max);
  let seen = 0;
  let exceeded = false;
  const cap = new Transform({
    transform(chunk, _enc, cb) {
      seen += chunk.length;
      if (seen > max) {
        exceeded = true;
        cb(tooLarge());
      } else cb(null, chunk);
    },
  });
  const request = new Request('http://localhost/upload', {
    method: 'POST',
    headers: { 'content-type': req.headers['content-type'] },
    body: Readable.toWeb(req.pipe(cap)),
    duplex: 'half',
  });
  try {
    return await request.formData();
  } catch {
    if (exceeded) throw tooLarge();
    throw new HttpError(400, 'bad_form', 'Forma oxunmadı');
  }
}

export const formText = (form, name) => {
  const value = form.get(name);
  return typeof value === 'string' ? value : undefined;
};

export async function formFile(form, ...names) {
  for (const name of names) {
    const value = form.get(name);
    if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function' && value.size > 0) {
      return Buffer.from(await value.arrayBuffer());
    }
  }
  return null;
}

export function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* ignore a malformed cookie */
    }
  }
  return out;
}

export function clientIp(req) {
  if (config.trustProxy) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || 'unknown';
}

export function isHttps(req) {
  if (req.socket.encrypted) return true;
  return config.trustProxy && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

/** A fixed-window counter per key: `allow(key)` is false once `max` hits land in `windowMs`. */
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return function allow(key) {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || now - h.start > windowMs) {
      h = { start: now, n: 0 };
      hits.set(key, h);
    }
    h.n += 1;
    if (hits.size > 10000) {
      for (const [k, x] of hits) if (now - x.start > windowMs) hits.delete(k);
    }
    return h.n <= max;
  };
}
