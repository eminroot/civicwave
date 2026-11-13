/**
 * Central configuration for the Telegram bot.
 *
 * Every secret is read from the environment — copy `.env.example` to `.env`
 * and fill in your own values. Nothing sensitive is hardcoded here, so no
 * credentials are ever committed to git.
 */

// Load variables from a local .env file when the optional `dotenv` package is
// installed; otherwise fall back to whatever is already in the environment.
try {
  (await import('dotenv')).config();
} catch {
  /* dotenv not installed — use process.env as provided by the runtime */
}

export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

// Gemini — same model the mobile app and web dashboard use.
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = 'gemini-2.5-flash';

// Google Maps key — used for reverse geocoding the location the user shares.
export const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;

// Firebase — SAME project as the mobile app & web dashboard.
export const FIREBASE = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Nərimanov rayonu rough centre (fallback when no GPS is shared).
export const NARIMANOV = { lat: 40.4093, lng: 49.8671 };
