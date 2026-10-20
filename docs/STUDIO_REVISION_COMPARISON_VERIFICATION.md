# Studio changed-text visibility and comparison

Owner-authorized scope, 2026-10-20; issue 233. Existing list pills described only
the published snapshot, so an operator could not distinguish a rewritten draft
or compare it to the removed old text. This patch preserves the existing local
Studio identity, data model, approval gates, and export behavior.

## Scoped presentation plan and acceptance

- Preserve the current system font, colours and navigation. Place draft/review
  status beside each page, independently of historical publication status.
- Give complete page titles their own row; put the extra actions beneath them
  rather than squeezing the title between badges and buttons.
- Add a labelled filter and **Senas / naujas** action in the list and editor.
- Show old/current text in two desktop columns and stacked mobile sections;
  wrap long titles/URLs and preserve every text block, including rich V2 text.
- State absent history explicitly and keep archived text read-only/private.
- Derive review badges with canonical hash and context checks, not import dates.

## Validation

Three dedicated tests cover immutable baseline import, no empty-cleared-draft
false positives, stable object-key comparison, missing history, path guards,
read-only HTTP access, context-bound current review and edit invalidation, and
cross-origin denial. Existing studio regression plus these tests: **50/50 PASS**
with `node --test --test-concurrency=1 content-studio/test/*.test.mjs`.

An initial concurrent run passed 49 and encountered Windows `EPERM` opening the
existing concurrent-writer test lock. It was not suppressed or repaired by
loosening locks; the complete serial regression passed. No production calls.

Actual isolated QA: desktop 1280, mobile 390/320, all/changed/reviewed filter
behavior, two real old/current columns, absent-history state, and CSS text
enlargement/spacing without horizontal overflow. CSS enlargement is not browser
zoom or a full WCAG certification. The first list check exposed title squeezing;
one scoped layout repair moved actions below the full title. The final captures
confirmed the layout. A missing-history assertion initially ran before the
asynchronous response completed; waiting for its actual DOM confirmed the state.

The Impeccable detector reported three inherited style warnings (existing accent
borders and Inter font). They do not originate in the changed rows/comparison;
this scope preserves the incumbent identity instead of redesigning the app.

Private QA screenshots, source hashes, baseline digest and local adoption/rollback
receipts stay under the task output directory, outside Git. No old draft body,
contact data, or full site backup is included here. Source delivery through a PR
is separate from main merge, other-PC adoption and production publication.

## Draft navigation follow-up

The owner reported being unable to enter a draft from the changed-text URL.
Read-only reproduction confirmed edit, comparison and new-tab preview in the test
browser; the owner's browser-specific cause was not established. Preview links
now navigate in the same tab and explicitly say **Atidaryti juodraštį**. The
comparison has direct draft-edit and preview actions, alongside the return action.
Status badges remain separate status labels.

Actual QA with a private data copy confirmed list-to-preview, comparison-to-editor
and editor-to-preview at 1280/390/320, browser Back, no additional tabs and no
horizontal comparison overflow. Direct comparison-to-preview and calendar preview
also passed. Desktop and 320px screenshots were inspected. JavaScript syntax
validation passed; no model/server/gate code changed.

Only static app.js was locally adopted; the standing 4317 server was not restarted.
Real 4317 preview/editor navigation passed with zero browser console errors.
Active site bytes, approvals and published snapshots were unchanged. The dedicated
QA server and owned browser tabs were closed after verification.
