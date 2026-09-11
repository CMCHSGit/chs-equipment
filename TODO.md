# To do

Last updated: 2026-09-11

## Infrastructure (shared)

- [ ] **DNS/HTTPS fix for demo.chsnz.co.nz** — CNAME still wrong (`www.cmchsgit.github.io` instead of `cmchsgit.github.io`), HTTPS still doesn't connect. Steps already sent to IT — **on hold, IT is coming back to it next week** to actually enforce HTTPS on demo.chsnz.co.nz. Fixes: Android's camera secure-context issue, and (combined with the icon fix below) Android's PWA install quality. **Won't fix iOS camera decode reliability** — that's a separate library limitation (see below), not a secure-context problem.
  - ✅ Partial fix already landed: 192×192/512×512 manifest icons added, which was a *separate* blocker for Android installing as a real standalone app (not a bookmark). HTTPS is still the remaining piece.
  - ✅ **Confirmed 2026-09-11 via temporary workaround**: removing the demo.chsnz.co.nz custom domain from GitHub Pages and enforcing HTTPS on the raw `cmchsgit.github.io` URL fixes camera access on iOS too (opened directly in Safari at `https://cmchsgit.github.io/chs-equipment/?mobile=1`, not the home-screen icon) — confirms the root cause diagnosis was right. This is a stopgap for testing only; the real fix is still the DNS change above.
