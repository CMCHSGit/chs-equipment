<#
.SYNOPSIS
  Phase 1 validation commands for the chs-equipment / cmchs-staff-schedule
  SharePoint hosting migration (see the full plan for context/rationale).

.NOTES
  You have to run this yourself, interactively, signed in as you -
  Claude has no access to your Microsoft 365 tenant and cannot run any of
  this. Copy/paste block by block rather than running the whole file blind;
  several steps need you to look at a browser in between.

  Requires (install once if you don't have them):
    Install-Module -Name Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser
    Install-Module -Name PnP.PowerShell -Scope CurrentUser

  Fill in these three values before running anything:
#>

$TenantAdminUrl = "https://YOURTENANT-admin.sharepoint.com"   # SharePoint admin center URL
$TestSiteUrl    = "https://YOURTENANT.sharepoint.com/sites/chs-migration-poc"
$TestLibrary    = "Shared Documents"                           # or wherever you upload the test files


# --- Step 2: read-only tenant posture check (do this FIRST, before changing anything) ---
Connect-SPOService -Url $TenantAdminUrl
Write-Host "`n--- Tenant-wide settings ---" -ForegroundColor Cyan
(Get-SPOTenant) | Select-Object PermissiveBrowserFileHandlingOverride, ContentSecurityPolicyEnforcement, DelayContentSecurityPolicyEnforcement
Write-Host "Expect PermissiveBrowserFileHandlingOverride = False (confirms it is not available tenant-wide)." -ForegroundColor Yellow
Write-Host "Whatever ContentSecurityPolicyEnforcement shows, treat the CSP risk as live either way - see the plan's headline-risk note.`n" -ForegroundColor Yellow


# --- Step 1: create the isolated test site (skip if you already made one by hand in the SharePoint admin UI) ---
# New-SPOSite -Url $TestSiteUrl -Owner "you@yourtenant.com" -StorageQuota 1024 -Template "SITEPAGEPUBLISHING#0"
# (Commented out deliberately - creating a site via the modern admin center UI is just as easy and lets you
#  pick "Communication site" interactively. Uncomment and adjust -Template only if you would rather script it.)


# --- Step 3: enable Custom Script on the TEST SITE ONLY (site-collection scoped - does not touch anything else) ---
Set-SPOSite -Identity $TestSiteUrl -DenyAddAndCustomizePages 0
Write-Host "Custom Script enabled on $TestSiteUrl only. Verifying..." -ForegroundColor Cyan
Get-SPOSite -Identity $TestSiteUrl | Select-Object Url, DenyAddAndCustomizePages
Write-Host "Expect DenyAddAndCustomizePages = Disabled (i.e. custom script now ALLOWED).`n" -ForegroundColor Yellow


# --- Connect to the test site itself for file operations (separate connection from the admin one above) ---
Connect-PnPOnline -Url $TestSiteUrl -Interactive


# --- Step 4: upload the test files ---
# Run this script from the sharepoint-migration folder, or adjust the paths below.
Add-PnPFile -Path ".\test.html"          -Folder $TestLibrary
Add-PnPFile -Path ".\test-manifest.json" -Folder $TestLibrary
Add-PnPFile -Path ".\test-sw.js"         -Folder $TestLibrary
Add-PnPFile -Path "..\icon-192.png"      -Folder $TestLibrary
Write-Host "Uploaded. Now get the file's direct URL:" -ForegroundColor Cyan
$testFile = Get-PnPFile -Url "$TestLibrary/test.html" -AsListItem
Write-Host "Find it in the library and copy its URL manually if the above doesn't print one directly.`n" -ForegroundColor Yellow


<#
  --- Step 5 (MANUAL -- do this in a browser) ---
  Paste the test.html file's own direct URL into the address bar (not "Open" from the
  library view -- the actual file URL). Record what happens:
    - Forced download?
    - Inert HTML-as-text preview?
    - Live execution (you see the PASS/FAIL checks fill in on the page)?

  If it's a download/inert preview, continue to Step 6 below.
  If it's live execution, skip to Step 7 (just read the results already on the page).
#>


# --- Step 6: if Step 5 did not execute live, rename to .aspx and retry ---
# (Needs AddAndCustomizePages permission - you already have it since you just enabled Custom Script above.)
Rename-PnPFile -SourceUrl "$TestLibrary/test.html" -TargetFileName "test.aspx"
Write-Host "Renamed to test.aspx. Repeat Step 5 against the new .aspx URL.`n" -ForegroundColor Cyan
# Known quirk: if it still looks wrong first try, pull the file down once and it often corrects itself:
# Get-PnPFile -Url "$TestLibrary/test.aspx" -AsFile -Path . -Filename "test-check.aspx"


<#
  --- Step 7 (MANUAL) ---
  On whichever variant actually executed: read the PASS/FAIL lines on the page itself.
  Check 4 (the real Firebase RTDB fetch) is the single most decision-relevant result.

  --- Step 8 (MANUAL) ---
  Re-navigate to the same URL with ?csp=enforce appended, see if anything changes.

  --- Step 9 (semi-automatic -- already wired into test.html) ---
  The page registers test-sw.js on load. Check the "Service worker registration + scope"
  result line, then open DevTools -> Application -> Service Workers to see the actual
  effective scope SharePoint gave it.

  --- Step 10 (MANUAL) ---
  DevTools -> Application -> Manifest -> check "Installability", then actually try
  "Install app" (desktop Chrome: the install icon in the address bar). Confirm a real
  standalone window opens with no SharePoint chrome around it.

  --- Step 11 (MANUAL) ---
  Repeat the whole test.html visit + Step 10's install attempt on a real Android Chrome
  phone AND a real iOS Safari phone - separately. Install heuristics and SharePoint's
  own mobile rendering both differ from desktop.

  --- Step 12 (MANUAL) ---
  From the same page, open the browser console and run:
    navigator.mediaDevices.getUserMedia({video:true}).then(s => console.log('camera OK', s)).catch(e => console.error('camera FAILED', e))
  Confirm you get a permission prompt and then "camera OK" - not a FAILED error.

  --- Step 13 (MANUAL -- needs more setup) ---
  This one needs a real FCM web-push subscription and a way to actually send to it.
  Simplest path: temporarily point this test page's push subscription logic at your
  existing Firebase project's VAPID key (same one index.html already uses), subscribe,
  then fire a test push via Settings -> Test Notifications in the live app (or a manual
  call to .gas-proxy's sendTestPush_ path) targeting that new subscription. This is
  the one step genuinely worth doing last, only once everything else above is green -
  skip it entirely if 1-12 already came back negative.
#>


Write-Host "`n--- Decision gate (Step 16) ---" -ForegroundColor Green
Write-Host "Once you have been through 1-13 (or 1-8 stopped you early), compare your results" -ForegroundColor Green
Write-Host "against the three-approach table in the plan file and pick A, B, C, or a hybrid" -ForegroundColor Green
Write-Host "before touching any of the real chs-equipment / cmchs-staff-schedule files." -ForegroundColor Green


# --- Cleanup when you are done experimenting ---
# Remove-PnPFile -ServerRelativeUrl "/sites/chs-migration-poc/$TestLibrary/test.aspx" -Force
# Set-SPOSite -Identity $TestSiteUrl -DenyAddAndCustomizePages 1   # re-lock custom script if you want
# Remove-SPOSite -Identity $TestSiteUrl -Confirm:$false             # delete the whole test site
