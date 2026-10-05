# SimproSync handoff: for Claude Code in VS Code (chs-equipment)

Prepared 5 Oct 2026, from a Cowork session with Jonathan Nasrun. This brief covers what's built, what's half-done, and exactly what's left. **Never print, log or commit the Simpro API key.**

---

## 1. What SimproSync is

SimproSync is an admin-only web tool. It syncs a customer's Mindray asset list (.xlsx/.csv) into Simpro customer assets, and it can also attach those assets to Simpro jobs and complete the jobs. It replaces Simpro's CSV import screen.

**Asset sync rules** (tested end-to-end against real Simpro):

- **Matching:** on the `Serial Number` custom field, within each row's `Site ID`. An existing serial gets a PATCH on each changed custom field. A new serial gets a POST to create the asset (`{AssetType:114, StartDate}` from Date Installed), followed by PATCHes for its fields.
- **Blank cells** never clear a Simpro value.
- **List fields:** a value that isn't one of the field's ListItems is rejected with a warning.
- **Excel errors** (`#REF!`, `#N/A` and so on) are never written. Excel errors already stored in Simpro are reported.
- **Dates:**
  - Date-type fields are sent as `YYYY-MM-DD`.
  - "Date Installed" is a **Text** field and must be sent as `d/mm/yyyy` (e.g. `1/09/2017`, with no leading zero on the day).
- **Nothing is ever deleted or archived.**
- **Workflow:** a dry run first, then Apply (with a confirmation). A CSV report downloads after the run and records who ran it.

**Jobs:** these apply when the sheet has a `Simpro Job` column (a leading `#` is allowed).

- Group the rows by job number. For each job, in order:
  1. Attach its assets to the job's first cost centre: `POST /jobs/{j}/sections/{s}/costCenters/{cc}/assets/` with `{"Asset": assetId}`.
  2. Append `<div>EST and PVT completed - d/mm/yyyy</div>` to the job `Notes`, keeping any existing notes and never adding it twice.
  3. `PATCH /jobs/{j}` with `{"Stage":"Complete"}`.
  4. `PATCH /jobs/{j}` with `{"Status":66}`, which is "Job : Completed".
- **A job is completed only if all of its attachments and the note succeeded.** Otherwise it's left open.
- **Skip a job if:**
  - the job isn't found;
  - the job's site doesn't match the assets' site;
  - the job is already Complete, Invoiced or Archived;
  - the cell isn't a job number.

### Simpro reference (company 3 = Connected Healthcare Systems)

- **Base and auth:** `https://cass.simprosuite.com/api/v1.0`, with `Authorization: Bearer <key>`. The site supports CORS from a browser (confirmed from `file://`). Calls from a hosted web address are untested.
- **Asset types:** 114 = Mindray (37 custom fields; their names match the sheet headers), 113 = Mindray IT. Sheet "IT" → 113.
- **Status codes** (`/companies/3/setup/statusCodes/projects/`): 81 = Job : New, 66 = Job : Completed.
- **Endpoints used:**
  - `GET /companies/` and `GET /companies/3/setup/assetTypes/`
  - `GET /companies/3/setup/assetTypes/{t}/customFields/` and `/{id}`
  - `GET|POST /companies/3/sites/{site}/assets/`, plus `GET .../assets/{id}/customFields/` and `PATCH .../customFields/{cf}` with `{"Value":...}`
  - `GET|PATCH /companies/3/jobs/{j}`, `GET .../sections/`, `GET .../sections/{s}/costCenters/`, and `GET|POST .../costCenters/{cc}/assets/`
- **Example sites:** 2349 = Dunedin Hospital Mindray, 2836 = Clutha Health First (job 209646 was used as a live test and completed successfully), 2889 = West Coast.

---

## 2. Current state of the code (uncommitted)

All of it is in `cmchs-staff-schedule/`. It's a Vite + React app at schedule.chsnz.co.nz, with Firebase Microsoft/Entra sign-in and `users/{uid}.role`.

