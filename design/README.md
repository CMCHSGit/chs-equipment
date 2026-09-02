# Handoff: CHS Demo Tracker — mobile app

## Overview

A mobile companion to the existing CHS demo equipment tracker (`CMCHSGit/chs-equipment`, the single-file web app served at demo.chsns.co.nz). It carries the jobs that need doing away from a desk, and it is **role-dependent**: account managers see only their own loans; service and project staff see the whole fleet.

The web app stays the system of record. The mobile app is a second front end over the same Firebase data — same collections, same field names, same statuses. It does not add data of its own except the two test sign-offs described below.

Target: install to the home screen as a PWA (not an App Store build). See "PWA notes" at the end.

## About the design files

The files in this bundle are **design references created in HTML** — a working prototype of the intended look and behaviour, not production code to lift. `CHS Demo Tracker Mobile v2.dc.html` is a Design Component: one HTML file with a template and a logic class, rendered by `support.js`. It runs by opening it in a browser.

The task is to **recreate these screens in the tracker's own environment**. That environment is a single 704 KB `index.html` — vanilla JS, no build step, no framework, Firebase compat SDK loaded from CDN, all markup created imperatively. Follow that. Do not introduce React, a bundler or a component library to implement this; write the screens the way the rest of `index.html` writes screens, and reuse its existing Firebase reads/writes, its `showToast`, its modal helpers and its admin-password gate.

`ios-frame.jsx` is the phone bezel used to present the design. It is **presentation scaffolding only** — do not port it. The real app is the screen content, full-viewport.

`support.js` is the Design Component runtime. Also not to be ported.

## Fidelity

**High-fidelity.** Colours, type, spacing, radii, shadows and copy are final and taken from the bound design system. Recreate the UI to match. Every value used is listed under "Design tokens" and every colour is a CSS custom property already defined in `_ds/.../tokens/colors.css` — link those token files rather than re-typing hex codes.

Two things are deliberately *not* final and want a decision before build:
- The **scan** screen shows a mocked viewfinder. The real one should use the native camera via `getUserMedia` + a QR decoder, or the Capacitor barcode plugin if the app is later wrapped.
- All **data is fixture data** written inline in the logic class. Field names match the web app, values do not.

## Roles

Two roles, resolved at sign-in. The prototype fakes this with a switch above the phone; the real app must derive it from identity.

| | Account manager | Service & projects |
| --- | --- | --- |
| Example user | Lee-Anne Higgins | Dave Ngata |
| Home screen | **Today** — own loans only | **Overview** — whole fleet |
| Loans scope | Locked to self, no picker | Free picker: any AM, or all |
| Centre tab | Book | Scan |
| 4th tab | Scan | Equipment |
| Test & sign-off screen | **Not visible at all** | Visible and editable |
| Can create loans | Yes (centre tab) | Yes (More → Create a loan) |
| Transfers | **Owns them** | Not involved |
| Loan actions | 6 entries | 8, incl. reassign / send to service / delete |

An AM must never be able to see another AM's loan. The one exception is deliberate and important: when an AM tries to book a device someone else is holding, they are told **who holds it and until when** — name and date only, never the other loan. See "Book, step 2".

### Identity

The prototype's role switch is a stand-in. The web app currently has one shared team password, which cannot tell you who is holding the phone, and the app needs to know for three reasons: the greeting and own-loans filter, per-person notification preferences, and the account manager pre-filled on a booking.

Three options, in rising order of work — the recommendation is the middle one for a pilot, designed so sign-in can be swapped for Entra later without touching any other screen:

1. Keep the team password, then pick your name once from the existing `accountManagers` list; stored on the device. No new auth, but anyone with the team password can act as anyone.
2. A short per-person passcode against each `accountManagers` record. Real attribution, no identity provider, but codes to administer.
3. Microsoft Entra ID sign-in. Proper identity, works with CMCHS offboarding, but needs the IT approval that has been holding up the Microsoft connector.

The admin password stays exactly as it is in all three — a second gate on delete / retire / edit equipment, not an account.

## Screens

15 screens. The prototype's right-hand column has a jump chip for each, which is the fastest way to see them all.

### 1. Sign in

