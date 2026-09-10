# To do

Last updated: 2026-09-11

## Infrastructure (shared)

- [ ] **DNS/HTTPS fix for demo.chsnz.co.nz** — CNAME still wrong (`www.cmchsgit.github.io` instead of `cmchsgit.github.io`), HTTPS still doesn't connect. Steps already sent to IT. Fixes: Android's camera secure-context issue, and (combined with the icon fix below) Android's PWA install quality. **Won't fix iOS camera** — that's a separate, permanent WebKit bug (see below), not a secure-context problem.
  - ✅ Partial fix already landed: 192×192/512×512 manifest icons added, which was a *separate* blocker for Android installing as a real standalone app (not a bookmark). HTTPS is still the remaining piece.
- [x] **Confirmed 2026-09-11**: camera scanning works on Android. Does **not** work on iOS (Safari standalone/home-screen mode) — this is a known, permanent Apple/WebKit bug (bugs.webkit.org #185448), not something fixable in our code. Manual asset-number entry on the Scan screen is the deliberate fallback for iOS. Workaround if camera is specifically needed on iPhone: open the site in Safari directly rather than the home-screen icon (loses the persisted sign-in).
- [ ] Delete the leftover stuck-loan test case in Firebase (`TEST New Booking (Claude Test Case)`, blocking asset `100516`) once done testing it — it'll otherwise keep sending a real daily reminder email/push.

## Mobile

### Pending work

- [ ] **`openStuckLoanReassign()` not mobile-native** — the "resolve what's blocking this upcoming booking" shortcut (Today tab's "Action required" alerts, a scheduled loan's "Reassign/transfer" action, the stuck-loan email/push deep link) still opens the desktop Reassign modal directly instead of `mpOpenReassignFlow()`.
- [ ] **Push notifications inactive** — built for the stuck-loan reminder, but needs the Firebase console setup finished (VAPID key, service-account key pasted into Apps Script Script Properties).
- [ ] **App icon badge only updates while the app is open** — no push-driven update yet, so it won't tick up while the app is closed/backgrounded. Would need the push payload to carry the AM's current count and `sw.js`'s push handler to call `self.registration.setAppBadge()`.
- [ ] **Demo-loan reminder has no push** — only the stuck-loan reminder got push; `sendDemoReminders()` is still email-only.
- [ ] **Alerts screen is still just one toggle** — no in-app history list or per-notification-type toggles, per the original mockup.
- [ ] **Kit-builder not on mobile** — built into desktop's Database tab only (see Desktop section). Flag if mobile parity is wanted.

### Needs testing

- [ ] All six mobile-native loan actions: Add items, Return items, Extend, Reassign (scheduled-edit form, active-loan move, and "Create new loan with these items"), Delete loan, Loan form.
- [ ] Scan tab's Check out / Return / Count modes, especially the "on loan when counted" two-button branch.
- [ ] AM tab bar's Equipment tab (replacing Scan) — confirm parity with the service role's version.
- [ ] Equipment multi-select → "Add N devices to loan" hand-off into the Book wizard, the Book draft surviving a tab switch, and selected devices pinning to the top of the list regardless of search/filter.
- [ ] New item detail screen (mobile-native rebuild) — Check out/Check in actions, recent activity list.
- [ ] Action-required badge — tab icon and home-screen app icon, on both Android Chrome and iOS 16.4+ if available.
- [ ] The scheduled-loan dedup fix — a real (not test-case) split loan should show as one card with a pending sub-list, not two cards.
- [ ] Audit log source badges — do something from mobile, confirm it shows 📱 Mobile.
- [ ] "Manage team roles" correctly hidden from a real AM's More screen, still visible when a service person previews the AM view.

## Desktop

### Pending work

- [ ] Nothing currently known/outstanding beyond the shared infrastructure item above.

### Needs testing

- [ ] New "Build Kit" flow — item detail's "📦 Build Kit" button, Database tab multi-select as accessories, "Save as Kit Group" in the selection bar.
