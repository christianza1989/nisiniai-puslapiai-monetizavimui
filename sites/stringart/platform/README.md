# MemoryString partner operations

An English, persistent local manufacturer demonstration for the proposed MemoryString studio network. The current [plan](PLAN.md), [acceptance](ACCEPTANCE.md) and [manufacturer runbook](RUNBOOK.md) describe the scope and actual evidence.

The default fresh database contains the complete **September 2026** fixture for all ten studios: 489 September orders (186 portraits / 303 kit orders, 621 kits ordered), plus ten labelled August carry-over orders. Every studio has orders on all 30 days. Monthly sales are an order-creation cohort: current collected amounts less current refunds for September-created orders, rather than a cash-flow statement. Stock is initially the 30 September snapshot and remains live in the local adapter.

The fixture includes 40 assembly batches / 212 assembled kits, 100 supplier purchase orders (70 received, 30 open), 20 inter-studio transfers, 12 creator sources, 382 commission rows, 4,180 audit entries and 2,893 stock movements. Opening packed kits are 825; reconciled current packed kits are 612. Completed, returned, cancelled and all active portrait/kit stages remain actionable. The original AI pet photo/sequence is a shared prepared sample, not 186 individual customer photographs.

Existing databases are never silently replaced at startup. To load this month into an older synthetic database, stop the server and run the reset command below: the CLI first saves a consistent SQLite backup under `.local/backups/`. The operator's Reset fixtures control restores the selected profile; it does not create a new backup. `MEMORYSTRING_FIXTURE=baseline` selects the original small `eu-ten-v1` fixture for historical acceptance/regression. Month is the default for a fresh database and reset; both remain local test data.

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
