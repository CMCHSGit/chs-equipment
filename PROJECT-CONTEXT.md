# CHS internal tools — context and handoff

Written 7 Oct 2026 for Jonathan Nasrun (CMCHS / Cass Medical). Covers what
exists, how the pieces fit, decisions already made and why, the traps that
cost real time, and what's still open.

**Never print, log or commit the Simpro API key.** It lives in an Apps Script
Script Property. It is still in git history and needs rotating — see Open items.

---

## 1. The systems

| What | Lives at | Source | Data |
|---|---|---|---|
| Equipment / demo loan tracker | demo.chsnz.co.nz | `chs-equipment/index.html` | Firebase RTDB |
| Staff schedule | schedule.chsnz.co.nz | `cmchs-staff-schedule/` (React+Vite) | Firebase Firestore/Auth/FCM |
| SimproSync | schedule.chsnz.co.nz/simprosync/ | `cmchs-staff-schedule/simprosync/` | Simpro, via proxy |
| Ansur PVT → PDF | schedule.chsnz.co.nz/ansurtopdf/ | `cmchs-staff-schedule/public/ansurtopdf/index.html` | none (all client-side) |
| Simpro proxy + push reminders | Apps Script web app | `chs-equipment/.gas-proxy/` | — |
| Daily Firebase→Drive backup | Apps Script | `chs-equipment/.gas-backup/` | — |
| Tile location sync | GitHub Actions (daily 07:00 NZST) | `chs-equipment/scripts/tile_sync.py` | Firebase RTDB |
| Intranet hub | internal.chsnz.co.nz | `cmchs-internal-hub` (separate repo) | Firebase Auth |

Both repos are **public** on GitHub (`CMCHSGit`), deployed by GitHub Pages.
`cmchs-staff-schedule` is its own git repo **nested inside** `chs-equipment` —
`cd` into it before running git there.

### chs-equipment
Zero build. One ~1 MB `index.html` with all JS/CSS inline, plus `manifest.json`,
`sw.js`, icons. Desktop and mobile are separate render paths in the same file
(mobile functions are `mp`-prefixed). Auth is one shared password; `currentOperator`
is a name picker, not a credential.

### cmchs-staff-schedule
React 18 + Vite + `vite-plugin-pwa` (injectManifest). Real Microsoft/Entra sign-in
via Firebase Auth. `users/{uid}.role == 'admin'` gates admin features.
`vite.config.js` has two build entry points (`index.html`, `simprosync/index.html`);
`public/` is copied verbatim, which is where the Ansur page lives.

---

## 2. The Simpro proxy — and the trap that hid a whole feature

`.gas-proxy/Code.js` is an Apps Script web app (`ANYONE_ANONYMOUS`). It handles
Simpro job create/update/close, push reminders on time-driven triggers, and now
SimproSync's relayed API calls.

**Secrets are Script Properties, not constants** (Apps Script → Project Settings):
- `SIMPRO_API_KEY` — read via `simproKey_()`
- `FIREBASE_SCHEDULE_PROJECT_ID` — the staff-schedule Firebase project id, used only
  to validate SimproSync callers' tokens

### ⚠️ `clasp push` does NOT make code live
This cost hours. Pushing updates the project source; the `/exec` URL keeps serving
whatever **deployment version** was last cut. We found the live deployment pinned at
**version @20 while 24 versions existed** — meaning the Simpro job-creation wind-down
had never actually taken effect, and jobs were still being created for weeks.

To deploy for real, from `.gas-proxy/`:
```bash
npx clasp push
npx clasp deploy -i AKfycbzKLt_IP3GPRiNQkYkCep-_Yee06rDwc3uJGnQQuzjVuCSJOImJnaqDgU-3W3q9Y4OHUw
```
That `-i` keeps the same `/exec` URL. Currently at **@25**.

