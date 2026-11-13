> Köhnəlib: tətbiq artıq Firebase istifadə etmir, bütün məlumat CivicWave serverinə gedir. Bax README.md və ../../server/README.md.

# CivicWave → Web Command Center: Firebase Integration Brief

This document tells you how the CivicWave mobile app stores citizen reports in Firebase so you can read and display them in the web admin/command-center application. **Read-only integration** — the web app only needs to *fetch* this data (you may also update `status`, see the end).

---

## 1. Firebase project

Use this exact web config (same project the mobile app writes to):

```js
const firebaseConfig = {
  apiKey: "AIzaSyBddU5RNPQuFg6sKr8JzW1RKZNd90Dz7Jc",
  authDomain: "cyberxbank-7dc0b.firebaseapp.com",
  databaseURL: "https://cyberxbank-7dc0b-default-rtdb.firebaseio.com",
  projectId: "cyberxbank-7dc0b",
  storageBucket: "cyberxbank-7dc0b.firebasestorage.app",
  messagingSenderId: "448176780627",
  appId: "1:448176780627:web:463aab01136eef36c85da6",
  measurementId: "G-RXMNBXBJVW"
};
```

Two Firebase products are used:
- **Realtime Database** (NOT Firestore) — holds the report records (text + metadata + image URL).
- **Cloud Storage** — holds the actual image files.

> Security note: for the hackathon, Database and Storage rules are **fully public** (read & write, no auth). Keep that in mind; lock down later.

---

## 2. Where the data lives

### Realtime Database
All reports live under the **`/reports`** node, keyed by a report **id**:

```
/reports
   /1      -> { ...report fields... }
   /2      -> { ...report fields... }
   /3      -> { ...report fields... }
```

There is also a counter node used internally by the mobile app — **ignore it**, do not display it:
```
/counters/reportId   -> <number>   // internal autoincrement, not a report
```

### Cloud Storage
Each report's image is stored at:
```
reports/<id>.jpg        (occasionally .png)
```
e.g. report `/reports/7` → image file `reports/7.jpg`.

---

## 3. The report id (IMPORTANT)

- New reports use **simple sequential integer ids as strings**: `"1"`, `"2"`, `"3"`, …
- A few **older/legacy records** may have a timestamp-style id like `"1780124403242-7012"`.
- **Treat every key as an opaque string.** Do not parse it, do not assume it is a number, just use it as-is. Always iterate the keys of `/reports` rather than guessing ids.
- The id appears in three consistent places for the same report: the Realtime DB **key**, the `id` field, and inside `storagePath` / the image filename.

---

## 4. Fields in each `/reports/<id>` record

| Field           | Type     | Example                                   | Notes |
|-----------------|----------|-------------------------------------------|-------|
| `id`            | string   | `"7"`                                      | Same as the node key |
| `imageUrl`      | string   | `https://firebasestorage.googleapis.com/v0/b/.../o/reports%2F7.jpg?alt=media&token=...` | **Direct, ready-to-use download URL.** Put it straight into `<img src>`. No extra Storage call needed. |
| `storagePath`   | string   | `"reports/7.jpg"`                          | Path inside Storage, if you prefer to resolve the URL yourself via the Storage SDK |
| `explanation`   | string   | `"Zibil qutuları doludur və tullantılar..."` | AI (Gemini) generated description of the problem, in Azerbaijani |
| `category`      | string   | `"Təmizlik və Tullantılar"`                | Human-readable category name (Azerbaijani) |
| `categoryId`    | string   | `"sanitation"`                             | Machine category key — use for filtering/colors (see §6) |
| `severity`      | string   | `"critical"`                               | One of: `low`, `medium`, `critical` |
| `confidence`    | number   | `95`                                       | AI confidence 0–100 |
| `department`    | string   | `"Təmizlik və Tullantı İdarəsi"`           | Responsible department (auto-assigned) |
| `address`       | string   | `"Atatürk Avenue, Baku"`                   | Reverse-geocoded street address |
| `location`      | object   | `{ lat: 40.4093, lng: 49.8671 }`           | GPS coordinates — use for the map |
| `reporter`      | string   | `"Emin Bağırov"`                           | Citizen name (no auth; display name only) |
| `note`          | string   | `"Əlasız"`                                 | **Citizen's free-text feedback/comment.** May be empty (`""`). **Display this** — it's the citizen's own words. |
| `status`        | string   | `"pending"`                                | Lifecycle: `pending` → `approved` → `in_progress` → `resolved` |

