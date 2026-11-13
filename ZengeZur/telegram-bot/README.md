# CivicWave Telegram Bot — @zengezur_bot

A Telegram bot that lets Nərimanov citizens report city problems **without the mobile app**.
It mirrors the app's flow and writes to the **same Firebase project & schema**, so reports from
Telegram appear in the web dashboard alongside app reports.

## Flow (all in Azerbaijani)
1. Citizen sends a **photo** of the problem.
2. **Gemini** classifies it (category, severity, department, confidence, description) and asks
   1–2 clarifying questions if it isn't sure.
3. Citizen **confirms** (or changes the category).
4. Citizen **shares location** (Telegram location button) or types an address.
5. Citizen **rates** urgency (⭐ 1–5).
6. Citizen **writes feedback** (free text, or `/keç` to skip).
7. The report is uploaded to **Firebase Storage** (image) + **Realtime Database** (record).

## Run

```bash
cd telegram-bot
npm install
npm start
```

Then open Telegram, find **@zengezur_bot**, press **Start**, and send a photo.
The bot uses long-polling — no public URL/webhook needed.

## What it writes to Firebase

Identical schema to the mobile app (see `civicwave/FIREBASE_INTEGRATION.md`), under sequential ids:
- Image → Storage `reports/<id>.jpg`
- Record → Realtime DB `/reports/<id>` with: `imageUrl`, `explanation`, `category`, `categoryId`,
  `severity`, `confidence`, `department`, `address`, `location {lat,lng}`, `note`, `status:"pending"`,
  `createdAt`, `createdAtISO`, plus Telegram-specific extras:
  - `source: "telegram"`
  - `rating` (1–5, the citizen's urgency rating)
  - `reporter` (Telegram name) and `telegramUserId`

IDs come from the same `/counters/reportId` transaction the app uses, so app + bot share one numbering.

## Config

Keys live in `config.js` with hackathon defaults (Telegram token, Gemini key, Google Maps key,
Firebase config). Override any of them via environment variables / a `.env` (see `.env.example`).

## Files
- `src/index.js` — bot + conversation state machine
- `src/gemini.js` — Gemini vision classification (mirrors the app)
- `src/firebase.js` — Storage upload (REST) + Realtime DB write (SDK, transactional ids)
- `src/geocode.js` — reverse geocoding via Google Geocoding API
- `src/categories.js` — category/department/severity labels (Azerbaijani)
- `config.js` — tokens & Firebase config

## Note
For the hackathon, Firebase rules are public, so the bot writes without auth. Lock rules down for production.
