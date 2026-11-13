# CivicWave

<p align="center">
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini">
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet">
  <img src="https://img.shields.io/badge/Telegram_Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Bot">
</p>
<p align="center">
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-555?style=for-the-badge" alt="Platforms">
  <img src="https://img.shields.io/badge/license-MIT-3DA639?style=for-the-badge" alt="License: MIT">
  <img src="https://img.shields.io/badge/language-Azerbaijani-509E2F?style=for-the-badge" alt="Language: Azerbaijani">
  <img src="https://img.shields.io/badge/status-prototype-orange?style=for-the-badge" alt="Status">
</p>

<p align="center">
  <img src="assets/readmeimage.png" width="100%" alt="CivicWave — concept overview">
</p>

A civic issue–reporting platform for the Xətai district of Baku, Azerbaijan. Citizens photograph a street problem; an AI model classifies it; the report lands in a shared Firebase backend; and a role-based web command center lets municipal staff triage, assign, and resolve it. Three clients write to and read from one database, so the whole loop — report → triage → fix → status update — stays in sync in near real time.

The project ships as three independent apps that share a single Firebase project:

| Component | Stack | Role |
|-----------|-------|------|
| **Mobile app** (`ZengeZur/civicwave`) | Expo / React Native, TypeScript, expo-router | Citizen client — capture, AI-classify, submit, track status |
| **Web dashboard** (`ZengeZurwebsite`) | Vanilla HTML/CSS/JS, the Veritas console design, SVG map | Municipal command center — triage, assign, resolve |
| **Server** (`server`) | Node.js 22+, built-in SQLite, no dependencies | Stores reports and photos, serves the dashboard; see [server/README.md](server/README.md) |
| **Telegram bot** (`ZengeZur/telegram-bot`) | Node.js (ESM), Telegram Bot API | Chat-based reporting channel |

> The web dashboard now reads from the CivicWave server instead of Firebase. The mobile app
> and the Telegram bot still write to Firebase until they are switched to the server's API.

All user-facing text is in Azerbaijani.

---

## Architecture & Sync

Firebase is the spine of the system. There is **no custom backend server** — the three clients talk to **Firebase Realtime Database** and **Firebase Storage** directly, and those two services are the integration contract between them.

- **Realtime Database** holds the structured data: every report lives at `/reports/<id>`, citizen feedback at `/feedbacks/<id>`, and a transactional counter at `/counters/reportId` hands out sequential IDs (`1, 2, 3, …`). Because the mobile app and the Telegram bot both increment the same counter, reports from either channel share one numbering scheme.
- **Storage** holds the binary data: the citizen's original photo at `reports/<id>.jpg`, and the staff "after" photo at `reports/<id>_fixed_<ts>.jpg`. The database record only stores the *download URL*, so clients never pass image bytes between each other — they pass a pointer.

A report's lifecycle is encoded in two fields the clients agree on:

- `status` — numeric/string flag (`0` pending, `1` approved/resolved)
- `statusText` — the precise stage: `pending → approved → in_progress → proof → resolved` (or `rejected`)

The mobile app prefers `statusText` (it disambiguates *pending* from *rejected*) and falls back to `status`. The dashboard writes both back when staff act. This shared convention is what keeps a citizen's screen and an officer's screen showing the same truth.

```
                         ┌─────────────────────────────┐
                         │        FIREBASE PROJECT       │
                         │                               │
   Mobile app  ───write──▶  Realtime DB   /reports/<id>  │
   (citizen)   ◀──listen──   /feedbacks/<id>             │
                         │   /counters/reportId          │
   Telegram    ───write──▶                               │
   bot         │         │  Storage  reports/<id>.jpg    │
                         │           reports/<id>_fixed…  │
   Web         ──poll/───▶                               │
   dashboard   ──write───┘                               │
   (staff)                └─────────────────────────────┘
```

---

## Data Flow

**1. Capture (mobile or Telegram).** The citizen takes a photo and shares a location. The image (base64) and a short note go to **Gemini 2.5 Flash**, which returns a JSON verdict: category, severity, estimated repair cost (₼), responsible department, a confidence score, and — if confidence is low — one or two clarifying questions. Low-quality photos are rejected with a retake reason.

**2. Submit → Firebase.** On confirmation the client:
   1. reserves the next sequential ID via a transaction on `/counters/reportId`,
   2. uploads the photo to Storage at `reports/<id>.jpg`,
   3. writes the full record (AI explanation, category, severity, department, confidence, address, `location {lat,lng}`, `status: pending`) to `/reports/<id>`.

   The mobile app uploads via the Firebase JS SDK; the Telegram bot uses the Storage REST endpoint. Both land in the same place.

**3. Consume (web dashboard).** The dashboard short-polls `/reports.json` over the Realtime Database REST API (~4s) and renders the data as a live overview, a filterable queue, and a Leaflet map. Access is role-scoped: a **manager** sees everything, a **department head** sees their department, a **field worker** sees only their assigned tasks.

**4. Act (web dashboard → Firebase).** Staff approve, reject, reassign, or close a report. Closing uploads the "fixed" photo to Storage and runs it back through **Gemini** (`verifyFix`) to confirm the issue is actually resolved before the case is marked `resolved`. Every action is a REST `PATCH` onto `/reports/<id>`.

