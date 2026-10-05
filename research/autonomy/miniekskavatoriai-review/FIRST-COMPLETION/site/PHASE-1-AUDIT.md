# miniekskavatoriai.lt · pirmos fazės A–Z auditas

Vertinta 2026-10-01T13:14:39.593Z. AI agent site-specific A–Z evidence audit; separate fresh Impeccable reviewer for visual craft; no human/legal/engineering certification.

Veikiantis vietinis pilotas:12 patvirtintų puslapių,3 gidai, realus V=L×W×D įrankis ir taisomas poreikio ruošinys, vietinė D1 forma. Tai nėra local-ready ar domain-ready pagal visus vartus. SMTP/voiceoff; tikras domenas nepaleistas.

Analizės įvestis ir SHA – [svetainės žurnale](../miniekskavatoriai.md). Analysis-assisted darbas, ne nepaveiktas cold-start.

## Atskiros būsenos ir balai

| Etapas | PASS / taikomi | Balas /10 | gateReady | Neuždaryti vartai |
| --- | --- | ---: | --- | --- |
| local | 67/71 | 9.43 | false | R2, S2, U2, U3 |
| launch | 0/10 | 0 | false | B3, I4, O3, U4, W3, X3, Z3 |
| operations | 0/2 | 0 | false | A3, V3 |

Craft atskirai: **12/14 = 8,57/10**, šviežio vertintojo subjektyvus įvertis. ≥9 tikslas nepasiektas. Dizaino tapatybė ir naudingi mechanizmai išskirtiniai, bet gidų ritmas bei pirmo mobile ekrano rezultato vieta silpnesni. [FINISH-REVIEW](FINISH-REVIEW.md) ir jo fixes-only verdict nusako tikrą peržiūros apimtį.

Galutinis mobilus Lighthouse: home96, kainos sudėties gidas91, įrankis95; accessibility/best-practices/SEO100 visose trijose ataskaitose. LCP2,5/3,1/2,5s; tai vietinis lab, ne field CWV ar WCAG atitiktis. [Visas matavimas](qa/performance-summary.json).

Demand:0 patvirtintų realių užklausų; testai/skaitymai/mail clicks nėra paklausa. Launch nėra autorizuotas/atliktas.

## Baseline ir taisymai

- Initial audit scaffold85/85UNVERIFIED; this manual record is independent of other niche audits.
- Initial source lacked some final source/context/cluster wiring; corrected through studio revision approval/export. Twelve final pages tested.
- Base/default link contrast and subsequent CTA inherited text were detected in actual render; scoped selectors corrected, final CTAwhite/dark confirmed.
- One detector pass:2px pilot side-border corrected to1px; rounded-border flag documented as falsepositive on square controls. No second detector.
- Legacy reserved-path assertion expected404; actual403 accepted as recorded no-restore result. Test expectation corrected, no runtime/redirect patch.
- Fresh review14 captures valid; original seed evidence recovered and common capture warmcast investigated. Fix verdict recorded by same reviewer, no new implementation batch.

## Likusios išvados

- **P1 UNVERIFIED (R2, S2)**: Actual200% browser enlargement not established; narrow widths and score100 do not substitute.
- **P1 UNVERIFIED (U2, U3)**: SMTP intentionallyoff; no new niche SMTP/Message-ID INBOX receipt.
- **P1 UNVERIFIED (B3, I4, O3, U4, W3, X3, Z3)**: Actual domain/identity/production legal and operational launch not authorized or proved.
- **P2 TARGET NOT MET (E1, E2)**: Fresh subjective craft12/14=8.57; guide rhythm/mobile feedback compromises remain. No benchmark or whole-surface perfection claim.
- **P2 DOCUMENTED (E2)**: Topic asset generation preceded final study screenshot comparison. Formal quality bar consolidated at finish. Original seed recovered unchanged, no reroll.
- **P2 DOCUMENTED (E2)**: CUA screenshots share a warm cast; actual DOM/CSS and raw Lighthouse colors match palette. Exact capture/environment cause unknown; no raster/CSS color compensation.

## A–Z kriterijai

PASS įrodymai yra konkrečios šios svetainės peržiūros/bandymai. UNVERIFIED ir FAIL prisideda0 prie balo; NA turi produkto apimties priežastį. Negalima vietiniu balu kompensuoti launch vartų.

### A · 2/3, 6.66/10

- [x] **A1 PASS** · local / gate · Phase 1 is explicit; inquiry is not an order, reservation or proven demand.
  Įrodymai: BUSINESS.md: first-phase prerequest, no order/booking promise; qa/trust-pages.json: /su-operatoriumi, /apie-projekta visible boundaries. Local pilot; no measured demand claim.
