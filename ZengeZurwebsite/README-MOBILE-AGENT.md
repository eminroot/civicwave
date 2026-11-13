# CivicWave — Mobile App Integration README (for the mobile-app agent)

> **Audience:** the AI agent working in the **CivicWave mobile application** session.
> **Author:** the agent working in the **web dashboard** session.
> **Goal:** make the approval flow work end-to-end through Firebase Realtime
> Database. The web dashboard side is **already implemented and verified** — this
> README tells you exactly what the mobile app must read and write so the two
> stay in sync.

---

## 1. The big picture

There are two clients sharing **one Firebase Realtime Database**:

```
   ┌─────────────────────┐        Firebase Realtime DB        ┌─────────────────────┐
   │  MOBILE APP (you)   │ ─ writes new report ─────────────▶ │      /reports        │
   │  citizen submits    │                                    │   1, 2, 3, …         │
   │  reads /status      │ ◀─ reads status updates ────────── │                      │
   └─────────────────────┘                                    └──────────▲───────────┘
                                                                          │ approve / reject
   ┌─────────────────────┐                                               │ writes status
   │  WEB DASHBOARD      │ ─ approves / rejects ──────────────────────────┘
   │  (already done)     │
   └─────────────────────┘
```

- A citizen submits a report from the **mobile app** → a new record is created
  under `/reports`.
- A municipal officer opens the **web dashboard**, sees the report, and presses
  **Approve** or **Reject**.
- The dashboard writes the decision back to that same record.
- The **mobile app** listens to that record and updates its UI
  ("approved" / "rejected" / "under review").

---

## 2. THE CONTRACT — the only thing both sides must agree on

Each report lives at `/reports/<recordKey>` and carries these two status fields:

| Field         | Type     | Meaning                                                                 | Written by |
|---------------|----------|-------------------------------------------------------------------------|------------|
| **`status`**  | `number` | **`1` = APPROVED** (təsdiqləndi), **`0` = NOT approved** (pending OR rejected) | dashboard  |
| **`statusText`** | `string` | Exact lifecycle: `pending` · `approved` · `rejected` · `in_progress` · `proof` · `resolved` | dashboard  |

### What the dashboard guarantees (already verified)

- Officer presses **Approve** → `status = 1`, `statusText = "approved"`.
- Officer presses **Reject**  → `status = 0`, `statusText = "rejected"`.
- When the case is later finished → `status = 1`, `statusText = "resolved"`.
- These are written to the **exact same record key** the report was created
  under, so the decision always maps back to the correct application.

---

## 3. ⚠️ IMPORTANT: `status = 0` is ambiguous on its own

`status` is a simple **approved-or-not** boolean. A value of `0` means **either**:

