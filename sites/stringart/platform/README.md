# MemoryString partner operations

An English, persistent local manufacturer demonstration for the proposed MemoryString studio network. The current [plan](PLAN.md), [acceptance](ACCEPTANCE.md) and [manufacturer runbook](RUNBOOK.md) describe the scope and actual evidence.

From the repository root, using Node 24:

```powershell
node sites/stringart/platform/server.mjs
```

Open `http://127.0.0.1:8946` and select Network operator, Vilnius partner studio or Equipment & materials supplier. The toolbar offers all ten studio identities and an unassigned supplier for the empty state. These are local test sessions, not production authentication. No npm installation or frontend build is needed.

The synthetic database is `.local/operations.sqlite` inside this folder and is excluded from Git. It survives restarts. Use the operator's Reset fixtures control for a clean demonstration. With the server stopped, the equivalent command is:

```powershell
node sites/stringart/platform/reset.mjs
```

`MEMORYSTRING_DB` selects an isolated database path, `PORT` selects another local port, and `NODE_ENV=production` refuses this adapter. Use separate databases for independent demonstrations. The server binds to 127.0.0.1, returns noindex/no-store and performs no external calls.

Run the backend and actual two-process HTTP checks:

```powershell
node --test sites/stringart/platform/tests/*.test.mjs
```

Optional browser verification requires an existing Playwright installation and Edge (default) or another installed Chromium channel. Pass the absolute `playwright/index.mjs` path:

```powershell
node sites/stringart/platform/verify-browser.mjs <absolute-playwright-index.mjs>
```

The full browser suite resets only this synthetic module's fixtures. `MEMORYSTRING_QA_ROUND` names distinct retained capture/report files, `MEMORYSTRING_URL` selects a local test URL and `MEMORYSTRING_BROWSER` chooses an installed channel. The targeted `MEMORYSTRING_FINISH_ONLY=1` path assumes a completed full journey with its portrait and pending purchase still present. Raw reports and captures are local/ignored; curated findings and commands are in acceptance and [first failures](proof/FIRST-FAILURES.md).

Assets are read from the unchanged mobile design kit; JSON projects use the unchanged Android v1 validator. The sample is the kit's original AI golden-retriever photo and its stored solver sequence. No real customer image, machine file, activation code or equipment control is supplied. Bundled fonts retain their original OFL files; the creator/solver provenance and notices remain in the mobile package.

To discard local demo state, use Reset fixtures. To roll back source, check out the prior scoped commit and use a separate fresh database; no production migration or real stock is involved. Do not reuse a database from a newer schema with an older source. SQLite/local browser acceptance does not establish D1/Workers compatibility or public-launch readiness.
