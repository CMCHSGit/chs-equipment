# SharePoint hosting migration — ABANDONED (8 Oct 2026)

> **Don't act on anything in this folder.** SharePoint hosting was dropped on
> its own merits, before the Phase 1 technical validation was ever run:
>
> - **The SharePoint banner can't be removed.** Every tool would sit inside
>   chrome we don't control.
> - **It isn't mobile friendly.** The demo tracker is used on phones in the
>   field, so that alone disqualifies it.
>
> Neither is a bug to work around — they're what SharePoint is. The open
> technical risks (mandatory CSP blocking the ~1 MB of inline script in
> `chs-equipment/index.html`, the undocumented `.aspx`-rename behaviour, PWA
> install and service-worker scope) are therefore moot and were never tested.
>
> **What happened instead:** `internal.chsnz.co.nz`, built in the
> **cmchs-internal-hub** repo — GitHub Pages, one Microsoft sign-in shared
> across every tool on the domain, no third-party chrome, fully responsive.
> That gets the intranet hub this plan wanted, without SharePoint.
>
> Kept rather than deleted so the reasoning survives: this question tends to
> come back. The research below (Custom Script, CSP enforcement dates,
> Permissive Browser File Handling being long retired) is still accurate.

---

Supporting files for the migration plan (`C:\Users\JonathanNasrun\.claude\plans\i-want-you-to-swift-wombat.md`). Everything in here needs to be run/used **by you** — Claude has no access to your Microsoft 365/SharePoint tenant, no credentials, and no way to complete interactive sign-in (MFA etc.), so none of this could be executed from this session directly.

## Phase 0 — intranet landing page

See `phase0-landing-page.md` — exact tile content and click-by-click steps for the SharePoint page. ~10 minutes.

## Phase 1 — validate native hosting is viable

1. `phase1-validate.ps1` — every PowerShell command from the plan's 16-step checklist, ready to paste. Fill in the three variables at the top first (`$TenantAdminUrl`, `$TestSiteUrl`, `$TestLibrary`). Run it block by block, not all at once — several steps need you to check a browser in between before continuing.
2. `test.html`, `test-manifest.json`, `test-sw.js` — the actual throwaway test page the script uploads. Self-contained: shows live PASS/FAIL for inline-script execution, Google Fonts loading, a generic external fetch, a fetch to your real Firebase RTDB (read-only, safe), and service worker registration + scope.
3. `phase1-results.md` — fill this in as you go so the decision in step 16 is based on written results, not memory.

### Requires (one-time, on your machine)

```powershell
Install-Module -Name Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser
Install-Module -Name PnP.PowerShell -Scope CurrentUser
```

## After Phase 1

Once you've got real results, come back with them (or just the filled-in `phase1-results.md`) and the next session can write the actual Phase 2/3 code changes for whichever approach (A/B/C) the results point to.