- **`simprosync/`:** this folder is new.
  - `index.html` is the UI.
  - `main.js` is the sign-in gate: Microsoft sign-in via `../src/firebase.js`. It only lets through users whose `users/{uid}` has `role == 'admin'`, then reads the key from Firestore `secrets/simproSync.key` and calls `startApp({ key, who })`.
  - `app.js` holds the sync, job and report logic.
  - `core.js` holds the matching and validation rules.
  - `reader.js` is a dependency-free .xlsx/.csv reader.
- **`vite.config.js`:** `build.rollupOptions.input` was added so the build produces both `index.html` and `simprosync/index.html`.
- **`firestore.rules`:** a `match /secrets/simproSync { allow read: if isAdmin(); allow write: if false; }` block was added. It has **not** been published to Firebase.
- **`Publish SimproSync.cmd`:** this script was added. It runs `git add simprosync vite.config.js firestore.rules`, then commits and pushes.
- **Untested:** none of this has been built yet. The Cowork VM couldn't run the Windows-only rollup and esbuild binaries. Run `npm run build` and check that `dist/simprosync/index.html` exists.
- **Unrelated changes:** the repo has many unrelated modified files, which look like CRLF noise. **Only commit the SimproSync files.**

---

## 3. Decision made: use the existing Apps Script proxy, not a Firestore secret

Jonathan chose to have SimproSync reuse the demo tracker's Simpro key through the Apps Script proxy. That way the key never reaches the browser, and no key has to be pasted into Firestore. Do these:

### 3a. Remove the key from the codebase (`chs-equipment/.gas-proxy/Code.js`)

- **Script Properties:** replace `const SIMPRO_API_KEY = '...'` (line ~91) with a read from Script Properties:
  ```js
  function simproKey_() {
    const k = PropertiesService.getScriptProperties().getProperty('SIMPRO_API_KEY');
    if (!k) throw new Error('SIMPRO_API_KEY script property is not set');
    return k;
  }
  ```
- **Headers:** turn the `API_HEADERS` const (line ~117) into a function, `apiHeaders_()`, and update `simproFetch()` (line ~1035) to use it.
- **Search the whole repo** (excluding node_modules) for any other copy of the key; `.gas-backup/Code.js` did not have it.
- **Order matters, or the demo tracker breaks.** Jonathan must add the **SIMPRO_API_KEY** Script Property *before* the new code is pushed: Apps Script → Project Settings → Script Properties.
- **The key stays in git history.** Removing it from the code doesn't remove it from history in `CMCHSGit/chs-equipment`, so the key must be **rotated** in Simpro afterwards. Check whether the repo is public.

### 3b. Add a `simproSync` action to the proxy

In `handlePayload()`, dispatch `payload.action === 'simproSync'` before the jobId logic, to a new function `simproSyncProxy_(payload)`.

**Payload format:** `{ action:'simproSync', idToken, requests:[{method, path, body}] }`, with at most ~25 requests.

**Auth:** the proxy web app is `ANYONE_ANONYMOUS`, so the action must verify the caller.

1. Decode the Firebase ID token (a JWT) payload. Check:
   - `aud` equals the **staff-schedule Firebase project ID** (pin it as a constant);
   - `iss` equals `https://securetoken.google.com/<projectId>`;
   - `exp` is in the future.
   
   The project ID is in the schedule app's `.env` / GitHub secret `VITE_FIREBASE_PROJECT_ID`. Note that it's a different Firebase project from the tracker's RTDB `chs-equipment`.
2. `GET https://firestore.googleapis.com/v1/projects/<projectId>/databases/(default)/documents/users/<uid>` with `Authorization: Bearer <idToken>`. Firestore validates the token signature, and the existing rules allow signed-in users to read `users`. Require `fields.role.stringValue == 'admin'`.
3. Cache successful checks in `CacheService` (keyed by a hash of the token) for up to 10 minutes, or until `exp` if sooner.

**Allowlist:** only these method + path combinations, with the query limited to `?[A-Za-z0-9=&]*` (pageSize/page/display):