Full-bleed white, vertically centred, no tab bar. Three-stripe rule (30×5px blocks, purple/green/orange, 4px gap), overline `CMCHS`, display-face h2 "Demo equipment tracker", one line of body copy. Primary button "Sign in with Microsoft". Then an `or` divider (1px hairline / 12px gap / 12.5px muted label). Then a "Team password" field and a secondary "Continue" button. Footnote: the admin password is asked separately for destructive actions.

Both buttons go to the role's home screen.

### 2. Today (AM home)

- Greeting `Kia ora, Lee-Anne`, display face 24px/600/-0.02em. Sub-line: date + "your loans only".
- Three stat tiles in a 1fr×3 grid, 8px gap: **Your loans out** (5), **Overdue** (1, red), **Booked ahead** (1, purple). Value is display face 24px/600, label 11.5px muted.
- **Needs you today** — 0-3 cards. Each is a white 10px-radius card, 12/14px padding, min-height 58px, with a 4px full-height coloured bar on the left (not a border — a flex child), customer name 15px/600, sub-line 13px/300 muted, and a right-aligned uppercase 11px/600 tag in the bar's colour. Before the transfer: Transfer due (purple) → transfer screen; overdue (red) → return; not tested (amber) → loans. After: two green cards.
- **Your week** — a white card, rows separated by 1px `--border-subtle`, each row a 34px purple-tinted date chip (day-of-week 9px above date 14px), then customer + sub-line, then a chevron.
- Primary "Book a demo" button, full width, 50px.

### 3. Overview (service home)

- Title "Fleet overview", sub-line "61 assets · all account managers · <date>".
- **Utilisation** card: label + monospace "N of 61 out", then a 10px rounded bar layered green (on loan) / orange (due today) / red (overdue) over a `--chs-black-10` track, then a four-item key. **All widths and the label derive from the loan data** — after a transfer the numbers change, so nothing here may be a literal.
- Four stat tiles, 2×2: Loans active, Overdue across all AMs (red), Awaiting sign-off (purple), Transfers due today (purple). Also derived.
- **Awaiting test & sign-off** — one row per loan: customer, "Ships <when> · <AM>", a 4px progress bar, and a monospace `done/total`. Bar and text colour: green at 100%, orange at ≥60%, red below. Row opens the test screen.
- **By account manager** — one row per AM: name, region, an optional red "N overdue" pill, a monospace loan count, chevron. Tapping sets the loans scope to that AM and navigates there.

### 4. Loans

- Three segments: Active / Upcoming / Overdue, with live counts in the labels. Segmented control is a `--chs-black-10` track, 3px padding, white raised pill for the active segment.
- **Scope row.** AM: a locked purple-tinted row, padlock icon, "Your loans · Lee-Anne Higgins", count. Service: a tappable row with a person icon, current scope, count, chevron → scope sheet.
- **Loan cards.** White, 10px radius, 4px status cap across the top (not a left border). Inside: customer 15px/600, meta line (AM · location · dates) 13px/300, then a row of pills — status badge, monospace device count, and for the receiving loan a test-state pill (amber "Awaiting test" → green "Tested"). A chain warning, when present, is an orange-tinted 6px block. A 44px kebab on the right opens the actions sheet; tapping the body expands the card.
- **Expanded card** reveals one row per device (monospace asset no. 74px wide, model, monospace serial) and two buttons: "Return items", "Loan form".
- Status colours: overdue red, due today orange, active green, scheduled purple, unconfirmed orange.

### 5. Book a demo — step 1 of 3

Match the web app's Scan/Loan form field for field. Three-segment progress bar above.

| Field | Control | Required |
| --- | --- | --- |
| Event and/or customer name | text | yes |
| Location | text | yes |
| Loan start date | date, dd/mm/yyyy | yes |
| Loan end date | date, dd/mm/yyyy | yes |
| Account manager | select | yes |
| Account manager email | email | yes |
| Contact number | tel | no |
| Job type | select: **Demo** (default), Repair, PMV | no |
| Demo type | select: Conference / presentation, Clinical trial, Hotswap | yes |
| Notes | textarea | no |
| Shipping details | textarea | no |

Required fields carry an orange `*`. A purple-tinted footnote states that and that devices come next.

Dates come before equipment deliberately: dates decide availability.

**Demo type drives the test requirement** — see screen 8. Job type and Demo type open a bottom sheet list rather than a native `<select>`, for thumb reach.

For an AM, Account manager and email are pre-filled with themselves. For service staff they are empty and must be chosen — the hint says so.

