# Phase 0 — Intranet landing page

Claude cannot create this directly (no access to your SharePoint tenant). This is the exact content and the steps to build it yourself in the SharePoint UI — should take about 10 minutes.

## Steps

1. Go to your SharePoint home (or the specific Communication Site you want this on — create a new one if you don't have an obvious existing "intranet" site: **SharePoint admin center → Create site → Communication site**).
2. On the site, go to **New → Page → Blank** (or edit the existing home page directly).
3. Set the page title to: **CHS Internal Tools** (or whatever name you prefer).
4. Add a **Hero** web part (good for two large tiles with images) *or* a **Quick Links** web part (simpler, works as a plain list of tiles) — either works, Hero looks nicer. Configure two tiles with the content below.
5. **Publish** the page, then set it as the site's home page: **Site settings → Set as home page** (or during site creation, it's already the default landing page).

## Tile content

**Tile 1**
- Title: `Equipment Demo Tracker`
- Description: `Scan, loan, and track CMCHS demo equipment`
- Link: `https://demo.chsnz.co.nz`
- Icon/image suggestion: a QR code or box/package icon (SharePoint's Hero web part has a built-in icon picker)

**Tile 2**
- Title: `Staff Schedule`
- Description: `View rosters, on-call, and leave`
- Link: `https://schedule.chsnz.co.nz`
- Icon/image suggestion: a calendar icon

## Notes

- These links point at the apps' **current** (GitHub Pages) addresses. Once either app actually migrates (Phase 2/3), come back and edit this page's two links to point at the new SharePoint address instead — no need to wait for both to move before shipping this page now.
- Optional polish, not required: a friendlier address than the raw `*.sharepoint.com` URL isn't something SharePoint itself can do (no custom domain support), but since you already control `chsnz.co.nz` DNS, you could set up a subdomain (e.g. `internal.chsnz.co.nz`) as a DNS-level redirect to this page's real SharePoint URL once you know what that URL is. That's a DNS change with your registrar/IT, not something scriptable here.
- Access: a SharePoint page defaults to "anyone in the org who has access to this site" — review the site's permissions once if you want to restrict it further (e.g. to specific groups), otherwise the default is normally fine for an internal tools page.