- [x] **A2 PASS** · local / gate · The primary action and visible offer are genuinely available and test the chosen concrete business outcome with a documented payer/revenue hypothesis; editorial interest does not substitute for product/service intent. No fake commerce, stock or supplier claim; prelaunch availability is disclosed.
  Įrodymai: BUSINESS.md: M1 accepted-qualified-lead payer hypothesis; alternatives, contradiction and unconfirmed fulfillment; qa/tool-interaction.json; qa/browser-form-result.json; qa/browser-d1-proof.json: real editable worksheet and synthetic native submission/storage. Action tests planned trench work in Kaunas region. No stock, fleet, price, executor, offer or appointment invented; production collection remains closed.
- [ ] **A3 UNVERIFIED** · operations / gate · Expansion decision uses qualified real inquiries/value/capacity, not clicks or test records.
  Įrodymai: BUSINESS.md: six-week proposed decision policy. No real qualified requests, accepted paid leads or measured contribution. No expansion decision made.

### B · 2/3, 6.66/10

- [x] **B1 PASS** · local / gate · Operator/contact defaults and site exceptions agree across package, visible copy, schema and form recipient.
  Įrodymai: ../miniekskavatoriai.md: confirmed MB Pinet / info@pinet.lt; qa/html-final.json; qa/trust-pages.json: same visible contacts and Organization identity; public core config/niche-network.json: default recipient info@pinet.lt, no niche override. Recipient configuration inspected; mail receipt itself is not asserted (U2/U3).
- [x] **B2 PASS** · local / gate · No borrowed phones, addresses, identities, credentials, reviews or certifications.
  Įrodymai: EDITORIAL-REVIEW.json: all12 local page claim scopes; qa/trust-pages.json: no fleet, phone, business-ID, address, operator experience or testimonials. No other niche business details copied.
- [ ] **B3 UNVERIFIED** · launch / gate · Actual operator identity, applicable legal identifiers/address and domain control are established.
  Įrodymai: ../miniekskavatoriai.md: identity facts and unknowns. Legal identifiers/address and actual domain control not established by this local task.

### C · 2/2, 10/10

- [x] **C1 PASS** · local / gate · Bounded history evidence, retrieval limits and unavailable periods are recorded.
  Įrodymai: history/audit.json; history/REPORT.md: bounded4 readable snapshots,2 URLs, periods and retrieval limits; history/ASSESSMENT.md: current agent assessment. Successful snapshots do not establish ownership/continuity or full archive coverage.
- [x] **C2 PASS** · local / gate · Reviewed URL decisions distinguish same-intent restore/redirect from defer/404; no mass homepage redirects.
  Įrodymai: history/url-decisions.json: root keep for new current intent, utility no restore; qa/publication-isolation.json: legacy utility403, no restored content/redirect. Cloudflare reserved utility path returns403, rather than planned404; actual result recorded. No mass home redirects.
- [ ] **C3 NA** · launch / review · Any implemented legacy redirect has a current same-host approved 200 target, no loop and a tested status.
  Įrodymai: history/url-decisions.json: no legacy redirect implemented. No implemented legacy redirect exists to validate. Root new content is not a redirect.

### D · 3/3, 10/10

- [x] **D1 PASS** · local / review · Local/international comparisons and real desktop/mobile evidence support the chosen journey; adopted design decisions identify the actual final URL and useful screenshot region, with blocked/blank/overlaid evidence limitations recorded.
  Įrodymai: RESEARCH.md; DESIGN.md: LT/foreign original pages, URL-specific adopted/deferred/rejected decisions; research/technikos-*.jpg; avesco-*.jpg; avesco-detail-*.jpg; dozr-*.jpg; hh-*.jpg; paslaugos-*-list.jpg; ramirent-*.jpg. Actual desktop/mobile. Paslaugos final list unobstructed; Ramirent cookie overlay restricts that evidence; Bobcat retrieval failed and supplies no facts.
- [x] **D2 PASS** · local / gate · Current facts and permissions support original copy/assets; old or competitor claims are not our facts.
  Įrodymai: BUSINESS.md: no competitor rates or historical business facts borrowed; EDITORIAL-REVIEW.json; MEDIA.json: original contribution and illustrative assets; qa/trust-pages.json: no imaginary expertise/fulfillment. Original supplier source facts remain qualified, not our commercial capacity.
- [x] **D3 PASS** · local / review · Search intents and niche advantages are hypotheses where no search/conversion data exists.
  Įrodymai: BUSINESS.md: search/intent and unit-economic unknowns; CONTENT-CALENDAR.md; ACQUISITION.md: seasonal/SEO hypotheses. No search volume, rank, customer count or profit invented.

### E · 3/3, 10/10