### 6. Book a demo — step 2 of 3

- "Devices to include (asset numbers). Availability shown for **<start – end>**."
- Search field + a 46px purple-outlined scan button.
- Two secondary buttons: "Browse database" (→ equipment search), "Type manually".
- **Free for these dates** — tappable rows, each with model, description, monospace `asset · shelf`, and a 28px checkbox on the right (purple fill + white tick when selected).
- **Booked over your dates** — an orange-hairline row. Sub-line: "Held by Theresa Fogarty until 12 Sep · you cannot see her loan". Tapping opens the clash sheet.
- Sticky footer: "N devices selected" + "Confirm loan".

### 7. Confirmed

Green tick in a 62px `--chs-green-20` disc, "Loan confirmed", the dates, and a note that the form is emailed and the loan is now with the service team for test and sign-off. Then a summary card capped with the three-stripe device: monospace loan number, device count, status Scheduled. Primary "Back to today". Service staff also get "Test & sign off now"; AMs do not.

### 8. Test & sign-off — **service only**

This screen must not be reachable by an account manager: no tab, no More entry, no deep link.

Two tests, and which apply depends on the loan's demo type:

| Demo type | Electrical safety test | Performance check |
| --- | --- | --- |
| Conference / presentation | required | — |
| Clinical trial | required | required |
| Hotswap | required | required |

So a 3-device conference loan is 3 tests; a 3-device clinical trial is 6. The screen states the rule in force in a purple-tinted note, then shows a progress bar and `done of total`, then one group per device with its checks (26px circular tick, label, hint — "IEC 62353 · pass required" / "Against the manufacturer spec").

Footer button reads "Complete the tests to sign off", disabled grey, until every test passes; then "Sign off as tested", green.

**The sign-off is what the AM sees.** It flips their loan card pill from amber "Awaiting test" to green "Tested", and their Today card from "Not tested" to "Tested · signed off by service today". They never see the individual tests.

### 9. Loan transfer — **AM only**

The case: an upcoming loan's start date arrives while the equipment is still out on a current loan. The gear is going straight from one site to the next.

Notification, both times to the AM who owns the loans (service is not involved):
- **The day before** — a heads-up.
- **On the day** — "3 devices need transferring today". Tapping it opens this screen.

Screen content:
- A From/To card. From: the current loan, its AM, its due date, whether it is overdue. To: the receiving loan, its AM, "starts today", its due date. A two-colour 4px cap (red → purple).
- **Items to transfer** — one row per device, checked by default. Unchecking flips its pill from purple "Transfer" to grey "Stays behind" and reveals a **reason row underneath**, orange-tinted and reading "Add a reason — required" until set. Reasons: returning to CHS instead / customer is keeping it longer / item faulty, going to service / not physically at the site / other. Recorded against the device, not the loan form.
- An explanation block: record change only, no scan, no signature, no new loan form.
- Sticky footer: count, or "Reason needed to continue", then "Transfer". Disabled until every unchecked item has a reason and at least one item is moving.

**The write, on transfer:**
1. Move each ticked item from the old loan to the new loan.
2. Mark those items returned on the old loan.
3. **Close the old loan** and mark it returned. It leaves Active and Overdue.
4. **Activate the new loan.** It leaves Upcoming and enters Active with today as its start.
5. Each unticked item is returned to CHS with its reason stored against the device.
6. No new loan record and no new loan form are created — only the two existing loans change.

Afterwards the screen shows a green confirmation card. Every count in the app follows from the same data: the AM's stat tiles, Today cards, Your week, the fleet counters, the utilisation bar, the by-manager overdue pills, and the alert list. **Nothing may be a hard-coded number.** This was the single most common defect while building the prototype.

### 10. Scan

Both roles. Dark viewfinder (repeating 135° stripe stand-in for the camera feed), a 180px window with a 2px white frame and a 45%-black surround, caption "Point at the QR label on the device". Below: a manual asset-number field, a basket list, and "Check in" / "Check out".

### 11. Equipment search

Search field + filter button, then a horizontally scrolling chip row (All, Available, On loan, Overdue, Mindray, Vocera), then rows of monospace asset no. + model, description, and a status pill. Row opens an actions sheet.

### 12. Alerts