### Extra fields present on reports submitted via the Telegram bot (`source: "telegram"`)
These are **not** on mobile-app reports, so guard with `?.` / null checks. **Do display `rating` and `note`.**

| Field            | Type   | Example      | Notes |
|------------------|--------|--------------|-------|
| `source`         | string | `"telegram"` | Origin of the report. Mobile-app reports omit this (treat as `"app"`). |
| `rating`         | number | `5`          | Citizen's urgency rating, **1–5 stars**. Show as ⭐. (null on app reports) |
| `telegramUserId` | number | `448176780627` | Telegram user id of the reporter (internal). |

> If a citizen's feedback "isn't showing up", it's almost always because the web UI isn't rendering the `note` field — the data is in the database. Verify by checking `/reports/<id>/note` directly.
| `createdAt`     | number   | `1780124405060`                            | Unix epoch **milliseconds** — use this to sort |
| `createdAtISO`  | string   | `"2026-05-30T07:00:05.060Z"`               | Same time, ISO-8601 string (convenience) |

All text is in **Azerbaijani**. The web UI should also be Azerbaijani to match.

---

## 5. How to fetch (guidance, not exact code)

1. Initialize Firebase with the config above; get the Realtime Database instance.
2. Subscribe to the **`/reports`** node (use a realtime listener like `onValue` so the dashboard updates live as citizens submit).
3. The snapshot value is an **object keyed by id** (`{ "1": {...}, "2": {...} }`), not an array. Convert to an array of `{ key, ...fields }`.
4. **Sort by `createdAt` descending** (newest first).
5. To show the photo: bind `record.imageUrl` directly to an `<img>` — it is a fully-formed, token-authenticated download URL. You do **not** need the Storage SDK for display.
   - (Optional) If you ever want to re-derive the URL yourself, use the Storage SDK `getDownloadURL(ref(storage, record.storagePath))`.
6. Filtering: filter by `categoryId`, `severity`, and `status`. Plot pins on a map using `location.lat` / `location.lng`, colored by category (see §6) or by severity.

---

## 6. Enumerations (for filters, colors, labels)

**`severity`** → suggested colors:
- `low` = green `#16A34A`
- `medium` = amber `#F59E0B`
- `critical` = red `#DC2626`

**`status`** (lifecycle order): `pending` → `approved` → `in_progress` → `resolved`

**`categoryId`** → Azerbaijani name → suggested pin color:

| categoryId     | Name (AZ)                  | Color     |
|----------------|----------------------------|-----------|
| `roads`        | Yollar və Asfalt           | `#3B5BDB` |
| `water`        | Su və Subasma              | `#0EA5E9` |
| `sanitation`   | Təmizlik və Tullantılar    | `#F97316` |
| `greenery`     | Yaşıllıq və Ağaclar        | `#16A34A` |
| `lighting`     | Küçə İşıqlandırması         | `#F59E0B` |
| `facades`      | Bina Fasadları             | `#8B5CF6` |
| `signage`      | Reklam və Vitrinlər        | `#EC4899` |
| `parks`        | Parklar və Avadanlıq       | `#14B8A6` |
| `construction` | Tikinti Sahələri           | `#CA8A04` |
| `seasonal`     | Buz və Mövsümi             | `#38BDF8` |

---

## 7. (Optional) Updating a report from the web

The web command center may move a report through its lifecycle by writing the `status` field back:
- Write to `/reports/<id>/status` with one of `pending` | `approved` | `in_progress` | `resolved`.
- Rules are currently open, so writes succeed without auth. The mobile app reads status to show the citizen their progress timeline.

Do **not** delete or rewrite the `id`, `imageUrl`, or `storagePath` fields.

---

### TL;DR for the integrator
Read `/reports` from Realtime Database → it's an object keyed by report id → each record already contains a ready-to-use `imageUrl` plus `explanation`, `category`/`categoryId`, `severity`, `status`, `address`, `location {lat,lng}`, `reporter`, and `createdAt`. Sort by `createdAt` desc, filter by `categoryId`/`severity`/`status`, and show images straight from `imageUrl`. Treat ids as opaque strings. Ignore `/counters`.