- [x] **E1 PASS** · local / review · Full homepage, index and guide have a coherent niche-specific identity, rhythm and meaningful imagery; for a new identity, actual nearest-network comparison demonstrates substantive differences beyond noun, palette, font or photo-subject substitutions.
  Įrodymai: FINISH-REVIEW.md: fresh review of14 home/index/guide/tool/contact captures and nearest-network samples; qa/home-{desktop,mobile}-final.jpg; qa/gidai-*-final.jpg; qa/*-ar-be-*-final.jpg; qa/pravaziavimo-plotis-*-final.jpg; qa/nuomos-kainos-sudetis-*-final.jpg. Coherent field worksheet, actual tools/prism/access and vertical guide rows. Scoped craft8.57/10; guide rhythm/mobile first feedback weaker, not ≥9 target achieved.
- [x] **E2 PASS** · local / review · DESIGN describes actual tokens, composition, brand/section/asset plan, useful-tool decision and compromises; technical scores are separate from visual judgment.
  Įrodymai: DESIGN.md; .impeccable/design.json; QUALITY-BAR.md: actual tokens, plan, code-led choice, compromises; qa/PALETTE-VERIFICATION.md; qa/palette-runtime.json; research/concept-seed-original.txt; research/concept-seed-provenance.json. Fresh documenter reconciled actual colors/type/layout and image-free tool/purpose pages to the original plan. Captured warm cast distinguished from CSS/DOM and raw Lighthouse. Study/image timing deviation and late quality-card consolidation disclosed. Technical scores separate.
- [x] **E3 PASS** · local / gate · Image origin/rights are documented and presentation is truthful; no imaginary stock, client project, distorted teaching diagram or unwanted generator badge.
  Įrodymai: MEDIA.json; assets/*.prompt.txt; assets/*.png: private exact origin; qa/browser-layout-final.json: real loaded WebP images; qa/trust-pages.json: /redakcija truthful AI illustration method. No public generator badge, borrowed machinery ownership, fake client work or stock claim. SVG is exact geometric formula diagram, not a safety profile.

### F · 3/3, 10/10

- [x] **F1 PASS** · local / gate · All public pages are reachable through useful navigation/context; no orphan initial guide.
  Įrodymai: qa/html-final.json:12 pages and40 actual target requests,0 findings; qa/gidai-*-final.jpg; qa/trust-pages.json: all initial routes reachable. Three guides through home/index/context; trust routes via footer, inquiry via nav/action.
- [x] **F2 PASS** · local / gate · Desktop/mobile header, index, footer and local inquiry actions work with actual destinations.
  Įrodymai: qa/browser-layout-final.json; qa/keyboard-menu.json: desktop/mobile destinations and native menu; qa/browser-form-result.json: real native submission destination. No placeholder navigation or dead CTA found.
- [x] **F3 PASS** · local / review · Each URL has a distinct job; no doorway city/synonym variants, duplicate intent or pointless index.
  Įrodymai: EDITORIAL-REVIEW.json: unique originalContribution per URL; CONTENT-CALENDAR.json: distinct future intents kept private. No city/synonym doorway pages; index helps choose the question.

### G · 3/3, 10/10

- [x] **G1 PASS** · local / gate · First screen identifies the topic, useful offer and honest next action.
  Įrodymai: qa/home-desktop-final.jpg; qa/home-mobile-final.jpg. Trench planning, three dimensions, region/partner limits and actual next action visible. Mobile result below first viewport is a recorded compromise.
- [x] **G2 PASS** · local / review · Middle/end answer new questions rather than repeating promotions or decorative cards.
  Įrodymai: qa/home-desktop-final.jpg; qa/home-mobile-final.jpg; DESIGN.md. Middle distinguishes geometry, scope, access, networks and three guide questions, then explicit prerequest close.
- [x] **G3 PASS** · local / gate · Primary/secondary actions, privacy route, empty/error/success states have real behavior.
  Įrodymai: qa/tool-interaction.json: empty/invalid/valid values, prepared text not automatically sent; qa/browser-form-result.json; qa/local-form-interest.json: native required fields, honest success and503 failure; qa/trust-pages.json: privacy linked. Real behavior, including alternate email path on failure; SMTP remains off.

### H · 5/5, 10/10

- [x] **H1 PASS** · local / gate · At least three distinct prepared guides are individually read and useful for the site's intent; no word-count substitute.
  Įrodymai: EDITORIAL-REVIEW.json: individual operator/access/price guide review and contributions; qa/html-final.json: three full Article pages rendered; source text individually read. Guide usefulness judged from complete text and checklists, not minimum word count.
- [x] **H2 PASS** · local / gate · Claims, terminology, examples, limitations and sources are checked; unsafe universal technical advice is absent.
  Įrodymai: EDITORIAL-REVIEW.json; RESEARCH.md: each guide source/claim review; qa/html-final.json: visible source lists and limits. No universal width/depth, safe digging, guaranteed price/time or operator credential claim. ESO original procedural limitations checked.
- [x] **H3 PASS** · local / review · Each guide gives a usable explanation/example/checklist, readable structure and next step without filler.
  Įrodymai: EDITORIAL-REVIEW.json: operator responsibilities, narrowest access checklist, total quote-comparison questions; qa/*-ar-be-*-final.jpg; qa/pravaziavimo-plotis-*-final.jpg; qa/nuomos-kainos-sudetis-*-final.jpg. Concrete decisions and next routes; no nominal word-count filler.
- [x] **H4 PASS** · local / gate · Long article, lists, figures and source sections are actually rendered and mobile-tested, not silently discarded.
  Įrodymai: qa/html-final.json: actual full guide article/lists/sources,577+ visible words on operator route; qa/browser-layout-final.json; qa/narrow-tablet.json: mobile/320/tablet rendering. No body quietly dropped by renderer. Long captures downsampled; source and DOM supplement visual review.
- [x] **H5 PASS** · local / gate · Each initial guide has an inspected topic-specific image; homepage/index and other pages have purposeful visual coverage, actual files and responsive crops, or a documented text-focused reason where imagery adds no value.
  Įrodymai: MEDIA.json:4 original families and20 shared responsive WebP variants; qa/browser-layout-final.json: all home/index/guide images loaded; FINISH-REVIEW.md: each guide image present and suitable. Contact/trust/legal and workflow pages use text/native controls instead of decorative photography; information/privacy/action is their task. Three guides, home panorama/access and index thumbnails have meaningful imagery.

### I · 3/4, 7.5/10

- [x] **I1 PASS** · local / gate · Visible attribution identifies a real Person or Organization with a public profile or clear identity.
  Įrodymai: qa/html-final.json: Article author MB Pinet linked to eligible public /redakcija; qa/trust-pages.json: /redakcija identifies responsibility and corrections contact. Organization, not fictional Person.
- [x] **I2 PASS** · local / gate · Author/profile/schema identity agrees; no fictional expert or unverified experience.
  Įrodymai: qa/html-final.json: Organization/Article author/schema IDs; qa/trust-pages.json: no qualifications invented. Attribution consistent; AI review not a qualified human approval.
- [x] **I3 PASS** · local / gate · Visible publication/review dates and structured dates have the same meaning; dates are not refreshed per request.
  Įrodymai: qa/html-final.json: fixed visible publication/review and Article dates; qa/trust-pages.json: /redakcija explains local planned-publication meaning. Dates do not refresh on requests. Package date is not evidence of a public launch.
- [ ] **I4 UNVERIFIED** · launch / gate · Initial production publication/deployment date is documented; planned dates are not evidence of past public availability.
  Įrodymai: qa/trust-pages.json: local version explicitly not public deployment. No production deployment/first public availability occurred.

### J · 3/3, 10/10

- [x] **J1 PASS** · local / gate · About/editorial information explains purpose, AI role, source method, limitations and corrections contact.
  Įrodymai: qa/trust-pages.json: full /apie-projekta and /redakcija texts. Purpose, responsible operator, AI role, source method, limitations and corrections contact explicit.
- [x] **J2 PASS** · local / review · Review is attributed honestly to the agent/process; no claim of human/qualified approval without it.
  Įrodymai: EDITORIAL-REVIEW.json: AI agent review actor; qa/trust-pages.json: qualified approval not claimed. No owner, engineer or construction specialist signoff inferred.
- [x] **J3 PASS** · local / gate · Factual corrections propagate through studio approval and public/LLM projections; review evidence is retained.
  Įrodymai: fix-reviewed-content.mjs: targeted corrections through studio edit/approval/export; qa/publication-isolation.json: altered approved body rejected; hash/revocation negative tests; qa/html-final.json: final approved text projected. Includes tool position sentence and home ESO source correction; no direct post-approval public content edit.

### K · 3/3, 10/10

- [x] **K1 PASS** · local / gate · Every public URL has one useful H1, title, description, correct language and canonical.
  Įrodymai: qa/html-final.json: all12 routes, one H1,title,description,lt, canonical;0 findings. Final production worker, not static mock.
- [x] **K2 PASS** · local / review · Heading order, informative alt, sharing metadata and social image (when used) match actual content; new-site wordmark/mark and actual favicon belong to the active niche rather than an inherited unrelated brand.
  Įrodymai: qa/html-final.json; qa/browser-layout-final.json: heading/alt/share metadata matches; qa/trust-pages.json: own data-SVG icon and own wordmark; renderer niche head override. Own trench mark. Core base icon also exists in head; niche override is present, no borrowed visible wordmark.
- [x] **K3 PASS** · local / gate · Unknown/future/private URLs return proper 404/noindex and do not canonicalize to the homepage.
  Įrodymai: qa/publication-isolation.json: future/private unknown404; qa/html-final.json; qa/execution-proof.json: negative URLs,no homepage canonical. Reserved Cloudflare utility403 is excluded from page URL claim.

### L · 3/4, 7.5/10

- [x] **L1 PASS** · local / gate · JSON-LD parses and uses truthful appropriate WebSite/WebPage/Organization/Article entities and stable IDs.
  Įrodymai: qa/html-final.json: parsed Organization/WebSite/WebPage/Article appropriate types; qa/execution-proof.json: own SEO smoke. Tool/inquiry remain WebPage; three editorial guides Article.
- [x] **L2 PASS** · local / gate · Visible breadcrumb and schema path/name/URL agree; profile and author relations point to eligible public pages.
  Įrodymai: qa/html-final.json: BreadcrumbList names/path/URLs and author public target checked. ArticleMeta uses shared visible byline/date, not hidden identity.
- [x] **L3 PASS** · local / gate · No invented Offer/Product/Review/AggregateRating/LocalBusiness or unsupported rich-result promise.
  Įrodymai: qa/html-final.json; EDITORIAL-REVIEW.json. No Product/Offer/Review/AggregateRating/LocalBusiness or rich-result guarantee.
- [ ] **L4 UNVERIFIED** · launch / review · Official rich-result/URL Inspection findings are recorded after actual crawlable deployment; local checks are labelled local.
  Įrodymai: qa/html-final.json: local schema evidence only. No crawlable production site, Search Console verification or official rich-result inspection.

### M · 3/3, 10/10

- [x] **M1 PASS** · local / gate · Contextual links use real same-site target IDs and informative anchors; fragments exist.
  Įrodymai: qa/html-final.json:40 target requests, fragment destinations checked; qa/publication-isolation.json: real target-ID projection. Context links help operator/access/quote/tool questions.
- [x] **M2 PASS** · local / gate · Future/unapproved/revoked targets disappear consistently from prose, related sections, indexes and schema.
  Įrodymai: qa/publication-isolation.json: actual future/revoked/hash projection removes guide and incoming links; qa/execution-proof.json: core publication negative tests24/24. Incoming links withheld consistently; fixture manipulations not published.
- [x] **M3 PASS** · local / review · Cluster/pillar/related routes help distinct questions; repetition/all-to-all links are not treated as authority.
  Įrodymai: CONTENT-CALENDAR.json; fix-reviewed-content.mjs: own pillar/related IDs; qa/html-final.json: actual related and contextual links. No all-to-all network link scaffold.

### N · 2/3, 6.66/10

- [x] **N1 PASS** · local / gate · Sources have relevant primary evidence, actual target checks and retrieval dates; no partner implication.
  Įrodymai: RESEARCH.md; EDITORIAL-REVIEW.json: original official/supplier sources, reviewed2026-10-01; research/avesco-detail-*.jpg; hh-*.jpg; technikos-*.jpg; qa/html-final.json: visible source panels. Supplier mention supplies comparison evidence, not partnership. Failed Bobcat source excluded.
- [ ] **N2 NA** · local / gate · Owned editorial links obey target ID, host, approval/date/deployment eligibility and disclosed relevant reason.
  Įrodymai: qa/html-final.json; own approved content-package.json: no owned editorial cross-domain link. No editorial owned-domain link included. Mandatory footer attribution is assessed separately under N4, not a fake target-ID article relation.
- [x] **N3 PASS** · local / gate · Prose links and source/related panels render correctly; sponsored/UGC relation is applied only if applicable.
  Įrodymai: qa/html-final.json: contextual prose/source/related links render; qa/*-guide screenshots; qa/trust-pages.json. No paid/sponsored/UGC arrangement; no invented rel sponsor.
- [ ] **N4 UNVERIFIED** · launch / review · Brand/attribution and other external destinations work on the live launch; pending network domains stay unpublished.
  Įrodymai: qa/home-desktop-final.jpg: required verslomatika attribution; networkLiveDomains remains empty. No live launch occurred; external attribution availability and actual launch destination must be checked then.

### O · 2/3, 6.66/10

- [x] **O1 PASS** · local / gate · Canonical host/path, sitemap, robots, redirects and slash/query behavior are coherent and actually tested.
  Įrodymai: qa/execution-proof.json: own and seven-domain SEO smoke; qa/html-final.json: canonical/sitemap/robots; qa/publication-isolation.json: unavailable404/crosshost404; slash308 and query canonical tested. Canonical https real domain retained even in local preview; loopback is not live-domain evidence.
- [x] **O2 PASS** · local / gate · Sitemap contains only eligible URLs and meaningful lastmod; robots does not substitute for private access control.
  Įrodymai: qa/html-final.json; qa/execution-proof.json: approved sitemap only,lastmod,robots tested. Draft access is not secured by robots alone; draft source excluded from public export.
- [ ] **O3 UNVERIFIED** · launch / gate · DNS, TLS, real host, indexing directives and domain isolation work on production.
  Įrodymai: qa/verification-summary.json: isolated local worker only. DNS/TLS/domain control/production host isolation not exercised.

### P · 3/3, 10/10

- [x] **P1 PASS** · local / gate · Same authoritative projection controls HTML, links, media, schema, sitemap and LLM output.
  Įrodymai: qa/publication-isolation.json: authoritative projection controls eligible pages/links/assets/LLM; qa/html-final.json; qa/execution-proof.json: sitemap/schema actual. No niche SEO copy fork; shared projection reused.
- [x] **P2 PASS** · local / gate · Hash/date/revocation/cross-host negative tests pass; draft preview is private and not indexed.
  Įrodymai: qa/publication-isolation.json: actual future/revoked/hash/cross-host negative cases; qa/execution-proof.json: core24/24. Private future drafts never imported; unknown-host media blocked.
- [x] **P3 PASS** · local / gate · Studio approval, import validation and compile preserve unrelated packages and reject changed approved content.
  Įrodymai: qa/publication-isolation.json: changed approval rejected; six other package counts preserved; qa/execution-proof.json: compile/import and all seven SEO smoke. Only own content/renderer and small registry/dispatch/import integration; no schema change.

### Q · 3/3, 10/10

- [x] **Q1 PASS** · local / gate · Public LLM exports match the active niche's useful facts, URLs, contacts and visible publication scope.
  Įrodymai: qa/publication-isolation.json: llmScope approved editorial facts only; qa/execution-proof.json: active niche LLM exports smoke. Same contact/URLs, no private drafts, prompts, synthetic leads or hidden business facts. Client form state is not machine-only content.
- [x] **Q2 PASS** · local / gate · Definitions, qualified answers and primary citations are accessible in semantic HTML; no hidden model-only claims.
  Įrodymai: qa/html-final.json; EDITORIAL-REVIEW.json: visible semantic qualified answers,lists,citations. Definitions and prerequisites in HTML; no hidden model-specific assertions.
- [x] **Q3 PASS** · local / review · llms.txt/AI visibility are supplementary; no special schema, traffic or ranking guarantee is asserted.
  Įrodymai: BUSINESS.md; RESEARCH.md; ../miniekskavatoriai.md. LLM index supplementary; no guaranteed rankings/AI traffic/rich-result capability.

### R · 2/3, 6.66/10

- [x] **R1 PASS** · local / gate · Keyboard, focus, skip link, labels, landmarks and details/menu interactions are exercised.
  Įrodymai: qa/keyboard-menu.json; qa/skip-link-focus.jpg: native Tab/Return skip and menu; qa/browser-form-result.json; ACCESSIBILITY-VERIFICATION.json: labelled controls,3px focus. Actual keyboard behavior, not Lighthouse alone.
- [ ] **R2 UNVERIFIED** · local / gate · Contrast, zoom/reflow, readable utility text and touch targets are checked; score alone is not WCAG conformance.
  Įrodymai: ACCESSIBILITY-VERIFICATION.json: computed contrast,touch targets,320 reflow; qa/palette-runtime.json: extra Chrome zoom attempt unchanged. 200% browser enlargement not established; native ctrl+plus had no effect in IAB or Chrome. Narrow layout/score100 cannot substitute.
- [x] **R3 PASS** · local / gate · Images, headings, disclosure state, form requirements/errors and reduced-motion behavior remain usable.
  Įrodymai: qa/tool-interaction.json: aria-invalid and recovery; qa/browser-form-result.json: required field focused with native error; qa/browser-layout-final.json; own CSS: no entrance motion/animation. Images/heading/menu disclosure and requirements usable; default visible content requires no reduced-motion workaround.

### S · 2/3, 6.66/10

- [x] **S1 PASS** · local / gate · Desktop, narrow/mobile and tablet evidence shows no overflow or hidden defects.
  Įrodymai: qa/browser-layout-final.json:1440/390 seven main routes; all loaded,no overflow; qa/trust-pages.json: five additional routes desktop/mobile; qa/narrow-tablet.json:320 main routes and768 home/guide/tool no overflow. Real browser viewports.
- [ ] **S2 UNVERIFIED** · local / gate · Article contents, byline, source lists, breadcrumb, form and footer work at narrow widths and enlarged text.
  Įrodymai: qa/narrow-tablet.json; qa/keyboard-menu.json; ACCESSIBILITY-VERIFICATION.json. Narrow content/byline/source/form/footer inspected, but actual enlarged text200% remains unproved.
- [x] **S3 PASS** · local / review · Real viewport tests are distinguished from physical device and synthesized touch testing.
  Įrodymai: ACCESSIBILITY-VERIFICATION.md; FINISH-REVIEW.md. IAB viewport and Lighthouse simulation explicitly distinguished from physical devices/touch certification.

### T · 2/3, 6.66/10

- [x] **T1 PASS** · local / gate · Production mobile lab is measured with real media and saved version/date/environment; performance target >=90 is met or remains failed.
  Įrodymai: qa/performance-summary.json; lighthouse-{home,guide,tool}.report.json/html: final mobile96/91/95, other categories100; qa/verification-summary.json: exact package/renderer hashes. Production-built isolated worker, real WebP/Manrope; Lighthouse12.8.2 mobile simulated network/CPU. All chosen pages ≥90.
- [x] **T2 PASS** · local / review · Measured LCP/CLS/TBT, image sizes, fonts, CSS and JS budgets have justified fixes; no dummy content score.
  Įrodymai: qa/performance-summary.json: LCP2.5/3.1/2.5s,TBT90/60/60ms,CLS.00974/.0274/.002,total428/253/184KiB; MEDIA.json; own CSS: shared srcset/sizes,self-hosted fonts,plain tool. Guide labLCP3.1s not portrayed as field-green. Prior material contrast/CTA correction documented; no repeat score fishing after target met.
- [ ] **T3 UNVERIFIED** · launch / review · Production field CWV/traffic evidence is monitored separately; local Lighthouse is not field performance.
  Įrodymai: qa/performance-summary.json: local lab only. No live traffic/CrUX field CWV.

### U · 1/4, 2.5/10

- [x] **U1 PASS** · local / gate · Native/server validation, origin, size limits and honest errors pass; durable D1 record survives mail/core failure.
  Įrodymai: qa/local-form-interest.json:400 invalid/size,403origin,200honeypot without insert,503storage failure; qa/browser-d1-proof.json: actual native synthetic form retained in isolated D1, exact row removed. D1 storage independent of optional mail/voice; disabled mail leaves statusnew. Live SMTP failure not freshly triggered in this task (U2/U3).
- [ ] **U2 UNVERIFIED** · local / gate · Operator notification recipient and SMTP acceptance are tested without client messages or exposed secrets.
  Įrodymai: qa/verification-summary.json: LEAD_SMTP_ENABLED=0; ../../MAIL_CORE.md:2026-09-30 shared transport evidence is context only. Task expressly keeps actual SMTP off. New niche recipient/acceptance test not performed; no client mail sent.
- [ ] **U3 UNVERIFIED** · local / gate · Matching marked Message-ID INBOX evidence is distinct from SMTP authentication/acceptance; tests do not inflate demand.
  Įrodymai: qa/verification-summary.json: no new Message-ID/INBOX proof; ../../MAIL_CORE.md: earlier other-niche matching test. SMTP authentication/old inbox proof cannot be relabelled as this niche receipt. QA records not demand.
- [ ] **U4 UNVERIFIED** · launch / gate · Actual production D1/bindings, delivery, recovery/reconciliation and spam/rate controls are verified.
  Įrodymai: qa/local-form-interest.json; qa/browser-d1-proof.json: isolated local D1 only. Production D1/bindings/delivery/recovery/reconciliation/rate controls unverified.

### V · 2/3, 6.66/10

- [x] **V1 PASS** · local / gate · Per-site counters exclude bots/DNT/GPC/tests as supported; clicks are separate from received inquiries.
  Įrodymai: qa/local-form-interest.json: DNT/GPC/bot no increment,valid event increment,origin/private-path/size rejection; qa/verification-summary.json: synthetic counters local only. Pageviews/mail clicks separate from durable inquiries; QA counters excluded from demand ledger.
- [x] **V2 PASS** · local / gate · Measurement privacy statements match stored fields/cookies/identifiers and enabled providers.
  Įrodymai: qa/trust-pages.json: /privatumas data inventory; qa/local-form-interest.json; qa/tool-interaction.json: query/form state not telemetry; only site/page/day event. No analytics cookies/visitor ID or form content payload; server logging terms remain launch gate.
- [ ] **V3 UNVERIFIED** · operations / gate · GSC/analytics/qualified inquiries and testing interval support the niche decision; voice is off unless separately authorized and gated.
  Įrodymai: BUSINESS.md; ACQUISITION.md: proposed measured decision interval; qa/verification-summary.json: voice off. No GSC/real qualified demand data. No expansion or voice activation.

### W · 3/4, 7.5/10

- [x] **W1 PASS** · local / gate · Notice and usage terms match an information/inquiry pilot, actual data inventory and current authoritative requirements.
  Įrodymai: qa/trust-pages.json: /privatumas and /naudojimo-salygos individually read; RESEARCH.md: EDPB original and VDAI context reviewed2026-10-01. Local synthetic-only notice matches actual pilot/data inventory. Public legal compliance not asserted.
- [x] **W2 PASS** · local / gate · Purpose, contact, rights, processors/transfer scope and storage/deletion limits are stated truthfully; no invented policy or legal identity.
  Įrodymai: qa/trust-pages.json: actual local purpose/contact/rights/deletion of synthetic records,unconfirmed public processor/retention terms explicit; qa/browser-d1-proof.json: marked record removed. Unknown business-ID/address/retention/processors not invented. No public personal-data collection authorized before W3 launch checks.
- [ ] **W3 UNVERIFIED** · launch / gate · Production legal basis, recipients/processors, transfers, retention and delete/recovery process are established and accurate in the public notice.
  Įrodymai: qa/trust-pages.json: public launch conditions explicit. Production basis,recipients/processors,transfers,retention and recovery/deletion procedure not established.
- [x] **W4 PASS** · local / gate · Nonessential cookie/marketing consent is implemented only when actually needed; inquiry is not blanket marketing consent.
  Įrodymai: qa/trust-pages.json: inquiry purpose not newsletter/marketing; qa/tool-interaction.json; own native form source: explicit purpose checkbox, no tracking/marketing subscription. No nonessential-cookie provider active; inquiry consent does not authorize outreach.

### X · 2/3, 6.66/10

- [x] **X1 PASS** · local / gate · No secrets/private leads/drafts in Git, public bundle, media paths, logs or LLM output; tenant and payload boundaries tested.
  Įrodymai: qa/publication-isolation.json: package/bundle names exclude env/devvars/private prompt/original nichePNG; cross-host asset404; qa/local-form-interest.json: tenant/body boundaries; prepare-production.mjs: whitelist copy excludes private vars/secrets/runtime. No secrets read/exported or synthetic leads in public package/LLM. Private source originals stay out of niche public media.
- [x] **X2 PASS** · local / review · Error behavior, dependence on optional voice/core, headers, spam vectors and recovery gaps are assessed with evidence.
  Įrodymai: qa/local-form-interest.json: deliberate storage503 with honest fallback; table restored; qa/publication-isolation.json: isolation/negative paths; qa/verification-summary.json: voice/mail off. Assessed optional dependencies, honeypot/origin/body limits; actual production rate/backups/recovery still X3/U4 gates.
- [ ] **X3 UNVERIFIED** · launch / gate · Production access, abuse limits, backups/restore and incident controls are working; unresolved risk is not hidden by a score.
  Įrodymai: qa/verification-summary.json: local only. Production access/rate/abuse/backups/restore/incident operation not proved.

### Y · 3/3, 10/10

- [x] **Y1 PASS** · local / gate · Shared fixes live in core; site-specific identity/content remain isolated; schema change updates both validators and integration tests.
  Įrodymai: qa/publication-isolation.json: all current packages preserved; own renderer files; shared dispatch/registry tiny integration; no schema mutation; qa/execution-proof.json: core tests. Shared technical SEO/media/lead mechanism reused; only niche identity/content new.
- [x] **Y2 PASS** · local / gate · Core/SEO regressions pass all current niches after relevant changes, with actual commands/results.
  Įrodymai: qa/execution-proof.json: core24/24, all seven domain SEO smoke after import; final own smoke repeat; qa/verification-summary.json: tsc and own ESLint/build pass. Other niches not redesigned or their existing dist rebuilt; own production copy.
- [x] **Y3 PASS** · local / gate · START_HERE, AGENTS, builder/planner and site journal link the current acceptance workflow for a fresh session.
  Įrodymai: ../../START_HERE.md; ../../AGENTS.md; ../../CORE_BUILD_CONTRACT.md: current workflow read; ../miniekskavatoriai.md: links to this audit/research/design/QA and open gates. Own journal completes fresh-session handover without rewriting shared instructions or historical fingerprints.

### Z · 2/3, 6.66/10

- [x] **Z1 PASS** · local / gate · Checklist, baseline findings, repairs, screenshots, versions, remaining blockers and score evidence are stored per site.
  Įrodymai: PHASE-1-AUDIT.md/json; PHASE-1-SCORE.json: all85 explicit site-specific criteria; qa/execution-proof.json; qa/verification-summary.json; FINISH-REVIEW.md: versions,bounds,baseline/corrections/screens. Audit initialized with all85UNVERIFIED; no other niche PASS copied. First-run snapshot retained separately before final/parent feedback.
- [x] **Z2 PASS** · local / gate · 10/10/local-ready/domain-ready claims obey the score contract; failed/unverified checks are visible.
  Įrodymai: PHASE-1-AUDIT.md/json; PHASE-1-SCORE.json: scorer contract and explicit open gates; FINISH-REVIEW.md:8.57 subjective craft separate from lab and A–Z. No10/10, local-ready, domain-ready, ≥9 craft or proven demand claim.
- [ ] **Z3 UNVERIFIED** · launch / gate · Final domain-ready handover has all applicable launch gates proved; no unmeasured guarantee of demand or ranking.
  Įrodymai: PHASE-1-AUDIT.md/json: launch checks UNVERIFIED. No actual launch handover; explicit deployment authorization, factual and operational evidence still required.

## Versija ir perdavimas

Paketo SHA256: `7f4bcc40fca41a7c2714dfea48fa9fc1eff36ff0235e3e96d9d8d24152fcac57`. Rendererio failų hash, izoliuota aplinka ir komandų įrodymai: [verification-summary](qa/verification-summary.json), [execution-proof](qa/execution-proof.json), [publication-isolation](qa/publication-isolation.json). Visi85 kriterijai įtraukti, skaičiuota bendru `SKILLS/niche-site-audit/scripts/score-audit.mjs`; [JSON](PHASE-1-AUDIT.json), [scorer išvestis](PHASE-1-SCORE.json).

Pirma viešo paskelbimo data nežinoma; paketo publishAt jos nepakeičia. Prieš tikrą rinkimą reikia rekvizitų/domain control/DNS/TLS/hostingo, galutinės privatumo/retention eigos, productionD1/delivery/recovery/abuse kontrolės ir atskirai autorizuoto SMTP+konkretaus Message-ID INBOX testo. Partneriai/atlygis/grafikas vis dar nepatvirtinti. [BUSINESS](BUSINESS.md), [ACQUISITION](ACQUISITION.md), [pirmo rezultato snapshot](FIRST-RUN.md).
