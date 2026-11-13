import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { uploadsDir } from './config.js';
import { HttpError } from './http.js';

/** Recognises the photo by its first bytes, never by the name or type the client sent. */
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

export const IMAGE_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Accepts plain base64 or a data URL. */
export function decodeBase64Image(value) {
  const raw = String(value || '').replace(/^data:[^;,]+;base64,/, '').replace(/\s+/g, '');
  if (!raw) return null;
  return Buffer.from(raw, 'base64');
}

/**
 * Writes the photo under data/uploads with a random name and returns the path the
 * database stores ("uploads/<name>"). Written to a temp name first, so a reader never
 * sees half a file.
 */
export async function saveImage(buf, prefix = 'photo') {
  const kind = sniffImage(buf);
  if (!kind) throw new HttpError(415, 'unsupported_image', 'Yalnız JPEG, PNG və ya WEBP şəkil qəbul olunur');
  await fs.mkdir(uploadsDir, { recursive: true });
  const name = `${prefix}-${randomBytes(9).toString('hex')}.${kind.ext}`;
  const tmp = path.join(uploadsDir, `.${name}.part`);
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, path.join(uploadsDir, name));
  return `uploads/${name}`;
}

export async function removeImage(relPath) {
  if (!relPath) return;
  try {
    await fs.unlink(path.join(uploadsDir, path.basename(relPath)));
  } catch {
    /* already gone */
  }
}
