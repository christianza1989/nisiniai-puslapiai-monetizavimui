# Update one market's terms revision

`scripts/update-market-policy.mjs` is an operator-only configuration tool. First verify that the next SHA-256 is the currently eligible, approved public terms page revision for the exact country. Approval of page content and authorization to update production configuration are separate requirements; this helper does not manufacture either.

Supply `--account`, `--database`, `--database-name`, `--confirm-database`, `--store`, `--country`, `--expected-old` and `--next`. With these explicit values the default is a plan with **no remote connection**. Add `--apply-remote` only for the authorized update. `--help` shows the complete command shape. No credential is accepted in command arguments or printed.

The helper checks the same confirmed production target as the migration tool, uses the native D1 binding, validates the complete existing and resulting store, and changes exactly one active market's policy revision. A full prior-JSON compare-and-swap prevents overwriting concurrent owner configuration changes. Every other setting and market remains unchanged. Closed markets are not opened. Existing order snapshots and their accepted terms revision are never edited; the current order replay contract preserves their prior accepted policy.

A stale expected revision fails, including a retry after a successful update. Read the actual result before deciding whether to make another change. Do not force the old config over a later edit. For reversal, re-read current configuration and explicitly confirm both current and intended approved revisions; never restore a whole database snapshot for this operation.

After updating, compare the live markets API with the public approved terms projection and verify that a new checkout shows the actual terms link and an enabled consent checkbox. A previously mounted client holds its old market snapshot until reload. Future content releases must check this relationship: even an SEO description change changes a page revision hash. Do not weaken exact-version matching to make the checkbox clickable.