| Method | Path |
|---|---|
| GET | `^/companies/$` |
| GET | `^/companies/\d+/setup/assetTypes/(\d+/customFields/(\d+)?)?$` |
| GET | `^/companies/\d+/setup/statusCodes/projects/$` |
| GET, POST | `^/companies/\d+/sites/\d+/assets/$` |
| GET | `^/companies/\d+/sites/\d+/assets/\d+/customFields/$` |
| PATCH | `^/companies/\d+/sites/\d+/assets/\d+/customFields/\d+$` |
| GET, PATCH | `^/companies/\d+/jobs/\d+$` (PATCH body keys limited to `Stage`, `Status`, `Notes`) |
| GET | `^/companies/\d+/jobs/\d+/sections/$` |
| GET | `^/companies/\d+/jobs/\d+/sections/\d+/costCenters/$` |
| GET, POST | `^/companies/\d+/jobs/\d+/sections/\d+/costCenters/\d+/assets/$` |

**Execution and response:** run the requests with `UrlFetchApp.fetchAll` (`muteHttpExceptions`), using `simproKey_()`. Respond with `{ success:true, results:[{status, data}] }`, using the existing `respond()`. Log the user's email plus each method and path, never the key.

### 3c. Switch SimproSync to the proxy (`cmchs-staff-schedule/simprosync/`)

- **`main.js`:**
  - Stop reading `secrets/simproSync`.
  - Keep the admin gate (it's for the UI; the proxy enforces it too).
  - Pass a **transport** into `startApp`. The transport batches calls and POSTs them to the proxy URL with `Content-Type: text/plain` (no preflight; `mode` must **not** be `no-cors`, because the response is needed). It gets the ID token from `auth.currentUser.getIdToken()`.
  - The proxy URL is `SIMPRO_PROXY_URL` in `chs-equipment/index.html` (line ~2083).
- **`app.js`:** `call(method, path, body)` currently does `fetch(BASE + path, {Authorization: Bearer KEY})`. Replace that with `await transport(method, path, body)`, keeping the existing retry on network error, 429 and 5xx. The asset-detail read pool of 5 can go up to about 10, since the requests are now batched.
- **`firestore.rules`:** the `secrets/simproSync` rule block is no longer needed. Remove it.

### 3d. Deploy

1. Jonathan adds the Script Property `SIMPRO_API_KEY` in Apps Script.
2. Run `clasp push` from `.gas-proxy/`. Then in Apps Script, go to **Deploy → Manage deployments → Edit → New version**. This keeps the same `/exec` URL, so the demo tracker is unaffected.
3. Check the demo tracker still creates, updates and closes jobs.
4. In `cmchs-staff-schedule`, run `npm run build` to check it, then commit **only** `simprosync/`, `vite.config.js` (and `firestore.rules` if it was changed) and push. GitHub Actions deploys to schedule.chsnz.co.nz.
5. Test at `https://schedule.chsnz.co.nz/simprosync/`. Sign in as an admin and do a dry run on a small list first, e.g. "Only these serials".

---

## 4. Other open items

- **Email signature:** Simpro's job-completed emails are signed "CMCHS - Create job for customer demo equipment", which is the name of the API application the shared key belongs to. A Simpro admin should rename it, e.g. "Auto-generated – CMCHS Systems", or issue separate keys.
- **Rotate the key** after removing it from the code (see 3a).
- **Copies of the key to delete once everything works:**
  - `Documents\Simpro API\simpro_key.txt`
  - any `C:\SimproSync\simpro_key.js`
  - the `simpro_key.js` uploaded to the Claude project "Upload Assets to Simpro"
- **Older tools:** `Documents\Simpro API\` holds the older working versions (the standalone `SimproSync.html`, `sync_assets.py` and an Excel macro). The web version replaces them.
- **Dunedin workbook:** it has `#REF!` formulas in Mindray LAN MAC Address and MID Number. The tool skips them; they need fixing in the sheet.
