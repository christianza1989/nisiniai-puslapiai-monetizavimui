# o3tech PageSpeed and sitemap acceptance · 2026-10-31

Owner reported product80 and catalogue warnings. Actual live mobile Lighthouse
reports, not inferred local scores, identify separate performance/accessibility
issues. All reports below show no CrUX field data. Lab scores vary with execution.

| Observation | Performance | Accessibility | LCP | CLS |
| --- | --- | --- | --- | --- |
| Owner90g product,07:19 | 80 | 89 | 2.4s | 0.366 |
| Owner catalogue,07:40 | 100 | 89 | 1.7s | 0.008 |
| Post-fix90g product,07:53 | 99 | 100 | 2.3s | 0 |
| Product gallery-repair repeat,07:58 | 97 | 100 | 2.4s | 0 |
| Catalogue priority-repair checkpoint,07:58 | 99 | 100 | 2.3s | 0.000 displayed |
| Post-fix homepage,07:53 | 100 | 100 | 0.9s | 0 |
| Final catalogue mobile,08:13 | 98 | 100 | 2.4s | 0 |
| Final catalogue desktop,08:13 | 100 | 100 | 0.5s | 0 |
| Final industrial category mobile,08:13 | 98 | 100 | 2.4s | 0 |
| Final industrial category desktop,08:13 | 100 | 100 | 0.5s | 0 |

Best Practices and SEO are100 for each new report; Agentic Browsing3/3.
The07:58 product repeat has TBT30ms and Speed Index3.0s, versus0ms/0.9s in the
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

The07:58 catalogue checkpoint lists render-blocking CSS (estimated440ms) and unused
initial-load JavaScript (estimated61KiB). These are optimization opportunities,
not failed accessibility checks; full framework removal is not justified by
initial-load coverage alone. A tiny shift diagnostic rounds to0.000, including
logo/category text; no claim of mathematically zero movement. Homepage still has
an image-delivery opportunity (estimated417KiB), including the owner-selected
unchanged heroPNG. Its original pixels/SHA remain preserved.

## Desktop/category state follow-up

The07:58 desktop catalogue report scored100performance/91accessibility: active
Prekės was still too light; an anchor nested in summary overlapped its disclosure
control, and two overlaid range inputs failed target-size checks. The industrial
category mobile report scored99/95 because its active footer link remained light.
These concrete states warranted another coordinated repair.

Active/hover links now use the same dark teal action token. Native disclosure has
no interactive descendant; the catalogue overview is a real link inside its
dropdown. Two native sliders are separate labelled rows with24px control height,
44px on coarse pointers. Original hover scaling and menu pointer behavior remain.
Existing labels were reused, not new public prose. Focused regression checks the
non-nested disclosure and visible labels. Actual1280px production and320px draft
keyboard tests increment minimum30→31, update its output, open the menu and show
non-overlapping controls/no horizontal overflow. No new real form/mail submission.

Final08:13 mobile and desktop reports below both have100accessibility and3/3agentic:

- [Final catalogue mobile98/100](https://pagespeed.web.dev/analysis/https-o3tech-lt-prekes/5u32k9uleq?form_factor=mobile)
- [Final catalogue desktop100/100](https://pagespeed.web.dev/analysis/https-o3tech-lt-prekes/5u32k9uleq?form_factor=desktop)
- [Final industrial category mobile98/100](https://pagespeed.web.dev/analysis/https-o3tech-lt-produkto-kategorija-pramoniniai-ozonatoriai/di3gw9zebv?form_factor=mobile)
- [Final industrial category desktop100/100](https://pagespeed.web.dev/analysis/https-o3tech-lt-produkto-kategorija-pramoniniai-ozonatoriai/di3gw9zebv?form_factor=desktop)

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

313 full PUBLIC tests,10 scoped renderer tests, TypeScript and complete scoped
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

Final Worker `815eba1c-4c86-4bb4-90b8-9e996c005fb1`;21-page release SHA and current
mail limits are recorded in NATIVE_CLOUDFLARE.md. Private raw DOM/screenshots,
build/deploy/test logs and immutable pre-cleanup snapshots live under
`private/catalogue-cleanup-20261031/` and `private/sitemap-review-20261031/`.
