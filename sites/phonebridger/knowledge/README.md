# PhoneBridger knowledge extension — 6 October 2026

Four task guides, a hub and an editorial responsibility page extend the selected English website. This directory holds editable content/layout, a Studio-reviewed shadow package and image provenance. The website remains a private prepared preview; this work does not publish a domain, open paid orders, enable hosted accounts or change the native app.

| New route | Reader question |
| --- | --- |
| `/guides/` | Which setup answer should I start with? |
| `/guides/getting-started/` | How do I install, grant control and approve my PC? |
| `/guides/usb-wifi/` | How do initial pairing, USB preference and Wi-Fi fallback work? |
| `/guides/android-permissions/` | Which access enables which feature, and when should I stop? |
| `/guides/phone-position/` | How do physical placement and transition zones relate? |
| `/editorial/` | Who prepares the guidance and how are claims checked? |

## Sources and architecture

`content.mjs` owns authored guide copy and external-source reasons. `prepare.mjs` uses shared Studio site/page CRUD, exact-revision editorial approval and package export. It imports four actual original PNGs through `saveResponsiveAsset`, yielding five WebP variants each. `image-ledger.json` records source and derivative hashes; [PROMPTS.md](PROMPTS.md) records generation provenance. Originals/prompts are private source material; exported visitor copy contains factual captions and scope rather than internal tooling records.

`render.mjs` uses the existing inner-page header/footer/icon helpers and the shared core publication projection, contextual-link formatter, locale-aware SEO, schema/breadcrumb/date and responsive-media functions. Its scope is this site's reading layout, not a separate SEO engine or publication predicate. The eligible preparation contains 14 pages: homepage, seven existing information/commercial pages and these six new routes. Login, register, account and recovery are excluded from the package/indexes.

The current beta prefers authorized physical USB automatically and falls back to reachable saved Wi-Fi pairing. Instructions retain first pairing over Wi-Fi, one physical USB debugging phone at a time, up to three configured positions, Android audio limits and planned native file dragging. The frozen input engine, release bundles, pairing/configuration and USB/Wi-Fi shared API are unchanged.

## Build the authorized source preview

Run from the network project, with its sibling `dovanos-memorycasting` core checkout available. The renderer also requires the existing owner's source helpers at `PhoneBridger/design/source/site-pages-v1/build.cjs`; this generator is not a standalone portable site builder.

```powershell
Set-Location 'C:/Users/Lenovo/Documents/phonebridger-core-integration-20261005/nisiniai_puslapiai_monetizavimui'
$guideRuntime = 'C:/Users/Lenovo/Documents/PhoneBridger/design/website/homepage'
node sites/phonebridger/knowledge/prepare.mjs $guideRuntime
node sites/phonebridger/knowledge/render.mjs $guideRuntime
# With the existing private source server running on 127.0.0.1:4177:
node sites/phonebridger/knowledge/verify.mjs $guideRuntime
```

Open the source preview at `http://127.0.0.1:4177/design/website/homepage/guides/`. The verifier expects that existing server and the saved source freeze records. It is not a server launcher. Preparation uses an isolated temporary Studio store by default; `PHONEBRIDGER_GUIDE_STUDIO` can select another private isolated directory. Never point it at unrelated operational Studio data.

For the shared core's **shadow** importer, run from the sibling core checkout:

```powershell
Set-Location 'C:/Users/Lenovo/Documents/phonebridger-core-integration-20261005/dovanos-memorycasting'
node scripts/import-content-package.mjs 'C:/Users/Lenovo/Documents/phonebridger-core-integration-20261005/nisiniai_puslapiai_monetizavimui/sites/phonebridger/knowledge/package' --shadow --replace
```

This exact import route has been exercised. It targets `content-staging/phonebridger`, not active `content-packages`. Preparation is idempotent for unchanged records/assets and preserves package generation time when content is unchanged. Inspect changes before replacing a shadow package. A content change must pass Studio revision review again; never handwrite approval hashes.

## Publication boundary

`projection.json` records `publicAdmission:false` and the eligible reviewed revisions. The prepared `publishAt` and editorial review are not evidence that any page was publicly available on that date. New rendered pages contain noindex/nofollow/noarchive; the private preview uses an HTTP noindex boundary and disallow-all robots. Canonicals and prepared sitemap/LLM URLs can describe the intended domain without proving control, hosting or launch.

Public admission still requires the actual shared package/host process, true first-publication dates, verified domain/hosting/contact delivery and the relevant operator/legal/service integrations. Keep source packages, originals, approvals, QA and account stores outside served/public artifacts. Account recovery, payment, licence enforcement, fulfilment and creator work retain their existing future-integration boundaries.

## Evidence and finish state

[verification.json](../qa/knowledge-v1/verification.json) records PASS for 14 prepared pages, four guides, 286 local link checks, 20 served responsive variants, rejected unreviewed mutation, hidden future/revoked links, private URL rejection, account exclusions, 472 saved freeze entries and unchanged homepage content outside its footer. These are local/source-preview results.

The initial [finish review](../qa/knowledge-v1/finish-review.md) returned `fix` after reviewing the 16 supplied full-page captures. It found the 768px hub's empty featured column/narrow crops and repeated uppercase category labels. Current source implements a tablet 2×2 vertical-card grid, removes the labels and underlines inline prose links. Four recaptures scored ship for those bounded fixes; the final guide browser checks also verify visible, underlined contextual links. Local Lighthouse13.5.0 mobile measured hub96/100performance/accessibility and permissions96/100 (previous run97/100). The frozen homepage measured62/96 and exposes an existing script exception/ARIA issues; this is a recorded failure, not whole-site acceptance. Initial browser and Lighthouse files remain evidence of their own run, not certification of the repaired final edition.

The linked shared-core extension also recorded fixed-clock byte equality across 45 SEO outputs from the nine pre-existing packages. That regression evidence concerns existing core behavior; it does not prove PhoneBridger production publication or search performance.

See [DESIGN.md](DESIGN.md) for the guide-specific direction, responsive constraints and quality bar, [RESEARCH.md](RESEARCH.md) for sourced claims, and the parent site's existing product/design records for inherited boundaries.

Whole-site readiness: [A–Z audit](../PHASE-1-AUDIT.md). Prepared guides do not close domain, durable inquiry, mail receipt, measurement, legal or hosted-account gates.
