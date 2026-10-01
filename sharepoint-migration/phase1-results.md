# Phase 1 results

Fill in as you go through `phase1-validate.ps1`. This is what step 16's decision (Approach A / B / C / hybrid) should be based on.

- [ ] **Step 2** — tenant posture: `PermissiveBrowserFileHandlingOverride` = ____, `ContentSecurityPolicyEnforcement` = ____
- [ ] **Step 3** — Custom Script enabled on test site: yes / no
- [ ] **Step 5** — navigating to `test.html` directly: download / inert preview / live execution
- [ ] **Step 6** (if needed) — same file renamed to `test.aspx`: download / inert preview / live execution
- [ ] **Step 7** — on whichever worked, result of check 1 (inline script): PASS / FAIL
- [ ] **Step 7** — result of check 3 (fetch to api.github.com): PASS / FAIL
- [ ] **Step 7** — result of check 4 (fetch to the real Firebase RTDB) — **the single most important result**: PASS / FAIL
- [ ] **Step 7** — Google Fonts visibly applied (check 2, judge by eye): yes / no
- [ ] **Step 8** — anything change with `?csp=enforce` appended: yes / no, what changed
- [ ] **Step 9** — service worker registered: PASS / FAIL, effective scope reported: ____
- [ ] **Step 10** — DevTools Installability check: pass / fail; actual install attempt: standalone window with no SharePoint chrome / something else
- [ ] **Step 11** — Android Chrome: same as desktop / different (describe) ; iOS Safari: same as desktop / different (describe)
- [ ] **Step 12** — camera (`getUserMedia`): OK / FAILED (error: ____)
- [ ] **Step 13** — real FCM push delivered and tapping it navigated correctly: yes / no / not attempted

## Decision (step 16)

Approach chosen: ____ (A / B / C / hybrid)

Reasoning:
