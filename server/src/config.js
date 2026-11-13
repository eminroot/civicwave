import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

// A .env next to package.json is read if present; real environment variables win.
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const positive = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const flag = (value) => /^(1|true|yes|on)$/i.test(String(value || ''));

export const config = {
  port: positive(process.env.PORT, 8090),
  host: process.env.HOST || '0.0.0.0',
  /** SQLite file and uploaded photos live here. Back this folder up. */
  dataDir: path.resolve(ROOT, process.env.DATA_DIR || 'data'),
  /** The command center website, served at "/". */
  webDir: path.resolve(ROOT, process.env.WEB_DIR || '../ZengeZurwebsite'),
  /** Absolute origin used in photo URLs, e.g. https://civicwave.example.az. Empty = relative URLs. */
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/+$/, ''),
  maxUploadBytes: positive(process.env.MAX_UPLOAD_MB, 12) * 1024 * 1024,
  /** When set, the dashboard API and the photos need this key (sign-in on the website). */
  staffKey: process.env.STAFF_KEY || '',
  /** Behind Caddy or nginx: trust X-Forwarded-For / -Proto for client IPs and secure cookies. */
  trustProxy: flag(process.env.TRUST_PROXY),
  /** OpenAI answers both AIDIN chats (app and website) and checks the citizens' photos. */
  openaiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  /** Only for a proxy or a compatible endpoint; normally left empty. */
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};

export const uploadsDir = path.join(config.dataDir, 'uploads');