- [x] **Confirmed 2026-09-11**: camera scanning works on Android. iOS camera **access** also confirmed working now (via the HTTPS workaround above, in plain Safari — not the installed home-screen icon, which has its own separate permanent WebKit bug, bugs.webkit.org #185448). Manual asset-number entry remains the fallback for the installed-icon case.
- [ ] **New 2026-09-11, on hold: iOS camera opens but doesn't decode QR codes** — even with camera access working (via the HTTPS workaround, in plain Safari), scanning a QR code never actually captures it on iOS, unlike Android. Root cause: iOS Safari has never shipped the `BarcodeDetector` API (Chromium-only), so it falls back to `jsQR` — a pure-JS decoder that's noticeably less tolerant of blur/distance/angle than native barcode detection. This is the same class of problem Android had before switching to `BarcodeDetector`; iOS has no native API to switch to. **Proposed fix (not yet built, holding per instruction)**: swap `jsQR` for a stronger JS-only decoder (ZXing's JS port is the standard choice) specifically in the no-`BarcodeDetector` fallback branch of `mpOpenScan()` — confirmed this would only affect browsers without `BarcodeDetector` (i.e. iOS today), Android's working path returns before ever reaching that code. Revisit once the DNS fix lands and iOS testing resumes properly.
- [ ] Delete the leftover stuck-loan test case in Firebase (`TEST New Booking (Claude Test Case)`, blocking asset `100516`) once done testing it — it'll otherwise keep sending a real daily reminder email/push.

## Mobile

### Pending work

- [ ] **`openStuckLoanReassign()` not mobile-native** — the "resolve what's blocking this upcoming booking" shortcut (Today tab's "Action required" alerts, a scheduled loan's "Reassign/transfer" action, the stuck-loan email/push deep link) still opens the desktop Reassign modal directly instead of `mpOpenReassignFlow()`.
- [ ] **Push notifications inactive** — built for the stuck-loan reminder, but needs the Firebase console setup finished (VAPID key, service-account key pasted into Apps Script Script Properties).
- [ ] **App icon badge only updates while the app is open** — no push-driven update yet, so it won't tick up while the app is closed/backgrounded. Would need the push payload to carry the AM's current count and `sw.js`'s push handler to call `self.registration.setAppBadge()`.
- [x] **Demo-loan reminder push** — `sendDemoReminders()` now also pushes to every Service & Projects team member's device, alongside the existing email (Jonathan, 2026-09-11). Needs testing (see below) — still needs the same Firebase console setup as the stuck-loan push before it can actually deliver.
- [ ] **Alerts screen is still just one toggle** — no in-app history list or per-notification-type toggles, per the original mockup.
- [ ] **Kit-builder not on mobile** — built into desktop's Database tab only (see Desktop section). Flag if mobile parity is wanted.

### Needs testing

- [ ] All six mobile-native loan actions: Add items, Return items, Extend, Reassign (scheduled-edit form, active-loan move, and "Create new loan with these items"), Delete loan, Loan form.
- [ ] Scan tab's Check out / Return / Count modes, especially the "on loan when counted" two-button branch.
- [ ] AM and Service & Projects tab bars now match (both: Today/Overview, Loans, **Book** center, Equipment, More) — Service & Projects' Scan moved to a header icon top-right instead of a tab. Confirm this reshuffle looks/works right for both roles.
- [ ] Equipment multi-select → "Add N devices to loan" hand-off into the Book wizard, the Book draft surviving a tab switch, and selected devices pinning to the top of the list regardless of search/filter.
- [ ] New item detail screen (mobile-native rebuild) — Check out/Check in actions, recent activity list, and the anti-double-tap "✓ Counted/Returned/Checked in" confirmation state added 2026-09-11.
- [ ] Action-required badge — tab icon and home-screen app icon, on both Android Chrome and iOS 16.4+ if available.
- [ ] The scheduled-loan dedup fix — a real (not test-case) split loan should show as one card with a pending sub-list, not two cards.
- [ ] Audit log source badges — do something from mobile, confirm it shows 📱 Mobile.
- [ ] "Manage team roles" correctly hidden from a real AM's More screen, still visible when a service person previews the AM view.
- [ ] **New (Jonathan, 2026-09-11): mandatory Shipping Island (North/South)** field on loan creation, both desktop and mobile — drives island-aware reminder lead time (North: 3 business days notice, South: 5). Confirm the field is required, saves correctly, and the reminder timing math looks right for both islands.
- [ ] **New (Jonathan, 2026-09-11): same-day loans allowed** — end date can now equal start date instead of being rejected. Confirm this works on both the desktop batch form and the mobile Book wizard.
- [ ] **Test/sign-off tracking moved from Active/Overdue to Scheduled-only loans** (2026-09-11, per feedback) — the Awaiting-test/Tested pill and Mark as tested/No test required actions no longer show on Active/Overdue loans (equipment's already with the customer by then), only on Scheduled ones. Also added the missing "No test required" mobile action (desktop's "Skip" already existed; mobile only had "Mark as tested"). Needs testing.
- [ ] **Date-field overlap on real iPhone 14** — reported again 2026-09-11 on Book-a-demo Step 1 despite the earlier flex-wrap/min-width fix (which looked fine elsewhere but not on that real device — iOS Safari's native `<input type="date">` has its own minimum content width that can exceed the CSS threshold used to decide when to wrap). Fixed by stacking Start/End date fields vertically instead of attempting side-by-side, in both Book-a-demo Step 1 and Reassign's scheduled-loan edit form. Follow-up fix same day: the stacked date fields still rendered visibly *taller* than every other field on a real iPhone (`.mp-input`'s `min-height` doesn't constrain iOS's native date control) — fixed with an explicit `height:48px` override for `input[type=date/time].mp-input`. **Needs re-confirming on the actual iPhone 14** this was reported on.
- [x] **Fixed (Jonathan, 2026-09-11): sticky "Add devices to loan" footer** — was unreachable on a long equipment list (sticky styles were on a wrapper sized to fit only the button row, not a child of the taller screen container). Verified with a real scroll.
- [x] **Changed (Jonathan, 2026-09-11): Scan auto-starts the camera** — no longer auto-focuses the manual asset-number field (which used to pop the keyboard and cover "Start camera"); camera starts automatically on load and after switching Check out/Return/Count modes, with the button as a fallback if the stream fails.
- [x] **Improved (Jonathan, 2026-09-11): clearer camera error message over HTTP** — when the camera fails specifically because the page loaded over `http://` (the DNS/HTTPS issue above), the toast now says so directly and suggests opening the `https://` URL, instead of just the raw secureContext/mediaDevices/UA diagnostic string.
- [x] **Fixed 2026-09-11: duplicate/unclickable entries in Today's "Coming up"** — same unmerged groups+bookings bug already fixed in the Loans tab's Upcoming segment, just never applied to `mpUpcomingForName()` (used by Today's "Coming up" list and Upcoming stat count). A booking split across a scheduled group and a leftover upcomingLoans entry (the "equipment being held" case) showed up twice with nothing to tap into. Rewritten to reuse the already-correct `mpAllUpcoming()`; rows now navigate via `mpJumpToLoan()`. **Needs testing** — was reported live via Jess's AM view (Garwei Ho / Conference Magic duplicated).
- [x] **Fixed 2026-09-11: Awaiting-test/Tested pill hidden from AM view** — was showing on the AM's own scheduled-loan cards even though test/sign-off is a Service & Projects responsibility (the kebab actions were already service-only, the pill itself wasn't). Needs testing.
- [x] **Fixed (Jonathan, 2026-09-11): date formatting + equipment sort order** — several spots (history table/modal, database card view, mobile Add-items/equipment-detail on-loan lines, item detail Manufacture/Purchase Date, Excel export) showed either a raw unformatted ISO date or a locale-dependent format that could silently vary by device region — now always dd/mm/yyyy via explicit 'en-NZ' locale. Mobile's equipment list (Equipment tab + Add-items screen) now sorts by asset number ascending like desktop, instead of arbitrary data order. Needs testing.
- [x] **Fixed 2026-09-11: Overview's "Upcoming — needs testing" showed already-tested loans** — reused the same unfiltered upcoming-loans list the stat tile count uses, so a loan (e.g. NZ Anaesthetic Techs Society Conference, confirmed already Tested on both desktop and mobile) never dropped off the list once marked tested. Added a separate filter for the section specifically (excludes tested/no-test-required and isUpcoming bookings with no equipment yet), leaving the stat tile's total count untouched. Needs testing.
- [x] **Overhauled (Jonathan, 2026-09-11): overdue + due-soon reminders moved server-side** — the old overdue check only ran once per page load client-side (so it silently did nothing most weeks unless someone had a tab open at the right moment). Replaced with a real daily Apps Script trigger that emails **and pushes** the responsible AM (repeating every 7 days while still overdue), plus a brand-new "due back soon" reminder (email + push to the AM, push to Service & Projects) using the same island-aware notice window as the outbound shipping reminder — so South Island return loans now get a full business week's notice too. Applies to every loan type, not just Demo. **Needs testing** — verified server-side with a sandboxed harness, but not yet against real data/devices.

## Desktop

### Pending work

- [ ] Nothing currently known/outstanding beyond the shared infrastructure item above.

### Needs testing

- [ ] New "Build Kit" flow — item detail's "📦 Build Kit" button, Database tab multi-select as accessories, "Save as Kit Group" in the selection bar.
- [ ] Mandatory Shipping Island (North/South) field on the desktop batch loan form — same feature as mobile above, confirm required + saves correctly.
- [ ] Same-day loans (end date = start date) now accepted on the desktop batch form too.
