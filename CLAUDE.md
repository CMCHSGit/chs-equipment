# CMCHS internal tools — read this first

This repo is the demo equipment tracker (`index.html`, served at demo.chsnz.co.nz),
the Simpro proxy and nightly backup (Apps Script, `.gas-proxy/` and `.gas-backup/`),
and Tile sync (`scripts/tile_sync.py`). The staff schedule is a separate repo
cloned inside it (`cmchs-staff-schedule/`); the intranet hub is a third repo,
`cmchs-internal-hub`, normally cloned next to this one.

**Everything is being merged into one app in `cmchs-internal-hub`:** read its
`INTEGRATION-PLAN.md` first. As pieces move there (rules, Apps Script, the
tracker itself), this repo stops being where they are changed; the plan's
checklist says what has moved.

Before changing anything, read `PROJECT-CONTEXT.md` (how the systems fit
together, and the traps already hit) and `TODO.md`.

## Working agreements

Several people work on these repos with Claude, often at the same time.

- **Pull before you start, and again before you commit.** `git pull` at the start
  of every task; another session has often pushed since.
- **Commit and push to `main` once the change is verified.** No need to ask first.
  Verified means: `node --check` on changed scripts, the page loads without
  errors, and for anything deployed, the *served* version checked, not just the push.
- **`APP_VERSION` in `index.html` is bumped by a pre-commit hook** — never edit it
  by hand. The hook needs `git config core.hooksPath .githooks` once per clone.
  On a merge conflict over it, take the higher number plus one.
- **`cmchs-staff-schedule/` is its own git repo.** `cd` into it before any git
  command for files in it.
- **Secrets never go in a repo, a commit message or the chat.** The repos are
  public. Never print, log or commit the Simpro API key, the service-account
  key or any password; they live in Apps Script Script Properties and GitHub
  Actions secrets. Logs and messages give counts only — never staff or customer
  names, emails or addresses. (Firebase *web* config is not secret.)
- **Apps Script: `clasp push` does not make code live.** It must be followed by
  `clasp deploy -i <deployment id>` (see PROJECT-CONTEXT.md §2), from an
  up-to-date checkout, then check the live `/exec` URL. This has bitten twice.
- **Database rules moved to the hub repo on 16 Oct 2026:**
  `cmchs-internal-hub/rules/database.rules.json` (this tracker's Realtime
  Database) and `rules/firestore.rules`. Edit them there. A push does not
  publish them: they are pasted into the Firebase console by someone with
  access. Say so when a change needs it.
- **Ask before anything people would notice and can't undo:** deleting data,
  changing live rules, rotating keys, anything that signs people out.

## graphify (optional)

If the `graphify` command is installed, there is a knowledge graph in `graphify-out/`:
- For architecture questions, read `graphify-out/GRAPH_REPORT.md` first, and prefer
  `graphify query "<question>"`, `graphify path "<A>" "<B>"` or `graphify explain "<concept>"`
  over grep for "how does X relate to Y".
- After changing code, run `graphify update .` (local, no API cost).

If it isn't installed, skip this section.