**5. Status round-trip (back to mobile).** The mobile app keeps a Realtime Database listener on `/reports`. The moment staff change a report's status, the citizen's tracker updates — pending, approved, in progress, resolved — without a refresh.

**Where the Telegram bot fits:** it is a parallel *ingestion* channel. It reverse-geocodes the shared location with the Google Maps API, classifies the photo with Gemini, and writes to the exact same `/reports` schema and Storage bucket. From the dashboard's perspective a Telegram report is indistinguishable from a mobile one except for a `source: "telegram"` tag.

---

## App Flow

### Mobile Application

The citizen journey, left to right:

<table>
  <tr>
    <td align="center"><img src="assets/app1.jpeg" width="150"><br><sub><b>1</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app2.jpeg" width="150"><br><sub><b>2</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app3.jpeg" width="150"><br><sub><b>3</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app4.jpeg" width="150"><br><sub><b>4</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/app5.jpeg" width="150"><br><sub><b>5</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app6.jpeg" width="150"><br><sub><b>6</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app7.jpeg" width="150"><br><sub><b>7</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app8.jpeg" width="150"><br><sub><b>8</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/app9.jpeg" width="150"><br><sub><b>9</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app10.jpeg" width="150"><br><sub><b>10</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app11.jpeg" width="150"><br><sub><b>11</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/app12.jpeg" width="150"><br><sub><b>12</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/app13.jpeg" width="150"><br><sub><b>13</b></sub></td>
  </tr>
</table>

### Web Dashboard

<table>
  <tr>
    <td align="center"><img src="assets/website1.png" width="155"><br><sub><b>1</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/website2.png" width="155"><br><sub><b>2</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/website3.png" width="155"><br><sub><b>3</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/website4.png" width="155"><br><sub><b>4</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/website5.png" width="155"><br><sub><b>5</b></sub></td>
  </tr>
</table>

### Telegram Bot

<table>
  <tr>
    <td align="center"><img src="assets/telegrambot1.jpeg" width="150"><br><sub><b>1</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/telegrambot2.jpeg" width="150"><br><sub><b>2</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/telegrambot3.jpeg" width="150"><br><sub><b>3</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/telegrambot4.jpeg" width="150"><br><sub><b>4</b></sub></td>
    <td align="center">→</td>
    <td align="center"><img src="assets/telegrambot5.jpeg" width="150"><br><sub><b>5</b></sub></td>
  </tr>
</table>

---

## Setup

Each component is configured from environment variables / config files — **no secrets are committed**. Use the same Firebase project across all three so the data stays in sync. `.env.example` at the repo root documents every variable.

### Prerequisites

- Node.js 18+
- A Firebase project with **Realtime Database** and **Storage** enabled
- A **Gemini API key** ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))
- A **Telegram bot token** (from [@BotFather](https://t.me/BotFather)) and a **Google Maps API key** — for the bot only

### 1. Mobile app (Expo)

```bash
cd ZengeZur/civicwave
npm install
cp .env.example .env          # fill in EXPO_PUBLIC_* values
# set your native Google Maps key in app.json (ios/android config)
npx expo start
```

Open the project in Expo Go, or run on a simulator/emulator. Expo only exposes variables prefixed with `EXPO_PUBLIC_` to the client bundle.

### 2. Web dashboard

The dashboard is a static site — no build step.

```bash
cd ZengeZurwebsite
cp firebase-config.example.js firebase-config.js   # fill in your Firebase keys
cp gemini-config.example.js   gemini-config.js     # fill in your Gemini key
```

Then serve the folder (configs must be reachable over HTTP, not `file://`):

```bash
npx serve .
# or: python -m http.server 8000
```

### 3. Telegram bot

```bash
cd ZengeZur/telegram-bot
npm install
cp .env.example .env          # fill in TELEGRAM_TOKEN, GEMINI_API_KEY, GOOGLE_MAPS_KEY, FIREBASE_*
npm start
```

---

## Project Structure

```
.
├── assets/                     # screenshots used in this README
├── ZengeZur/
│   ├── civicwave/              # Expo mobile app
│   │   └── src/
│   │       ├── app/            # expo-router screens (tabs + report flow)
│   │       ├── components/     # shared UI
│   │       ├── constants/      # categories, design tokens
│   │       └── lib/            # firebase.ts, gemini.ts, location.ts, store.tsx
│   └── telegram-bot/           # Node.js (ESM) bot
│       └── src/                # index.js, firebase.js, gemini.js, geocode.js, categories.js
└── ZengeZurwebsite/            # static web dashboard
    ├── index.html
    ├── app.js                  # all dashboard logic + rendering
    ├── firebase.js             # Realtime DB / Storage over REST
    └── gemini.js               # AI fix-verification
```

---

## Security Notes

This started as a hackathon prototype. Before any production use:

- **Lock down Firebase rules.** The Realtime Database and Storage rules are open for the demo; require authentication and validate writes.
- **Proxy AI calls.** Gemini keys are currently used client-side. Move those calls behind a backend so the key is never shipped to a browser or app bundle.
