# Working on the CMCHS internal tools with Claude Code

This gets you set up to change the CMCHS tools with Claude Code and push those
changes live yourself. About 30 minutes, once.

## What's what

| Repo (github.com/CMCHSGit/…) | What it is | Where it runs |
|---|---|---|
| `chs-equipment` | Demo equipment tracker (one big `index.html`), the Simpro proxy and nightly backup (Google Apps Script), Tile sync | demo.chsnz.co.nz, and inside the hub at /demo/ |
| `cmchs-internal-hub` | The intranet: home page, staff schedule, maintenance, service orders, SimproSync, Ansur → PDF, admin settings | internal.chsnz.co.nz |
| `cmchs-staff-schedule` | The schedule's Firestore security rules, plus the old standalone schedule | Rules are pasted into the Firebase console |

Sign-in everywhere is the staff Microsoft account, through the
**cmchs-staff-schedule** Firebase project. The tracker's data is in a second
Firebase project, **chs-equipment**.

## 1. Get access

Ask Jonathan for:

- **GitHub (everyone):** membership of the **CMCHSGit** organisation with **write**
  access to the three repos. This is what lets you push.
- **The hub's `.env` values (everyone):** for running the hub locally with real
  sign-in. Not secret, but kept out of the repos; get them by direct message,
  not email.
- **Only if you'll change the Simpro proxy or backup:** editor access to the
  two Apps Script projects, shared to your Google account.
- **Only if you'll change sign-in settings or security rules:** a role on the two
  Firebase projects.

## 2. Set up your computer

1. Install **Git**, **Node.js 20 or newer**, **VS Code**, the **Claude Code**
   extension for VS Code, and the **GitHub CLI** (`gh`). Then run
   `gh auth login` and sign in with the GitHub account that has CMCHSGit access.
2. Clone the repos in this layout (the schedule repo goes *inside* `chs-equipment`):
   ```
   git clone https://github.com/CMCHSGit/chs-equipment
   git clone https://github.com/CMCHSGit/cmchs-staff-schedule chs-equipment/cmchs-staff-schedule
   git clone https://github.com/CMCHSGit/cmchs-internal-hub
   ```
3. In `chs-equipment`, switch on the version-bump hook (once per clone):
   `git config core.hooksPath .githooks`
4. In `cmchs-internal-hub`: run `npm install`, then copy `.env.example` to `.env`
   and fill in the values from step 1. Check with `npm run build`.
5. Only for Apps Script work: `npm install -g @google/clasp`, then `clasp login`.

## 3. Working with Claude

- Open **one repo folder** in VS Code: `chs-equipment` for the tracker, proxy or
  rules; `cmchs-internal-hub` for the hub and its tools.
- Claude reads that repo's `CLAUDE.md` on its own. It holds the shared working
  rules: pull first, never commit keys, how deploys work. Each person's Claude
  keeps its own memory, so rules everyone should follow go in `CLAUDE.md`,
  committed, not in your memory.
- For anything bigger than a small fix, start with: *"Read PROJECT-CONTEXT.md
  and the README, then…"*
- Describe the outcome you want ("phones should open Teams in the app"), not
  the code change. Ask Claude to test in the browser before pushing.
- Claude commits and pushes to `main` once a change is verified. Read its
  summary and check the live site afterwards.

## 4. How a change goes live

| You changed | It goes live by | Time |
|---|---|---|
| Tracker (`chs-equipment/index.html`, `sw.js`) | Push to `main` → GitHub Pages | ~1 min on demo.chsnz.co.nz; the hub's /demo/ copy updates on its next deploy (hourly, or any hub push) |
| Hub or any tool in it | Push to `main` → GitHub Actions builds and deploys | 2–3 min |
| Simpro proxy / backup (`.gas-proxy`, `.gas-backup`) | `clasp push` **and** `clasp deploy -i <id>`: push alone is **not** live | Immediate; then test the live URL |
| Firestore or database rules | Paste the file into the Firebase console | Immediate |

Installed apps on phones pick up a new version the next time they're opened.

## 5. Rules that matter most

- **Pull before you start.** Others push often.
- **No secrets in repos, commits or chat.** The repos are public. Keys live in
  Apps Script Script Properties and GitHub Actions secrets.
- **No staff or customer names, emails or addresses in logs.** Counts only.
- **Ask before anything irreversible:** deleting data, changing live rules,
  rotating keys, anything that signs people out.

## 6. Where to read more

- `chs-equipment/PROJECT-CONTEXT.md`: how everything fits together, the traps
  already hit, open items
- `chs-equipment/TODO.md`: what's planned
- `cmchs-internal-hub/README.md`: the hub's structure, local running, adding a tool
- `chs-equipment/SIMPROSYNC-HANDOFF.md`: SimproSync in depth