Verify without creating anything (the create branch refuses before calling Simpro):
```bash
PROXY="https://script.google.com/macros/s/AKfycbzKLt_IP3GPRiNQkYkCep-_Yee06rDwc3uJGnQQuzjVuCSJOImJnaqDgU-3W3q9Y4OHUw/exec"
curl -s -L "$PROXY"                                  # {"status":"CHS Simpro Proxy is live"}
curl -s -L "$PROXY?data=%7B%22loanTo%22%3A%22test%22%7D"   # {"success":false,"action":"creation-disabled"}
```
Use **GET with `?data=`** for testing — POST through curl trips over Apps Script's
redirect chain. Browsers are fine (POST, `Content-Type: text/plain`, no `no-cors`).

### Simpro job-creation wind-down
New job creation is off by default. `handlePayload()`'s create branch reads
`/simproConfig.json` from Firebase live on every request, so stale cached tabs are
refused too. Missing config = disabled (fail-safe). Only the tracker's manual
"Create Job" button sends `allowCreate:true`. Updating and closing existing jobs are
untouched and must keep working.

### The `simproSync` action
`{ action:'simproSync', idToken, requests:[{method,path,body}] }`, max 25 requests.
Auth: decode the Firebase ID token (check `aud`/`iss`/`exp`), then `GET` the user's
Firestore `users/{uid}` doc **with that token** — Firestore validates the signature,
so the proxy doesn't have to — and require `role == 'admin'`. Cached in
`CacheService` ≤10 min, keyed by a hash of the token. Paths are checked against a
fixed allowlist; job PATCH bodies are limited to `Stage`/`Status`/`Notes`.
Runs via `UrlFetchApp.fetchAll`. Logs the user's email and each method+path, never the key.

---

## 3. SimproSync

Admin-only. Syncs a Mindray asset spreadsheet into Simpro customer assets, attaches
them to Simpro jobs, and completes those jobs. Replaced a standalone
`C:\SimproSync\SimproSync.html` + local `simpro_key.js`.

- `main.js` — Microsoft sign-in gate, admin check, and the **batching transport**
- `app.js` — sheet picker, preview, apply, report
- `core.js` — matching/validation rules (pure, no network)
- `reader.js` — dependency-free .xlsx/.csv reader

**The browser never sees the Simpro key.** All calls go through the proxy with the
user's Firebase ID token.

### Matching rules
Match on `Serial Number` within each `Site ID`. Blank cells never clear Simpro.
Values outside a list field's options are rejected. Excel errors (`#REF!` etc.) are
never written. **Nothing is ever deleted or archived.** Date fields go as `YYYY-MM-DD`;
"Date Installed" is a Text field and must be `d/mm/yyyy`.

### Multi-sheet
One row per sheet in the workbook, each independently ticked with its own Simpro
asset type (auto: "IT" → Mindray IT, else Mindray). All ticked sheets run as **one**
preview and **one** Apply. A job referenced from more than one sheet is merged into a
single job plan, so it's attached-to and closed once with items from every sheet.
A sheet with no matching `Serial Number` column is skipped with a warning rather than
aborting the run. Non-asset tabs (Reference, Networking…) are ticked by default but
harmlessly skipped — untick them to keep things tidy.

### Job notes
Before completing a job, every attached asset is listed, grouped:
```
Extended Warranty required on these devices:
BeneHeart D6 — SN:DF-12345 (Battery SN:BATT-99881)

Not required on the following:
TM80 II — SN:HJ-67031861
EST and PVT completed - 7/10/2026
```
- Says "No devices require Extended Warranty." when none match, rather than omitting
  the section (silence reads like "didn't check").
- Defibrillators (Device Type containing "defib") also show their battery serial.
- Column lookups are deliberately flexible — "Device Model" not just "Model";
  Battery Serial Number / Battery SN / anything with both "battery" and "serial".
  They're read from the sheet's own headers, so a column Simpro has no field for
  still works.
- Existing notes are **only appended to**, never edited or removed. The skip guard
  compares the exact block about to be written, so a changed list is recognised as new.