- A **push preview** on a black 14px-radius card, styled like a lock-screen notification: three-stripe app icon, "Demo tracker", "now", title, body. Content differs by role.
- A footnote stating that push works on iOS 16.4+ once installed to the home screen, and that until then these mirror the emails the tracker already sends.
- **Recent** — tappable rows, 8px colour dot, title, body, optional purple call-to-action line, right-aligned timestamp. Each navigates somewhere real; the transfer alert opens the transfer screen.
- **Tell me about** — toggle rows. AM: transfers due (heads-up the day before, then on the day), own loans due in 2 days, own loans overdue, own loans starting in 2 days, every loan I create. Service: anything due in 2 days, anything overdue, tests not signed off 24h before dispatch, new loan created by any AM. Toggle is a 44×26px pill, green when on, 20px white knob, 220ms travel.

The four existing EmailJS triggers are the same four here — no new rules server-side, just a second delivery channel and a per-person switch.

### 13. Return items

Checkbox rows per device (26px, 6px radius), then a "Condition on return" textarea with the hint that it saves against the device, not the loan form. Sticky footer: "N of 3 selected" + "Return".

### 14. More

A list, then "Signed in as <name> · <role>" and the CHS phone number, then "Sign out".

AM: Transfers due, Calendar, My loan history, Search equipment, Notifications, Settings.
Service: Create a loan, Calendar, Test & sign-off queue, Who sees which loans, Stocktake / count, Import, Sold / retired, Settings.

### 15. Bottom sheets

One component, five contents. Scrim 50% black + 2px blur, sheet white with 20px top corners, 38×4px grab handle, title + sub-line, scrolling body, "Close" button.

- **Loan actions** — AM: transfer, return, extend, add items, loan form, email customer. Service: return, extend, add items, reassign AM, send to service, loan form, email customer, **delete loan** in red (still gated by the admin password).
- **Scope** — "All account managers" plus one row per AM, each with region, loan count and a tick. Service only.
- **Who sees which loans** — one row per AM with an Own loans / All loans pair. Own is the AM default; All is the service default. (An earlier draft had a third "Team" option; it was removed as unnecessary.)
- **Job type / Demo type / Transfer reason** — single-select lists with a tick on the current value.
- **Clash** — explains the overlap, names who holds the device and until when, then "Book it anyway" (keeps both records; the holder is notified that you have it booked from their return date) or "Skip this item".

## Interactions

- **Navigation** is a five-item bottom tab bar, 78px, white, 1px top border. The centre item is a raised 52px purple square with 16px radius, pulled up 16px, with a 6px/16px purple-tinted shadow. Active tab is purple, inactive `--chs-black-60`. Every tab target is at least 44×48px.
- **Header** is 46px: three 5×20px stripes, screen title in the display face, and a role chip on the right (purple "Your loans" / green "All loans"). The 3px three-stripe rule sits directly under it, full width. Both hide on sign-in.
- **Motion**: 150ms for control states, 220ms for surfaces, 400ms for page fades, all `cubic-bezier(.2,.6,.2,1)`. Fades and short translations only — no bounce, no scale.
- **Hover/press**: filled buttons darken ~12% (`#554596` → `#47397e`); secondary and ghost fill with the 20% tint; cards lift 2px and step the shadow up; press adds an inset shadow, never a scale.
- **Focus** is a 3px purple halo at 32% opacity and must not be removed.
- **Empty state** where a segment has no loans: a white card, "No loans in this view", one muted line. No apology.

## State

| State | Purpose |
| --- | --- |
| `role` | `am` \| `ops`. From identity, not a setting. |
| `screen` | Current screen. |
| `seg` | Loans segment: active / upcoming / overdue. |
| `scope` | AM name, or `all`. Forced to self for an AM. |
| `open` | Which loan card is expanded. |
| `sheet` | Which bottom sheet is showing, or null. |
| `jobType`, `demoType` | Booking form; demo type drives the test set. |
| `basket` | Devices selected while booking. |
| `checks` | Test sign-offs, keyed `<asset>-est` / `<asset>-perf`. |
| `xferSel`, `xferReason`, `xferDone` | Transfer selection, per-item reasons, completion. |
| `returnSel` | Devices selected for return. |
| `prefs` | Notification switches, per person. |
| `visibility` | Per-AM own/all default. Admin. |

Everything visible is derived from these plus the loan data on each render. In the prototype the loan list is mutated by the transfer and every counter reads from it; keep that property — a count that is stored separately will drift.

## Design tokens

