# Madbeauty live commerce targets for article production

Read-only reception of `https://madbeauty.lt/content-targets.json` on 2026-10-09. The current canonical consumer serves package `98882a2d62274315166757ebc581a1cc2b4aff98f4425b179a676e4bae8cf9b2`; the existing deployment receipt records version `4e43bd2d-e5ea-491f-ae3e-ea74d260fbe9`. No runtime or production data was changed for this handoff.

- `content-targets.json` contains the exact public response bytes, suitable for the existing typed-target importer. SHA-256: `a3265007aa51b5338728631b2782e410b6004804381c99c798210ef3a4991012`.
- `catalogue-context.json` supplies the matching taxonomy hierarchy, labels, scope, informational purpose, city choices and actual local target list. SHA-256: `f82bda7c0c8095449ea1c4b75f2b0ff6cf8ee5f12aeedfba1ba7854a8c649501`.
- `VERIFICATION.json` records all 257 canonical national routes returning 200, exact canonical, one server-rendered heading, noindex, and all 103 city options. It also records empty supply, sitemap exclusion and four representative unavailable routes returning 404.

There are 14 ready categories, 49 ready groups and 194 ready procedures (257 national targets), 48 planned extension targets, and zero ready local targets. All national targets are informational and noindex. These numbers describe the catalogue hierarchy, not available provider offers. All 103 cities are selector choices; they do not establish local supply or a published city landing page.

For each article, use its genuine `taxonomyNodeId` and optional verified `cityId` with the existing resolver. Preserve `routeRegistryId`, the canonical URL, informational purpose and empty `allowedQueryParams`. Include the parent path when deciding whether a group or treatment matches the reader's question. Planned extensions and unavailable local routes must remain unlinked. The unregistered `/paslaugos` navigation index is not a fabricated `mb:catalog:all` typed target. Do not manufacture query/hash links, providers or availability promises.

This snapshot was generated at `2026-10-09T20:49:23.509Z` and expires at `2026-10-09T21:49:23.509Z`. Fetch the public registry again before revision-bound article review and final export. Import its genuine response and record its new SHA/timestamps; do not extend this file's expiry by hand. A later publication package must be checked against the then-current canonical consumer and registry. This handoff does not admit or deploy the upcoming 60-article batch.

The existing autonomous article policy remains in force: genuine agent review of facts, sources, media, links and rendering, without a human specialist approval gate.

The bounded `verify.mjs` helper reproduces this read-only reception (six concurrent requests, 20-second timeout). Running it replaces this folder's snapshots and verification; copy/archive a receipt before a subsequent reception if its historical identity is needed. Any README SHA/timestamps must be updated to match that new actual verification.