- the report is **still pending** (officer hasn't decided yet), **or**
- the report was **rejected**.

**You cannot tell "pending" apart from "rejected" using `status` alone.**

👉 **Recommendation for the mobile UI:**

| You want to show…            | Read this                                  |
|------------------------------|--------------------------------------------|
| Simple "Approved? yes/no"    | `status` (1 = yes, 0 = no)                 |
| Precise state (3+ labels)    | `statusText`                               |

Suggested mapping for a clear citizen-facing UI:

| `statusText`   | `status` | Suggested label (AZ)        | Suggested label (EN)   |
|----------------|----------|-----------------------------|------------------------|
| `pending`      | 0        | Gözləyir / Baxılır          | Under review           |
| `approved`     | 1        | Təsdiqləndi                 | Approved               |
| `rejected`     | 0        | Rədd edildi                 | Rejected               |
| `in_progress`  | 1        | İcra olunur                 | In progress            |
| `proof`        | 1        | Yoxlanılır                  | Being verified         |
| `resolved`     | 1        | Həll edildi                 | Resolved / Done        |

If you only need the basic flow the user asked for, treat it simply:
**`status === 1` → show "Approved", `statusText === "rejected"` → show
"Rejected", otherwise → show "Under review".**

---

## 4. Record structure (what one report looks like in the DB)

A single record under `/reports` (this is **data**, not code — for reference):

```
/reports
  /1
      title:        "Zibil qutuları doludur..."
      categoryId:   "sanitation"
      severity:     "high"
      status:       1                 ◀── 1 = approved, 0 = pending/rejected  (READ THIS)
      statusText:   "approved"        ◀── precise lifecycle (READ THIS for exact label)
      description / explanation: "..."
      address:      "Nərimanov rayonu, Bakı"
      location:     { lat: 40.41, lng: 49.85 }
      imageUrl:     "https://...firebasestorage.../..."
      createdAt:    1748600000000     (ms epoch, or ISO string)
      reporter:     "Emin Bağırov"
      # added by the dashboard when a case is closed:
      fixedImageUrl: "https://..."    (the "after" photo)
      resolvedBy:    "Aysel Abbasova"
      resolvedAt:    1748699999999
  /2
      ...
  /counters
      lastId: 2                       ◀── NOT a report; see §6
```

The dashboard only **adds/updates** the status fields (and a few resolution
fields). It never deletes a report and never renames the record key.

---

## 5. What the MOBILE APP must do

### 5.1 On submit (citizen creates a report)

When a citizen submits, create a new record under `/reports/<recordKey>` with at
least these fields:

- `title` (or `description` / `explanation`)
- `categoryId` (one of: `roads`, `water`, `sanitation`, `greenery`, `lighting`,
  `facades`, `signage`, `parks`, `construction`, `seasonal`, `other`)
- `severity` (`low` / `mid` / `high` / `crit`)
- `location` (`{ lat, lng }`) and/or `address`
- `imageUrl` (the citizen's photo, typically uploaded to Firebase Storage)
- `createdAt` (server timestamp or epoch ms)
- **`status: 0`**  ← start as not-approved
- **`statusText: "pending"`**  ← start as pending

> Setting `status: 0` / `statusText: "pending"` on creation makes the very first
> state explicit and keeps the dashboard's reading logic perfectly aligned.

### 5.2 After submit (listen for the officer's decision)

- Attach a **realtime listener** to the report's record (or to
  `/reports/<recordKey>/status` and `/reports/<recordKey>/statusText`).
- When `status` changes to **`1`** → show the report as **Approved**.
- When `statusText` becomes **`rejected`** (status stays `0`) → show **Rejected**.
- While `status` is `0` and `statusText` is `pending` → show **Under review**.

The dashboard polls/writes within a few seconds, so the mobile UI should update
almost immediately after the officer taps Approve/Reject.

### 5.3 Do NOT overwrite the status fields from mobile

After creation, the mobile app should treat `status` and `statusText` as
**read-only**. Only the dashboard changes them. (If the mobile app writes to them
too, you'll get conflicting updates.)

---

## 6. Record keys must be `1, 2, 3, …` (assigned by MOBILE on submit)

The dashboard uses each record's **key name** as the application id and writes the
decision back to that same key (e.g. `/reports/7/status = 1`). So the
status-to-application mapping is automatic — **as long as the keys are the simple
incrementing integers the user wants.**

Because the dashboard never creates records, **the mobile app is responsible for
the key naming.** Recommended approach:

1. Keep a counter node at **`/reports/counters/lastId`** (starts at 0).
2. On each submit, run a **transaction** that increments `lastId` (0 → 1 → 2 …).
3. Write the new report to **`/reports/<newId>`** (e.g. `/reports/1`,
   `/reports/2`, …) using that allocated number as the key.

> The dashboard **already ignores** a child named `counters` when it reads
> `/reports`, so storing the counter at `/reports/counters` is safe — it will not
> appear as a fake report. (If you prefer, place the counter elsewhere such as
> `/counters/lastReportId`; just keep it outside the report list.)

Avoid Firebase `push()` auto-keys (the long `-N...` strings) — the user
specifically wants human-readable incrementing numbers so each `/status` clearly
belongs to a known application number.

---

## 7. Quick checklist for the mobile-app agent

- [ ] On submit, create `/reports/<n>` with an **incrementing integer key** `<n>`.
- [ ] Allocate `<n>` from a counter via a **transaction** (not push-keys).
- [ ] Include `status: 0` and `statusText: "pending"` on the new record.
- [ ] Include `categoryId`, `severity`, `title/description`, `location`,
      `imageUrl`, `createdAt`.
- [ ] Add a **realtime listener** on the record's `status` / `statusText`.
- [ ] Render: `status === 1` → **Approved**; `statusText === "rejected"` →
      **Rejected**; else → **Under review**.
- [ ] Never write to `status` / `statusText` after creation.

---

## 8. Summary (one sentence)

> The dashboard writes **`/reports/<id>/status = 1` on approve** and **`= 0` on
> reject** (with a precise `statusText` alongside); the mobile app should create
> reports under incrementing integer keys with `status: 0`, then listen to that
> record and show **Approved** when `status` turns `1` (and **Rejected** when
> `statusText` is `rejected`).

*The web-dashboard side of this contract is implemented and verified. No further
changes are required there for the approval flow to work.*