All of these are CSS custom properties in `_ds/.../tokens/`. Link the token files; do not re-type the values.

**Brand** — purple `#554596` (leads: primary actions, links, focus), green `#80bd01` (positive, tested), orange `#ef7d00` (attention, warmth). Each has 60/30/20% tints. Red `#c8102e` is for genuine alarm only: overdue, delete.

**Neutrals** — body copy `#575756` (80% black, never pure black), strong `#1d1d1d`, muted `#747577`, black-60 for inactive tabs. Backgrounds: white first, `--chs-black-05` `#f4f4f5` for the app canvas and alternating bands. Hairlines `#d1d3d4` structural, `#e8e9ea` subtle.

**Type** — display face Titillium Web (substituting Mercedes) for headings and titles, 600 weight, tight leading, -0.01 to -0.03em tracking. Body face Source Sans 3 (substituting Myriad Pro): 300 for running copy at 1.55, 400 for UI, 600 for labels. IBM Plex Mono for asset numbers, serials and counts only. Overlines 11.5px uppercase at 0.14em. Display face is never used for body copy.

Sizes in use: h2 22-24px, card title 15-16px, body 15px, meta 13-13.5px, monospace 11.5-12px, overline 11.5px, tab label 10px. Nothing below 10px, and no touch target below 44px.

**Radii** — 3px small controls, 6px buttons and inputs, 10px cards, 14-16px sheets and the raised tab, pill on badges.

**Shadows** — card `0 1px 2px rgba(0,0,0,.06)`, hover adds `0 4px 12px rgba(0,0,0,.07)`, overlay `0 -16px 48px rgba(0,0,0,.2)`. Neutral black, never tinted.

**Spacing** — 16px screen gutters, 8px between cards in a list, 12-14px card padding, 20px between sections.

Design-system rules worth restating because they are easy to break: colour enters a card as a **top cap or a left flex child, never a left border**; no more than two brand colours in one block; no decorative gradients; **no emoji, ever** — status is a colour, a badge or a Lucide icon.

## Assets

- Icons: **Lucide 0.451.0**, inline SVG at 2px stroke, 16-24px. The design system wraps it as `Icon`. The tick `✓` and chevron `▾` are typographic, not icons.
- Logo / three-stripe device: `_ds/.../assets/` in the design system. In these screens the device is drawn as three flex blocks rather than an image, so it scales — that is fine to keep.
- No photography. None was supplied, and image areas would be explicit empty states.
- Fonts: Titillium Web, Source Sans 3, IBM Plex Mono, loaded by `tokens/fonts.css`.

## PWA notes

The decision was to install to the home screen rather than ship to the App Store — no review, no fees, no developer accounts, and you keep deploying from GitHub Pages.

Three things make it feel like an app rather than a bookmark:
1. A web app manifest with the CHS device as the icon and `display: standalone`, so Safari chrome disappears and the bottom tab bar becomes the only navigation.
2. Sign-in remembered on the device, so it is not asked every launch.
3. An "Add to Home Screen" prompt card for first-time iOS visitors, since Safari will not offer it.

The one real loss is push reliability: iOS only delivers web push to an installed PWA on 16.4+. The alerts screen is honest about this in its footnote. If push turns out to matter more than the store cost, Capacitor plus internal distribution is the fallback — it would also give native camera QR scanning, which would fix the iOS scanning trouble.

## Files

| File | What it is |
| --- | --- |
| `CHS Demo Tracker Mobile v2.dc.html` | The design. Template + logic class. Open it in a browser. |
| `_ds/connected-healthcare-systems-design-syst-.../` | The bound design system: token CSS, `styles.css`, component bundle. Link these. |
| `ios-frame.jsx` | Phone bezel. Presentation only — do not port. |
| `support.js` | Design Component runtime. Do not port. |

Where this should live in the repo: a `design/` folder alongside `index.html`, so it is clearly a reference and not part of the shipped app.

## Open questions

Worth settling before or during build:

1. When an AM books a device another AM is holding, how much should they see — holder's name only, or name and dates? The prototype shows both.
2. Should the receiving AM be notified once a transfer has happened, or is that noise?
3. If a transfer never happens and the old loan runs on past its due date, does anything chase it?
4. Does the service team need a view of transfers that are overdue, even though they do not action them?
5. Do project staff need the full booking flow, or only view and sign-off?