- One `<div>` with `<br>` between lines — Simpro's editor runs adjacent block
  elements together, so a `<div>` per line comes out squished.

### Jobs are skipped entirely if
not found · site ≠ assets' site · stage is Complete/Invoiced/Archived · no cost centre ·
"Job : Completed" status missing. If **any** asset fails to attach, the note is not
written and the job is left open. Stage is checked, status is not. Note both the stage
and the existing notes are read at **preview** time, so a job completed in Simpro
between preview and apply is acted on from a stale read.

---

## 4. Performance and correctness traps (hard-won)

### Requests must be issued concurrently or batching does nothing
`main.js`'s transport packs up to **25** calls into one proxy round trip, but only
combines calls landing in the same tick. Sequential `await` in a `for` loop means
every call pays its own ~1.5 s Apps Script round trip. The Apply phase originally did
exactly that — 30–60 s per asset. Fixed, 177 requests → 26.

**Corollary:** a pool narrower than 25 sends part-full batches. Read-phase pools are
at 50 for that reason.

### ⚠️ Never PATCH one asset's custom fields concurrently
Simpro answers **every** concurrent PATCH to the same asset with `200` while silently
losing some values. A run reported 164/164 fields OK; the next preview wanted 37 of
them written again. Worse, when the lost write is the **Serial Number**, the asset
can't be matched next run and gets **created again as a duplicate** (this produced two
blank-serial assets, 55221 and 55223).

So: **one in-flight call per asset, many assets at once.** Fields sequential within an
asset, pool 25 across assets. Batches still fill — with calls from *different* assets,
which don't collide. Job attaches are fine in parallel (verified: 45 of 47 already
attached on re-check).

### Service worker staleness on secondary pages
`/simprosync/` is a separate entry point and never ran vite-plugin-pwa's `registerSW`,
so nothing ever asked the browser to check for a new worker — the old one served a
cached build **indefinitely**, and closing the browser doesn't help. A performance fix
sat live on the server for an hour while every test ran the pre-fix bundle (same
`simprosync-CTy4hDon.js` hash in before/after captures).

`simprosync/main.js` now requests an update on load and reloads once when a new worker
takes over. **If a fix doesn't seem to apply, check the bundle hash in DevTools →
Network before assuming the fix failed.** The Ansur page sidesteps this by being
excluded from the precache entirely.

### Sparse arrays from spreadsheet headers
A header row with a skipped/blank cell leaves a real **hole** in the array, not an
empty string. `.map()`/`.forEach()` skip holes; `.find()`/`.some()`/`.every()` visit
them as `undefined`. An unguarded `header.find(h => h.trim()...)` crashed file loading.
Guard with `h &&` — `mapColumns()` already did.

### Verify *every* inline script block
The Ansur page has two: a 525 KB embedded pdf-lib and the 57 KB app code. Checking
only the largest validated the library and missed a syntax error in the code actually
edited, shipping a page where nothing responded. Check all blocks.

---

## 5. Equipment tracker work

- **Long-term loans** — no end date, assigned to an account manager indefinitely, own
  tinted section, no date-driven reminders, bidirectional transfer, extra confirmation
  before returning. `_loanKey()` uses an `LT|||batchId` tail since there's no end date.
- **Copy loan** — "Copy" beside Transfer on an active loan card (desktop) and "Copy to
  new loan" in the mobile action sheet. Starts a **separate, independent** loan with the
  same devices; the source loan's BatchID/Simpro job/dates are untouched. Mobile hands
  off via `window._mpPendingBookAssets`; mobile flows must call `renderLoans()` first to
  rebuild `_loanGroupMap`.
- **Loan form** — added a "Data cleared on return" checkbox column and a "Return checked
  by" footer block beside "Loan authorised by", matching paper Form 32 Issue 2. The
  checkbox isn't contenteditable and `saveLoanDocChanges()` only reads contenteditable
  cells, so it never round-trips into saved rows.
- **Tile alerts** — Database table column, an amber callout in the item detail panel, and
  a toast when opening a flagged item.

