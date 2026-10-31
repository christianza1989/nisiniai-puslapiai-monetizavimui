# Live performance repair — 2026-10-31

The owner authorized repairing the diagnosed PageSpeed findings while preserving appearance and animations, followed by new mobile and desktop measurements. The repairs are live. No public prose, contacts, claim wording, company identity, privacy decision, form protocol or native content was changed. No form POST or additional email was sent.

## Baseline and final deployment

- Owner report [hw5e2j6d5g](https://pagespeed.web.dev/analysis/https-kvapunaikinimas-lt/hw5e2j6d5g?form_factor=mobile): mobile performance87, FCP1.8s, LCP3.5s, TBT0, CLS0, SI4.8s; accessibility100, best practices96, SEO100.
- Prior independent report pgzswtu56d: mobile90/LCP3.5s, desktop99/LCP0.7s. These are separate lab runs.
- Final PUBLIC source: 99c82d7010767090d60f0d799163340c33e1cdcd. Production build01a19228-4614-7208-b12d-7bb349d2a7c6 completed at2026-10-31T13:33:01Z. Stage build01a19223-f08f-718b-b05e-2fa8fcb73b20 completed first with the exact same archive.
- Archive kvapu_20261031_perf_v9.zip:4,033,234 bytes; SHA256 51f7ea1ac4f0faee4da18b06b3b5ecdef918aa0eb879d759fc4252666ae523a5.
- Approved native release2690244f-d1f7-452a-96ed-987ad872b388 and package SHA0879e710f120d0084c6cdcf86b29e24474656727f85eb7abbb981328c3430326 remain unchanged:12 pages,81 media,225 non-image blocks.
- Both fetched main bases remain ancestors: CORE25292e20219b735df7f04c5807dd4c100f98addc and PUBLICc2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da. Same owned branches and draft PR305/104; live adoption does not imply a main merge.

## Repairs

1. The one-site Hostinger export now writes a target-only page entry importing the original renderer and extracted shared host/publication context. This removes other themes from this site's page dependency graph while preserving generic dispatch in canonical source. Initial CSS requests fell10→3 and script requests8→6; the unrelated handyman.css404 is gone.
2. The final build copies81 original native images and four unchanged fonts into Next's immutable static delivery directory. Renderer background/preload/srcset and exported font-face URLs use those copies. Font filenames carry content hashes. Actual live image/font replies now have public,max-age=31536000,immutable. Existing original media URLs remain byte-identical and accessible for compatibility; production serves those legacy public files outside Node, so they are not falsely described as having the new header.
3. The nine circular images use300/500px AVIF candidates with quality85 and an original WebP-family fallback. The500px family preserves the existing high-DPI capability. Picture display:contents preserves layout. Recompressed WebP500 was larger than its original, so it was not retained as the fallback.
4. Next16's internal optimizer request omitted Host and was rejected by the tenant guard. The final optimizer fetches only canonical HTTPS native-media URLs with a strict remote pattern. Tenant/publication checks and private-IP protections remain enabled. Managed-asset preparation additionally fails closed for paused/revoked/future selected pages.

Hero preload and gzip already worked. No hosting upgrade, DNS/CDN-mode/environment/database change or other site's deployment was needed. Original provider/security .htaccess directives were restored byte-exact after the ineffective header experiment. No WordPress uninstall or backup restoration occurred.

## Verification

- PUBLIC core suite:324/324 PASS; final-source local TypeScript and scoped ESLint PASS. Actual stage and production Next/TypeScript builds PASS; production pruned dependency audit reports zero vulnerabilities.
- Stage and production qualification each pass12 routes,81 original hashes plus81 managed copies,13 initial/nested resource URLs,36 optimizer width/format replies, titles/canonicals/H1/schema, sitemap/robots/LLM/icon endpoints and missing/protected paths. No findings.
- Actual stage and production browser comparisons each cover all12 pages at390/1440px:24 cases,712 painted typography/form roles plus all image/section boxes match pre-change baseline within0.05px. Text, original image/alt references, fonts and fixed/scroll backgrounds match; no horizontal overflow.
- Canonical CSS is unchanged except font version queries, and motion client source is byte-identical. Final live sampling:715 mobile and714 desktop samples over12.5s each; both5/4-image carousels show leftward intermediate frames and cycle resets, with no controls. Motion remains2000ms/500ms.
- Offscreen deferred proof images were not mistaken for failures: the first mobile motion sample naturally loaded2/5 offscreen items, then an actual scroll into the visible proof region confirmed all5/5 loaded (top383.55px, bottom683.55px). Actual live desktop/mobile screenshots were saved and viewed.
- Mobile menu and conditional phone/email required state remain verified in the hosted stage; no submit. Existing SMTP settings and earlier owner-confirmed production receipt2c62a4b1 are unchanged.

## Fresh Google PageSpeed results

Three reports were run on the final live homepage. Values below are displayed lab metrics from Lighthouse13.6.0, not a new28-day CrUX certificate.

| Report | Mobile score / LCP | Desktop score / LCP |
| --- | --- | --- |
| [fvg4wdcasr](https://pagespeed.web.dev/analysis/https-kvapunaikinimas-lt/fvg4wdcasr?form_factor=mobile) | 100 /1.7s | 99 /0.4s |
| [uaqxdn0akb](https://pagespeed.web.dev/analysis/https-kvapunaikinimas-lt/uaqxdn0akb?form_factor=mobile) | 97 /2.4s | 100 /0.6s |
| [n3vdmu1r3e](https://pagespeed.web.dev/analysis/https-kvapunaikinimas-lt/n3vdmu1r3e?form_factor=mobile) | 95 /2.5s | 100 /0.6s |
| Median | 97 /2.4s | 100 /0.6s |

Accessibility, best practices and technical SEO score100 in all six profiles. Mobile FCP0.9s, TBT0–50ms, CLS0–0.002; desktop FCP0.3s, TBT10–40ms, CLS0. Mobile SI2.4–4.1s and desktop SI0.9–1.2s show why one best run is insufficient. Scores range95–100 /99–100.

Minor framework unused/legacy-JS diagnostics and a1KiB cache opportunity remain; one run reports14KiB image opportunity while another passes it. These are not zero-byte guarantees. Further animation removal, visible font/image degradation or a framework rewrite was not used to chase a perfect score. SEO100 does not certify rankings or AI citations; speed profiles cover the homepage, while all12 routes have separate technical and responsive qualification. Physical Safari/Android and new field data are not claimed.

## Retained failures and rollback

The evidence directory retains the moved-helper VM harness failure (fixed by executing the real helper with unchanged assertions), incorrect smoke environments, a pre-switch stage probe, the stage internal-image404, production public-file cache-header failures, the ineffective Apache-header trial and the caughtV8 TypeScript callback error. V9 was rebuilt and requalified. A mislabeled second-run desktop text file is retained separately; final metrics validate the actual emulated profile before parsing. Native AX root-scroll limitations were corrected through an observed screenshot and actual scroll.

For an application rollback retain the pre-repair source b4a9ebf55294ce17e96db88ec02a8d89f7e19670, build01a1910f-9931-7031-8d5a-e0ea3331720e and original v4 archive under D:/Core/output/kvapunaikinimas-hostinger-20261031. Do not restore a whole database for these delivery-only changes. The09:14 provider snapshot belongs to the earlier WordPress cutover, not a fresh Node database backup.

Raw evidence: D:/Core/output/kvapunaikinimas-performance-20261031. Canonical upgrade records9de30e98-268c-4deb-9178-87c6dbe6c676 and a9ad637d-7354-4047-95bb-a4e9322f1d3c track companion source separately from private documentation and live adoption.
