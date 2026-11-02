# Ergonomic mobile, PDF and prelaunch verification —2026-11-02

Common speed and desk PDF fixes pass on the standard preview URL. The additional metadata/cache fix passes on the exact uploaded version URL; standard workers.dev adoption is still unverified/stale. Do not equate API100% with public adoption.

## Exact source and publication

- Built code:77a5b104a030f783fd2eaf5b081c7b9baf7699e2, immutable build-v9. Earlier common/public code13bbaf2a51d3125df6ae8f3ce4eb4a4f815a3d06/build-v8.
- Cloudflare reports f0ddd0bb-364c-4f90-8b27-d04c43ff3330 at100%. All188 downloaded text modules match build-v9 by SHA.
- Verified exact version:[f0ddd0bb preview](https://f0ddd0bb-ergonomic-preview.pinet-azprekyba.workers.dev/).
- Standard [preview](https://ergonomic-preview.pinet-azprekyba.workers.dev/) still serves build-v8 client manifest SHA d1aace85a35008af2eca88b144eb505bb007e7832870313cc127c1bfcc43835a, whereas the exact version serves build-v9 SHA4e82668b01b6ca251331ccf08c17b343b3748036dd97c41e8ea94a8f50b1bc7d. Fresh build-v9 index chunk returns404 on standard host and200/exact SHA on version host. This is an unresolved routing/activation discrepancy, not a claimed successful metadata rollout.
- One explicit existing-version deployment and one unchanged workers.dev enable/previews reapplication did not reconcile standard host. No blind publisher replay. Temporary diagnostic tails were deleted; no customer payloads saved.
- Current full manifest:D:/Core/output/ergonomic-performance-20261102/publisher-metadata-v2/ASSET-FILE-IDENTITIES.json,49985 rows,344 original model variants (256chairs+88desks), current K4ME groups547 retained. New builds retain current and one previous client version. Only46 obsolete older compiled chunk URL aliases retired in two documented plans; no physical files deleted, no original model/runtime/media URLs removed. All historical complete manifests retained.

## Actual mobile measurements

Lighthouse13.6 on this PC against public URLs, not hosted Google PageSpeed. Fresh independent profiles, sequential runs; lab scores fluctuate. Initial baseline/sourcef4, standard run/source13bb, exact version/source77a.

| Page | Before | Standard preview | Exact new version |
|---|---:|---:|---:|
| home | 73 | 95 | 93 |
| desks | 96 | 96 | 97 |
| chairs | 95 | 96 | 96 |
| bjarg | 85 | 91 | 93 |
| emodel | 91 | 92 | 93 |
| 4me | 90 | 96 | 97 |
| contact | 92 | 91 | 92 |
| guides | 100 | 100 | 100 |

Home initial transfer fell from~4.94MB to~1.27MB; standard LCP~16.0s to2.87s. Exact-version LCP3.10s. Main image uses existing canonical Core responsive pipeline; original PNG and layout/crop/copy remain. Header reuses existing pixel-identical branding. Original carousels and demo activate on section visibility/focus; footer links no longer prefetch offscreen destinations. All8 exact-version pages score SEO69; only blocking audit is intentional noindex. Standard dynamic-page SEO remains58 in this Lighthouse version because metadata remains outside head there; older hosted Google score69 used a different Lighthouse run.

## PDF, rendering and cart

Default eModel23846540/KEM2013WW009 PDF changed from400 to200, including1600mm and selected2000mm. The fallback requires exact product/configuration/code, original full1600x1600 attributed photo, PNG signature, content-addressed URL, full byte SHA; invalid or another model state remains400. WebP→PNG decoded RGBA is identical. No remote or another model image fallback. Four default model PDFs and browser-local saved quote configurations pass on standard host; no quote was submitted. Both selected-width PDFs pass again on the exact new version. All four rendered PDF pages were visually inspected.

20 exact nonblank before/after GPU framebuffer pairs,16 product/device cases, unchanged controls/codes/geometry and reused WebGL contexts passed before the final metadata-only change. The final source delta from13bb touches only next.config.ts and deployment headers. Homepage carousels, keyboard navigation, demo color/reset and footer navigation pass at desktop and phone sizes; hero/header geometry and approved copy match baseline. Both TypeScript projects pass;5 focused PDF/hero tests pass; all builds record actual exit0.

## Metadata and prelaunch findings

Existing approved descriptions and canonical links now render uniquely inside head on exact version, with JavaScript enabled and disabled. All copy remains unchanged. Configuration uses documented [htmlLimitedBots disabling](https://nextjs.org/docs/app/api-reference/config/next-config-js/htmlLimitedBots). Exact-version hero/PNG/font return proper MIME and immutable caching; complete source/font/current groups547 review hashes match. Standard host still has old metadata/cache behavior, explicitly unresolved above.

Prelaunch is not ready. Local-only proposed production simulation uses the final build; it does not alter DNS, Launch or live indexing. Current production proposal still exposes a fallback homepage with no canonical and noindex,nofollow, rather than the approved preview homepage. Three existing pages lack descriptions: /privatumas/, /aktyvus-sedejimas/, /shop/balansines-kedes/. Sitemap has16 approved URLs and no technically collected product routes because content publication/translation admission is not complete. These are release/content gates; do not mark products published or remove protections to increase a score. Preview robots/noindex remain; live ergonomic.lt and ergonomic-launch were not changed. llms.txt/llms-full.txt returned200 in baseline check; previous hosted timeout was not reproduced.

## Coordination and recovery

No Native/controller/collector/lease changes; no chair source/RAW/GLB/runtime/packages or other worktrees altered. No completed archiving helper rerun. Source is on this chat's branch only; PR320 remains for review, not merged to main. Standard measured source13bb/previous API765ec021 and prior05aa92fe/build-v6 remain recoverable alongside current APIf0. Do not roll back or republish from an old manifest without checking both true public route and actual current API version.

Evidence:D:/Core/output/ergonomic-performance-20261102/mobile-pdf-seo-v1; publication:D:/Core/output/ergonomic-performance-20261102/publisher-metadata-v2; routing ledgers:D:/Core/output/ergonomic-performance-20261102/route-activation-v1 andD:/Core/output/ergonomic-performance-20261102/subdomain-refresh-v1. Disk free at report: D=98518233088B; E=163436945408B.
