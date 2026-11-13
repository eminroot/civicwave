# CivicWave server

Stores the citizens' reports and their photos, and serves the command center website
(`../ZengeZurwebsite`). It replaces Firebase: the phone app and the Telegram bot send
reports here, the photos are saved on this machine, and the website reads everything
back from this server's database.

- Node.js 22.13 or newer, no npm packages (SQLite is built into Node)
- One SQLite file and a folder of photos under `data/` (back this folder up)
- Every change is pushed to open dashboards at once (Server-Sent Events)

## Run it

```bash
cd server
cp .env.example .env      # optional, see the settings below
npm start                 # http://localhost:8090
```

The dashboard opens at `/`. With an empty database it shows empty states; to try it with
sample reports (Xətai streets, no photos, marked as samples):

```bash
npm run seed:demo                 # only into an empty database
npm run seed:demo -- --remove     # delete the samples again
```

## Settings

| variable | default | what it does |
|---|---|---|
| `PORT` | `8090` | port to listen on |
| `DATA_DIR` | `data` | SQLite file (`civicwave.db`) and `uploads/` |
| `WEB_DIR` | `../ZengeZurwebsite` | the website served at `/` |
| `PUBLIC_URL` | empty | e.g. `https://civicwave.example.az`; makes photo URLs absolute |
| `MAX_UPLOAD_MB` | `12` | biggest photo accepted |
| `STAFF_KEY` | empty | when set, the dashboard asks for this key once; the report list, photos and every staff action need it |
| `TRUST_PROXY` | `0` | set to `1` behind Caddy or nginx (client IPs, secure cookie) |
| `OPENAI_API_KEY` | empty | turns on AIDIN: the app's chat and photo check, the website's chat, and the check of the manager's "fixed" photo. The key stays on this server |
| `OPENAI_MODEL` | `gpt-5.4-mini` | OpenAI model; if the account does not have it, `gpt-5-mini` and then `gpt-4.1-mini` are tried |
| `GEMINI_API_KEY` | empty | optional, older: the "fixed" photo check when no OpenAI key is set |
| `GEMINI_MODEL` | `gemini-2.5-flash` | model for that check |

Without `STAFF_KEY` anyone who can reach the port can read and change reports, so set it
before the server is public.

## API

All bodies are JSON unless marked multipart. Errors come back as
`{ "error": "<code>", "message": "<Azerbaijani text>" }` with a 4xx or 5xx status.

### For the phone app and the Telegram bot (no key needed)

**`POST /api/reports`** creates a report. Send `multipart/form-data` with the photo in a
`photo` field, or JSON with the photo as base64 in `photoBase64` (a data URL works too).
JPEG, PNG or WEBP, up to `MAX_UPLOAD_MB`.

| field | example | notes |
|---|---|---|
| `photo` / `photoBase64` | | required |
| `explanation` | `"Yolda dərin çuxur var..."` | the AI's description |
| `category`, `categoryId` | `"Yollar və Asfalt"`, `"roads"` | ids: roads, water, sanitation, greenery, lighting, facades, signage, parks, construction, seasonal, other |
| `severity` | `"critical"` | low, medium, high, critical (mid and crit are accepted too) |
| `confidence` | `94` | 0 to 100 |
| `department` | `"Yol İstismar İdarəsi"` | |
| `address` | `"Babək prospekti"` | |
| `location` | `{"lat":40.39,"lng":49.89}` | or separate `lat` and `lng` fields |
| `reporter`, `note` | | optional |
| `source` | `"app"` | app, telegram or web |
| `rating`, `telegramUserId`, `costMin`, `costMax` | | optional |

Reply, `201`:

```json
{ "id": "15", "imageUrl": "/uploads/report-85331e22.jpg", "status": 0, "statusText": "pending", "createdAt": 1794489721074 }
```

Ids are sequential (`1`, `2`, `3`...), like the Firebase counter before.

**`GET /api/public/statuses?ids=1,2,15`** returns the lifecycle of the citizen's own
reports, nothing else:

```json
{ "statuses": { "15": { "status": 0, "statusText": "pending", "updatedAt": 1794489721074 } } }
```

`status` is `1` from approval on and `0` while pending or rejected; `statusText` is the
exact stage: `pending`, `approved`, `in_progress`, `proof`, `resolved`, `rejected`. These
are the same two fields the app read from Firebase.

**`POST /api/feedbacks`** `{ rating: 1-5, comment?, reportId?, category?, reporter? }`

**`POST /api/ai/classify`** `{ photoBase64, note?, answers?: [{ question, answer }] }` checks a
citizen's photo before the report is sent and replies with
`{ analysis: { imageQualityOk, retakeReason, categoryId, severity, severityReason, costMin, costMax, confidence, summary, clarifyingQuestions } }`.
Nothing is stored. Needs `OPENAI_API_KEY`.

**`POST /api/ai/chat`** `{ mode: "citizen" | "staff", messages: [{ role: "user" | "assistant", text }], context? }`
replies `{ reply }` in plain text. `citizen` is the app's AIDIN. `staff` is the website's: it
sends the reports its user can see as `context`, so it needs the staff key when one is set.

### For the dashboard (need the staff key when `STAFF_KEY` is set)

| | |
|---|---|
| `GET /api/reports` | every report with its history, newest first |
| `GET /api/reports/:id` | one report |
| `PATCH /api/reports/:id` | `{ statusText?, department?, worker?, actor }` |
| `POST /api/reports/:id/proof` | multipart: `after` (required), `before`, `actor`; status becomes `proof` |
| `POST /api/reports/:id/resolve` | multipart: `photo`, `actor`, `verdict` (JSON); status becomes `resolved` |
| `POST /api/reports/:id/verify-fix` | multipart: `photo`; replies `{ verdict: { approved, resolved, confidence, reason } }` (OpenAI, or Gemini when only that key is set) |
| `GET /api/feedbacks` | all feedback |
| `GET /api/events` | Server-Sent Events: `change` after every write |
| `GET /uploads/<name>` | a photo |

The website signs in with `POST /api/session { key }`, which sets an HttpOnly,
SameSite=Strict cookie; other clients can send `Authorization: Bearer <STAFF_KEY>`.
`DELETE /api/session` signs out. `GET /api/meta` tells the website whether a key is
needed, whether the AI check is on (`ai`) and whether AIDIN can chat (`chat`).

## Moving the old Firebase data

The old Realtime Database rules are no longer public, so pass a database secret or an ID
token:

```bash
npm run import:firebase -- --url https://<project>-default-rtdb.firebaseio.com --auth <token>
```

It copies every report with its photos (keeping the numbers) and the feedback.

## On a server

Run it with systemd (or pm2) and put Caddy or nginx in front for HTTPS:

```
civicwave.example.az {
    reverse_proxy localhost:8090
}
```

Set `TRUST_PROXY=1`, `PUBLIC_URL`, and `STAFF_KEY` in `.env`. Caddy passes the live
updates through as they are; with nginx turn `proxy_buffering off` for `/api/events`.
