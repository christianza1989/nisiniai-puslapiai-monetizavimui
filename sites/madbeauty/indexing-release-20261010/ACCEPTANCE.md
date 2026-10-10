# Madbeauty public directory, service tree and indexing release

Live technical acceptance passed on 2026-10-11 (Europe/Vilnius). Cloudflare version `c7fe3d2c-bd49-4ab9-8a11-7631f017cc4d`, runtime source `814020b5d6203277b38d3acab11ee73ae60fe0f4`, artifact SHA256 `f266712ff28cab1554007aac6840801ffdb9e144206e64c2df91edd835f2c271`. Pinned core `5661d5d6907d6f5d11514ae69c0decc6130d65e2`; approved immutable package `e20c3b95b57ae9f813e55ffd0ef46688a937a7d63fe1c70246a92b8a71e71953` (129 pages, 840 declared assets). No production data, SMTP, DNS, auth or storage migration changes. All existing bindings, observability, QA and temporary dummy-trial deployment records preserved.

## Behavior

- Homepage/results dropdown expands category → group → procedure, preserves broad selections, searches accentless names/aliases, supports keyboard navigation and stays within narrow viewports. Selected branch opens directly. This extends the preceding same-page category/procedure/city picker and transparent category asset release.
- `/salonai`, `/meistrai` and city directories compare approved public locations with actual service prices and reviews. GET filters and pagination remain usable without JS. Map view shows the selected approved coordinates through OpenStreetMap; profiles without coordinates show their address, with no invented marker. This is not a simultaneous multi-marker map.
- Public profile SSR includes visible gallery, service list and the same rating summary as LocalBusiness JSON-LD. Enhanced rendering retains/recreates the schema. Zero-review profiles have no aggregateRating. Dummy/unapproved providers are excluded from public directory JSON, schemas and discovery.
- Published server content, title, canonical, robots and JSON-LD survive client API failure on their exact route. Private workspaces and unknown/empty/facet pages retain their own exclusion policy.
- `/paslaugos` and 14 core category hubs are indexable. National provider hubs are indexable; only populated real city directories enter sitemap. Anonymous approved gallery images are crawlable; private images remain inaccessible. `/api/` stays disallowed except the existing authorized public image projection.

## Evidence

- 14 tree, recovery, picker and public profile/directory tests passed. Earlier targeted native gallery and article → catalogue tests passed (2); those alone were not treated as production artifact acceptance.
- Exact pinned compiled artifact passed 159 isolated native Workers checks: SSR/status/indexing, catalogue/category hubs, private/facet guards, actual approved local provider/gallery/location, anonymous image access, public projection privacy, sitemap and all 122 future pages hidden at test time. Fixture accounts and gallery image existed only in local Miniflare; no external mail sent.
- Wrangler dry-run passed. Provider lease checked immediately before deployment; binding/QA/trial checks passed after deployment.
- Live HTTP acceptance passed 35 checks including current deployed asset hashes, 34 sitemap URLs, category/provider hub metadata and private/facet noindex. Canonical currently has **0 approved real profiles**. Empty city directories are truthful and noindex until populated. The separate temporary trial still holds its own test data and was not overwritten.
- Actual Chrome desktop/mobile: service selection, filters and zero-result recovery verified; 390px directory had body width equal to document width (375px), no horizontal overflow. Screenshot evidence is in `../services-picker-20261010/screenshots/`.
- Actual compiled Worker browser with `/api/` deliberately blocked: server homepage still visible, robots `index,follow`, canonical `https://madbeauty.lt/`, one JSON-LD script, truthful interactive-function failure notice. This reproduced the earlier Search Console rendering failure and verified its correction.
- Google Search Console homepage live inspection **2026-10-11 00:39:55**: crawl allowed Yes, fetch Successful, indexing allowed Yes, Page can be indexed. Homepage indexing request accepted into the priority queue. The old stored index report still references its October 7 noindex crawl; actual indexing is pending Google processing.
- Google Search Console `/paslaugos` live inspection **2026-10-11 00:41:05**: crawl allowed Yes, fetch Successful, indexing allowed Yes, correct canonical. Indexing request accepted. Existing `https://madbeauty.lt/sitemap.xml` resubmission succeeded (Submitted October 11); last-read/discovered count still reflects October 10 (17), whereas the deployed sitemap currently contains 34 URLs. Google reread and indexing are pending, not reported as completed.

## Gallery and SEO limits

Existing provider Gallery workspace supports PNG/JPEG/WebP upload (12 MB), up to 24 gallery entries, ordering, captions, service association and staff portraits. Publication uses the existing profile revision approval; article automation rules were not altered by this release. Native gallery access/restart tests verify the existing workflow. A bulk-upload or drag-and-drop editor was not added here.

Google decides final indexing and rich-result appearance. Review snippets require real visible reviews; they are not promised for unrated profiles or test data. Guidance: https://developers.google.com/search/docs/appearance/structured-data/review-snippet and https://developers.google.com/search/docs/appearance/structured-data/local-business.

Rollback is the previous application version `fd24248a-9e0b-4bf5-9eb4-c5c4ee1f6131`; it is not a database rollback. No production writes were made during this acceptance.
