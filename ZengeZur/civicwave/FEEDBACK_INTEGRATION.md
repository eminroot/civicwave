> Köhnəlib: tətbiq artıq Firebase istifadə etmir, bütün məlumat CivicWave serverinə gedir. Bax README.md və ../../server/README.md.

# CivicWave → Web Command Center: Feedback Integration Brief

This document tells you how the CivicWave mobile app stores **citizen feedback** in Firebase so you can read it and render it live inside the **Feedbacks tab** of the web admin/command-center application. **Read-only integration** — the web app only needs to *fetch* and *display* this data. Do not write to `/feedbacks` from the web.

This is the sibling of `FIREBASE_INTEGRATION.md` (which covers `/reports`). Same Firebase project, same patterns — only the node and fields differ.

---

## 1. Firebase project

Use this exact web config (same project the mobile app writes to — identical to the reports brief):

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

Only **one** Firebase product is needed for feedback:
- **Realtime Database** (NOT Firestore) — holds all feedback records. There are **no images** attached to feedback, so Cloud Storage is **not** involved here.

> Security note: for the hackathon, Database rules are **fully public** (read & write, no auth). The web app should still treat `/feedbacks` as **read-only** by convention.

---

## 2. Where the data lives

All feedback lives under the **`/feedbacks`** node, keyed by a sequential integer **id**:

```
/feedbacks
   /1   -> { ...feedback fields... }
   /2   -> { ...feedback fields... }
   /3   -> { ...feedback fields... }
   /4   -> { ...feedback fields... }
   /5   -> { ...feedback fields... }
```

There is also an internal counter node used by the mobile app to generate the next id — **ignore it, never display it**:

```
/counters/feedbackId   -> <number>   // internal autoincrement, not feedback
```

(There is a separate `/counters/reportId` for reports — also ignore it.)

---

## 3. The feedback id (IMPORTANT)

- Feedback uses **simple sequential integer ids, stored as strings**: `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, …
- The id is the same in two places: the Realtime DB **key** and the `id` field inside the record.
- **Treat every key as an opaque string.** Don't assume contiguity (a record could theoretically be missing) and don't parse it for meaning. Always **iterate the keys** of `/feedbacks` rather than guessing ids or assuming the count.

---

## 4. Fields in each `/feedbacks/<id>` record

| Field          | Type   | Example                                  | Notes |
|----------------|--------|------------------------------------------|-------|
| `id`           | string | `"5"`                                    | Same as the node key |
| `rating`       | number | `4`                                      | **Star rating, integer 1–5.** Always present, always ≥ 1. Render as 1–5 stars. |
| `comment`      | string | `"Çox rahat oldu, təşəkkürlər"`          | Optional free-text from the citizen (Azerbaijani). **May be an empty string `""`** — if empty, show a muted placeholder like "Şərh yoxdur" or hide the comment line. |
| `reportId`     | string | `"7"`                                    | The `/reports/<id>` this feedback is about. **May be empty `""`** if the report upload failed before feedback was sent. When present, you can link/join to that report. |
| `category`     | string | `"Təmizlik və Tullantılar"`              | Human-readable category name (Azerbaijani) of the related report, denormalized here for convenience so you don't have to join. May be empty. |
| `reporter`     | string | `"Emin Bağırov"`                         | Citizen display name (no auth; display only). Defaults to `"Anonim"`. |
| `createdAt`    | number | `1780126500120`                          | Unix epoch **milliseconds** — use this to **sort** (newest first). |
| `createdAtISO` | string | `"2026-05-30T13:55:00.120Z"`             | Same time, ISO-8601 string (convenience for display/formatting). |

All text is in **Azerbaijani**. The Feedbacks tab UI should be Azerbaijani to match the rest of the dashboard.

> Note: a feedback record is created when the citizen submits a rating on the report success screen. `rating` is mandatory (the submit button is disabled until they pick at least one star); `comment` is optional.

---

## 5. How to fetch and render live (guidance, not exact code)

1. Initialize Firebase with the config above; get the Realtime Database instance.
2. Subscribe to the **`/feedbacks`** node with a **realtime listener** (`onValue`) so the Feedbacks tab updates **live** as citizens submit — no refresh needed. (`onChildAdded` also works if you prefer incremental appends.)
3. The snapshot value is an **object keyed by id** (`{ "1": {...}, "2": {...} }`), **not an array**. Convert it to an array of `{ key, ...fields }`. Guard against `null` (empty node before any feedback exists).
4. **Sort by `createdAt` descending** (newest first).
5. For each item render:
   - the `rating` as 1–5 stars (fill `rating` stars, outline the rest),
   - the `comment` if non-empty (otherwise a muted "Şərh yoxdur"),
   - `reporter`, a formatted date from `createdAt`/`createdAtISO`,
   - and optionally the `category` as a chip/badge.
6. **Cleanup:** detach the `onValue` listener when the Feedbacks tab unmounts/navigates away to avoid leaks.

### Minimal example (modular Web SDK v9+)

```js
import { getDatabase, ref, onValue } from "firebase/database";

const db = getDatabase(app);
const feedbacksRef = ref(db, "feedbacks");

const unsubscribe = onValue(feedbacksRef, (snapshot) => {
  const val = snapshot.val() || {};               // null-safe
  const items = Object.entries(val)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.createdAt - a.createdAt);    // newest first
  renderFeedbacks(items);                          // your render fn
});

// later, when leaving the tab:
// unsubscribe();
```

---

## 6. Suggested UI for the Feedbacks tab

- **Header stat:** average rating = mean of all `rating` values (e.g. "4.3 / 5 · 12 rəy"), plus total count.
- **Optional breakdown:** a 5→1 star distribution bar.
- **List:** one card per feedback — stars, comment, reporter, relative time. Newest on top.
- **Star colors:** filled star amber `#F59E0B` (matches the mobile app), empty star light gray.
- **Empty state:** if `/feedbacks` is empty/null, show "Hələ rəy yoxdur".
- (Optional) If `reportId` is present, make the card click through to that report in the Reports view.

---

## 7. Do / Don't

- ✅ Read `/feedbacks` live with `onValue`, sort by `createdAt` desc, treat keys as opaque strings.
- ✅ Handle empty `comment`, empty `reportId`, and a `null` node gracefully.
- ❌ Don't write, edit, or delete anything under `/feedbacks` from the web (read-only).
- ❌ Don't display `/counters/*`.
- ❌ Don't assume ids are contiguous or that the count equals the highest id.

---

### TL;DR for the integrator
Read **`/feedbacks`** from Realtime Database with a live `onValue` listener → it's an object keyed by sequential string id (`"1"`, `"2"`, …) → each record has `rating` (1–5), optional `comment`, `reporter`, `createdAt`, and a `reportId`/`category` link to the originating report. Convert to an array, sort by `createdAt` desc, render stars + comment in the Feedbacks tab, update live. Ignore `/counters`. Read-only.
