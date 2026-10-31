# o3tech PageSpeed and sitemap acceptance · 2026-10-31

Owner reported product80 and catalogue warnings. Actual live mobile Lighthouse
reports, not inferred local scores, identify separate performance/accessibility
issues. All reports below show no CrUX field data. Lab scores vary with execution.

| Observation | Performance | Accessibility | LCP | CLS |
| --- | --- | --- | --- | --- |
| Owner90g product,07:19 | 80 | 89 | 2.4s | 0.366 |
| Owner catalogue,07:40 | 100 | 89 | 1.7s | 0.008 |
| Post-fix90g product,07:53 | 99 | 100 | 2.3s | 0 |
| Final90g product repeat,07:58 | 97 | 100 | 2.4s | 0 |
| Final catalogue,07:58 | 99 | 100 | 2.3s | 0.000 displayed |
| Post-fix homepage,07:53 | 100 | 100 | 0.9s | 0 |

Best Practices and SEO are100 for each new report; Agentic Browsing3/3.
The final product repeat has TBT30ms and Speed Index3.0s, versus0ms/0.9s in the
earlier99 run. Do not cherry-pick the highest score or call this field-CWV proof.

## Findings and implemented scope

- Image-only card anchors had no accessible name; decorative image alt remained
  empty. Add escaped existing product titles to their anchors, and distinguish
  each quick-view action using that same title.
- White small button text on #43a7c5 measured2.773:1; category #777 on white
  measured4.478:1. Reuse brand dark teal #276d72 for actions and #666 for small
  category text; darken hover accordingly. No palette redesign.
- The80 report attributes0.363 CLS to the shifted product summary. That is the
  affected node, not a proven root trigger. The original main image already had
  width/height, eager loading and high priority. Reserve gallery/thumbnail
  geometry explicitly and preload the existing regular Open Sans subsets. Two
  subsequent product runs show0 CLS; the original intermittent trigger was not
  independently isolated in a DevTools trace.
- A fresh catalogue report exposed a lazy LCP card. Only the first projected,
  visible product card now uses eager/high priority; remaining cards and related
  products stay lazy. The final report no longer flags LCP request discovery.

Final catalogue still lists render-blocking CSS (estimated440ms) and unused
initial-load JavaScript (estimated61KiB). These are optimization opportunities,
not failed accessibility checks; full framework removal is not justified by
initial-load coverage alone. A tiny shift diagnostic rounds to0.000, including
logo/category text; no claim of mathematically zero movement. Homepage still has
an image-delivery opportunity (estimated417KiB), including the owner-selected
unchanged heroPNG. Its original pixels/SHA remain preserved.

## Reproducible sources and checks

- [Owner product80](https://pagespeed.web.dev/analysis/https-o3tech-lt-produktas-pramoninis-ozonatorius-90g-h/yr99n5zu2a?form_factor=mobile)
- [Owner catalogue100/89](https://pagespeed.web.dev/analysis/https-o3tech-lt-prekes/t6glz44uiq?form_factor=mobile)
- [Post-fix product99/100](https://pagespeed.web.dev/analysis/https-o3tech-lt-produktas-pramoninis-ozonatorius-90g-h/fp3ev2hyke?form_factor=mobile)
- [Final product97/100](https://pagespeed.web.dev/analysis/https-o3tech-lt-produktas-pramoninis-ozonatorius-90g-h/dbpkrey6ep?form_factor=mobile)
- [Final catalogue99/100](https://pagespeed.web.dev/analysis/https-o3tech-lt-prekes/13raq85op7?form_factor=mobile)
- [Homepage100/100](https://pagespeed.web.dev/analysis/https-o3tech-lt/bmwi9t7edh?form_factor=mobile)

Mobile emulation: Moto G Power, Slow4G, Lighthouse13.6.0, Chromium153.0.8010.36,
single initial page sessions. Official PSI API returned429 shared-project quota;
the report UI supplied actual public measurements without paid API calls.

312 full PUBLIC tests,9 scoped renderer tests, TypeScript and complete scoped
native build pass. Live SEO smoke covers21 pages, robots/sitemap/LLM/schema/host
isolation and404. A focused regression ensures eager priority cannot spread to
all cards or below-fold related products. Package import uses the maintained
release/compiler; no approval or revision hashes were rewritten.

Current sitemap:4business/service/information pages,11products,5categories,
1cookie policy.7old/removed addresses return404 and are absent. The11 products'
current supply/prices are owner-unconfirmed;3M accessories and the single-product
automotive category warrant a business decision, not automatic deletion. The
interactive inventory is private response content, not another public website.
Search Console accepted resubmission; its displayed23 discovered URLs reflect
the previous read and must not be reported as21 already processed or indexed.

Final Worker `c488b6b6-7191-4cb4-803d-827b17a0a676`;21-page release SHA and current
mail limits are recorded in NATIVE_CLOUDFLARE.md. Private raw DOM/screenshots,
build/deploy/test logs and immutable pre-cleanup snapshots live under
`private/catalogue-cleanup-20261031/` and `private/sitemap-review-20261031/`.
