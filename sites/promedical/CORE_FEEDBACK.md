# Promedical private rewrite pipeline

2026-10-18, issue [203](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/203).

Generation, factual/language review and private import now have independent queue lanes. A single importer owns shared native/CP/TES writes. Pages are accepted independently; explicit content rejection requeues only that page. Ambiguous author sends and interrupted imports are held, never automatically replayed.

`content-studio/scripts/rewrite-pipeline.mjs` uses the existing `CURRENT_LEAN_BATCH.json` envelope. `init --state ... --input ...` adds its queue without replacing old operations. `run --state ... --config ...` continues intake → actual MCP DOM at 1440/390 → current Core review → exact checkpoints → private reader updates. The real Codex host answers `next`, `claim`, `send-intent` and `reply` requests; this is not an unattended browser/API driver. `pause` persists an owner stop. One consolidated RESULT retains compact per-page preimages and outcomes, not a full-site snapshot per page.

The editor reads every H1, description, paragraph and own source reason once. Optional Codex body changes are limited to eight word edits per original paragraph, with exact diffs, protected facts/models/URLs/labels and truthful mixed provenance. The lexical guard does not prove unchanged meaning: the editor still checks it. Larger changes return to Gemini in the next batch.

Author prompts include two current reviewed examples and recurring factual/language errors. Actual Enter dispatch uses a host-persisted intent, unique batch ID and observed history acknowledgement; a query acknowledgement is not a completed answer. No automatic resend is permitted. Chrome throttling flags are a launch plan until verified on the actual existing-profile browser process; opening another window in an already running process does not prove they took effect. No other Chrome sessions are restarted.

Known-template DOM checks need no routine screenshots; new media/layout and failures still need appropriate visuals. Source preparation shares immutable source reads within Klaro categories, with separate SKU-bound page facts. Catalogue IDs, parent links, labels, memberships, protected originals and public package bytes stay guarded.

Publication remains paused; reminders stay deleted. Throughput counts unique current native pages with official current review and exact CP/TES state over total elapsed work time. Fifty texts per hour remains a measured target, not a test result. Tests use synthetic isolated data; the separately observed native DOM pilot validates only the existing preview and both widths, not a new live author cycle.