---

## 6. Tile location sync

Was: BlueStacks Android emulator + ADB UI scraping, scrolling the Tile app once a day on
someone's laptop. Now: `scripts/tile_sync.py` calls Tile's backend directly via
[`pytile`](https://github.com/bachya/pytile) and runs on GitHub Actions.

- Matches tiles by the number before `)` in the tile name → `/tileLocations/{tileNo}`
- Needs repo secrets **`TILE_EMAIL`** and **`TILE_PASSWORD`**
- Addresses reverse-geocoded via OpenStreetMap Nominatim (free, no key; 1 req/sec, needs
  a real User-Agent — hence the sleep)
- Alerts: dead → "replace the Tile"; battery_status ≠ NONE → "replace battery soon";
  lost → "no recent location update"
- Writes `lastTimestamp` (raw UTC ISO) as well as the "25 min ago" string, since relative
  text goes stale between daily syncs
- Logs print counts only — the repo is public, so never names or addresses

⚠️ **pytile's `dev` branch ≠ the released version.** `battery_status` exists only on `dev`;
2024.12.0 has no such property, which crashed the first live run. The raw API *does*
return it, so it's read from `tile._tile_data['result']`. Its timestamps are naive-but-UTC.

---

## 7. Ansur PVT → PDF

Self-contained HTML (~590 KB, embeds pdf-lib). Reads Fluke Ansur `.mtr` files entirely in
the browser and renders AS/NZS 3551 EST/PVT PDFs. No server, no API, no secrets.

Served from `public/` (copied verbatim — nothing to bundle) and **excluded from the PWA
precache** via `globIgnores`, same reasoning as the exceljs exclusion: ~590 KB only the
service team opens. A useful side effect is it's always fetched fresh.

Added an **Asset list** panel after conversion: model, serial and asset number per record,
tab-separated with a Copy button — pastes into a spreadsheet as three columns, which is the
shape SimproSync consumes. Asset number comes from the DUT field captioned `CHS/CASS ID`;
the lookup also accepts `CASS ID`, `CHS Asset Number`, `Asset No`, falling back to any field
mentioning asset/CASS. The table gained an "Asset no." column too, so blanks are visible.

**Currently unauthenticated** — anyone with the URL can use the converter. Nothing sensitive
is in the tool itself (files never leave the user's browser), but it hasn't been gated.

---

## 8. Hosting / repo privacy

Researched directly against GitHub's docs: **"If the account that owns the repository uses
GitHub Free or GitHub Free for organizations, the repository must be public"** — for serving
a **Pages site**. Private repos themselves are free and unlimited; it's Pages-on-private that
needs a paid plan. `CMCHSGit` is a personal account, not an org.

So, to make the repos private:
- **GitHub Pro** (~$4/month) — everything keeps working, zero migration; or
- **Stay free, move hosting** — private repos + Cloudflare Pages/Netlify free tier, repoint
  DNS. No subscription, but a one-time deploy/DNS change.

Self-hosting on an office PC was considered and is **not recommended**: HTTPS is mandatory
(service workers, push, and the QR camera all refuse plain HTTP), phones in the field need it
reachable outside the LAN, and it fixes neither repo privacy nor data location — the data is
in Firebase and the Simpro key is in Apps Script, neither of which moves.

### SharePoint — abandoned, don't re-open it
A SharePoint hosting migration was planned (`sharepoint-migration/`, plan in
`~/.claude/plans/`, both now marked superseded). **Dropped 8 Oct 2026** on its own merits,
before the Phase 1 technical validation was ever run: the **SharePoint banner can't be
removed**, and it **isn't mobile friendly** — disqualifying for a demo tracker used on phones
in the field. The outstanding technical risks (mandatory CSP vs ~1 MB of inline script, the
undocumented `.aspx` rename, PWA/service-worker scope) are moot. The folder is kept, not
deleted, because this idea tends to come back.

### internal.chsnz.co.nz — the intranet hub (separate repo)
What SharePoint was wanted for, built properly instead: **`cmchs-internal-hub`**
(cloned to `C:\Users\JonathanNasrun\cmchs-internal-hub`), GitHub Pages, deploys on push.

- **One Microsoft sign-in** via *the staff schedule's* Firebase project, shared by every app
  on the domain — sign in once, survives browser restarts.
- `apps/hub` (Vite + React): tools by category, search, announcements from `tools.json` /
  `announcements.json`. `apps/service/order-parser/` is live.
- Plain HTML pages opt in with two lines in `<head>` loading `/shared/gate.js` (emitted by
  the hub build with a fixed, unhashed name).
- ⚠️ **Ansur and SimproSync stay in `cmchs-staff-schedule`** and are linked from hub cards.
  They only move into the hub when the schedule app does (phase 3) — so there's never more
  than one copy. We already got burned by `_4` vs `_5` of the Ansur page; don't copy them in.
- The site files are public and the sign-in gate is **not** access control. Confidential data
  must come from Firebase behind its rules. No API keys in the repo — follow SimproSync's
  pattern (key in the Apps Script proxy, browser sends only a Firebase ID token).

---

## 9. Working agreements

- Always `git fetch` + merge before committing — another session often pushes concurrently.
- `APP_VERSION` is bumped by a pre-commit hook; don't edit it by hand. On merge conflicts take
  max+1.
- Commit and push once verified; no need to ask first.
- Verify before claiming done: `node --check`, `npm run build`, and for anything deployed,
  confirm what's actually **served** (bundle hash / content), not just what was pushed.
- `cmchs-staff-schedule` is its own repo — `cd` in first.

---

## 10. Open items

**Security**
- [ ] **Rotate the Simpro API key** — removing it from code didn't remove it from git history,
      and the repo is public.
- [ ] Delete leftover key copies: `Documents\Simpro API\simpro_key.txt`, any
      `C:\SimproSync\simpro_key.js`, and the copy uploaded to the old Claude project.
- [ ] Decide whether `/ansurtopdf/` should sit behind the same Microsoft sign-in.

**Data cleanup in Simpro**
- [ ] Assets 55221 / 55223 had blank serials from the lost-write race — serials have since been
      added; confirm the rest of 55218–55229 have their fields populated after a clean Apply.
- [ ] Job 208867 has two note blocks (the old 46-serial one plus the corrected one) — delete
      the old block.

**Decisions pending**
- [ ] Private repos: GitHub Pro vs move hosting to Cloudflare Pages/Netlify. Less pressing now
      the Simpro key is rotated, and the hub's design already assumes public files with
      Firebase-gated data — but all three repos are still public.
- [x] ~~SharePoint Phase 1 validation~~ — plan abandoned 8 Oct 2026 (banner can't be removed,
      not mobile friendly). Replaced by `cmchs-internal-hub`.

**Smaller**
- [ ] Simpro's job-completed emails are signed "CMCHS - Create job for customer demo equipment"
      (the API application's name) — a Simpro admin should rename it.
- [ ] IT sheet columns with no matching Simpro field, silently not synced: `Master IP Address`,
      `Printer IP:Port`, `eGateway IP:Port`, `OS`. Confirm whether they should be.
- [ ] Downloads has six copies of `Export-AnsurToPDF.ps1` and older builder versions — now that
      `/ansurtopdf/` is hosted, delete them so there's one version.
- [ ] Dunedin workbook has `#REF!` formulas in Mindray LAN MAC Address and MID Number — fix in
      the sheet; the tool correctly skips them.
- [ ] `/simprosync/` and `/ansurtopdf/` aren't linked from anywhere — people need the URLs.

**Verification not yet completed**
- [ ] The lost-write fix is reasoned from evidence, not proven. The decisive test: Apply, then
      Preview the same file again — expect **0 to create, 0 to update**. If fields reappear, the
      race wasn't the whole story (the other candidate is custom fields not being writable
      immediately after asset creation).
