# akmenas.lt · Phase 1 A–Z auditas

2026-10-01T04:02:42.327Z. Inicializuotas visas oficialus 85 kriterijų katalogas; kiekvienas sprendimas pagrįstas šios nišos įrodymais. Paketas: cd725179619baaef8ba022f44964339eab0f4030d0629c9f9113997e7a98214e.

Izoliuota vietinė production peržiūra: http://127.0.0.1:8886/. Canonical host transportas: akmenas.lt. SMTP ir balsas išjungti, tikras domenas nepaleistas.

## Etapai

| Etapas | PASS / taikomi | Balas /10 | Vartai | Blokuoja |
|---|---:|---:|---|---|
| local | 70/72 | 9.72 | NOT READY | R2, S2 |
| launch | 0/10 | 0 | NOT READY | B3, I4, O3, U4, W3, X3, Z3 |
| operations | 0/2 | 0 | NOT READY | A3, V3 |

**Vietinis balas 70/72 = 9,72/10; local-ready nėra.** R2/S2 tikras 200 % didinimas UNVERIFIED. C3 NA, nes legacy redirect neįgyvendinta. Launch ir operations dar neatlikti; nežinoma būsena nėra įrodytas gedimas. Pradinis subjektyvus craft 13/14 = 9,29 yra atskiras, final fixes-only verdict jo neperskaičiavo.

[Perdavimas ir vartai](HANDOVER.md), [versija](VERSION.json), [pataisų žurnalas](BASELINE-AND-FIXES.json), [prieinamumo ribos](ACCESSIBILITY-VERIFICATION.md), [lab matavimai](PERFORMANCE.json), [paklausos planas](CONTENT-PLAN.json).

## Kategorijos (apima skirtingus etapus)

| Grupė | PASS / taikomi | Balas /10 | Atviri vartai |
|---|---:|---:|---|
| A | 2/3 | 6.66 | A3 |
| B | 2/3 | 6.66 | B3 |
| C | 2/2 | 10 | — |
| D | 3/3 | 10 | — |
| E | 3/3 | 10 | — |
| F | 3/3 | 10 | — |
| G | 3/3 | 10 | — |
| H | 5/5 | 10 | — |
| I | 3/4 | 7.5 | I4 |
| J | 3/3 | 10 | — |
| K | 3/3 | 10 | — |
| L | 3/4 | 7.5 | — |
| M | 3/3 | 10 | — |
| N | 3/4 | 7.5 | — |
| O | 2/3 | 6.66 | O3 |
| P | 3/3 | 10 | — |
| Q | 3/3 | 10 | — |
| R | 2/3 | 6.66 | R2 |
| S | 2/3 | 6.66 | S2 |
| T | 2/3 | 6.66 | — |
| U | 3/4 | 7.5 | U4 |
| V | 2/3 | 6.66 | V3 |
| W | 3/4 | 7.5 | W3 |
| X | 2/3 | 6.66 | X3 |
| Y | 3/3 | 10 | — |
| Z | 2/3 | 6.66 | Z3 |

## Visi 85 sprendimai

### A1 · PASS · local gate

Phase 1 is explicit; inquiry is not an order, reservation or proven demand.

The visible pilot offers information and a need description; an inquiry is not an order or measured demand.

Įrodymai: [PRODUCT.md](../../sites/akmenas/PRODUCT.md), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### A2 · PASS · local gate

The primary action and visible offer are genuinely available and test the chosen concrete business outcome with a documented payer/revenue hypothesis; editorial interest does not substitute for product/service intent. No fake commerce, stock or supplier claim; prelaunch availability is disclosed.

Three real guides and the local D 1 form are available. No stock, prices, suppliers or fabrication promise is offered.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [FORM-VERIFICATION.json](../../sites/akmenas/FORM-VERIFICATION.json).

### A3 · UNVERIFIED · operations gate

Expansion decision uses qualified real inquiries/value/capacity, not clicks or test records.

No production qualified-inquiry, value or capacity data yet supports an expansion decision.

Įrodymai: [CONTENT-PLAN.json](../../sites/akmenas/CONTENT-PLAN.json).

### B1 · PASS · local gate

Operator/contact defaults and site exceptions agree across package, visible copy, schema and form recipient.

MB Pinet and info@pinet.lt agree across the approved package, visible contact, Organization and shared recipient proof.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [SHARED-MAIL-EVIDENCE.json](../../sites/akmenas/SHARED-MAIL-EVIDENCE.json).

### B2 · PASS · local gate

No borrowed phones, addresses, identities, credentials, reviews or certifications.

All 11 texts were reviewed; no borrowed phone/address/code, fictional expert, customer project, certification or review appears.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json).

### B3 · UNVERIFIED · launch gate

Actual operator identity, applicable legal identifiers/address and domain control are established.

Only operator name and default email are confirmed. Legal identifiers/address and domain control remain unproved.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json).

### C1 · PASS · local gate

Bounded history evidence, retrieval limits and unavailable periods are recorded.

Bounded CDX found 283 HTML URLs and four snapshots were read. An incomplete year query is explicitly recorded.

Įrodymai: [audit.json](../../sites/akmenas/history/audit.json), [REPORT.md](../../sites/akmenas/history/REPORT.md), [ASSESSMENT.md](../../sites/akmenas/history/ASSESSMENT.md).

### C2 · PASS · local gate

Reviewed URL decisions distinguish same-intent restore/redirect from defer/404; no mass homepage redirects.

Root has current narrow informational content. Legacy catalog/JSP/Joomla routes are deferred or 404, without mass homepage redirects.

Įrodymai: [url-decisions.json](../../sites/akmenas/history/url-decisions.json), [seo-smoke.log](../../sites/akmenas/seo-smoke.log).

### C3 · NA · launch

Any implemented legacy redirect has a current same-host approved 200 target, no loop and a tested status.

No legacy redirect is implemented, so production redirect acceptance is not applicable to this version.

Įrodymai: [url-decisions.json](../../sites/akmenas/history/url-decisions.json).

### D1 · PASS · local

Local/international comparisons and real desktop/mobile evidence support the chosen journey.

LT/PL/UK/IT comparisons include actual desktop/mobile captures. DE is only a candidate; Laminam lazy/cookie limitations are recorded.

Įrodymai: [RESEARCH.md](../../sites/akmenas/research/RESEARCH.md), [FINISH-REVIEW.md](../../sites/akmenas/FINISH-REVIEW.md).

### D2 · PASS · local gate

Current facts and permissions support original copy/assets; old or competitor claims are not our facts.

Original agent copy uses current primary NSI/Cosentino/Laminam sources; original illustrations have origin/rights records.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [MEDIA-LEDGER.json](../../sites/akmenas/MEDIA-LEDGER.json), [RESEARCH.md](../../sites/akmenas/research/RESEARCH.md).

### D3 · PASS · local

Search intents and niche advantages are hypotheses where no search/conversion data exists.

Audience, intents and seasonal dates are labelled hypotheses; search volume, conversion and ranking are not invented.

Įrodymai: [RESEARCH.md](../../sites/akmenas/research/RESEARCH.md), [CONTENT-PLAN.json](../../sites/akmenas/CONTENT-PLAN.json).

### E1 · PASS · local

Full homepage and guide have a coherent niche-specific identity, rhythm and meaningful imagery.

The stone atlas identity spans the full homepage and guides. Initial subjective craft 13/14 is separate from the fixes-only verdict.

Įrodymai: [FINISH-REVIEW.json](../../sites/akmenas/FINISH-REVIEW.json), [FINISH-VERDICT.json](../../sites/akmenas/FINISH-VERDICT.json), [DIRECTION.md](../../sites/akmenas/DIRECTION.md).

### E2 · PASS · local

DESIGN describes actual tokens, composition and compromises; technical scores are separate from visual judgment.

DESIGN and the sidecar specify actual CSS tokens, components, responsive composition and known compromises.

Įrodymai: [DESIGN.md](../../sites/akmenas/DESIGN.md), [design.json](../../sites/akmenas/.impeccable/design.json).

### E3 · PASS · local gate

Image origin/rights are documented and presentation is truthful; no imaginary stock, client project, distorted teaching diagram or unwanted generator badge.

AI illustrations are not presented as customer work. Provenance is in the media ledger/editorial method, without a generator badge.

Įrodymai: [MEDIA-LEDGER.json](../../sites/akmenas/MEDIA-LEDGER.json), [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [FONT-OPTIMIZATION.json](../../sites/akmenas/FONT-OPTIMIZATION.json).

### F1 · PASS · local gate

All public pages are reachable through useful navigation/context; no orphan initial guide.

All 11 eligible pages are reachable through navigation, hub, related routes or footer; no initial guide is orphaned.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### F2 · PASS · local gate

Desktop/mobile header, index, footer and local inquiry actions work with actual destinations.

Actual eligible navigation/action targets render. Native mobile menu opens and closes with Enter.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [keyboard-final.json](../../sites/akmenas/qa/keyboard-final.json), [index-320.png](../../sites/akmenas/qa/index-320.png).

### F3 · PASS · local

Each URL has a distinct job; no doorway city/synonym variants, duplicate intent or pointless index.

Each URL has a separate reader question. No city/synonym doorway pages were created.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json).

### G1 · PASS · local gate

First screen identifies the topic, useful offer and honest next action.

The first screen identifies kitchen stone, selection guidance and actual comparison/inquiry actions.

Įrodymai: [home-desktop.png](../../sites/akmenas/qa/home-desktop.png), [home-mobile.png](../../sites/akmenas/qa/home-mobile.png), [home-tablet.png](../../sites/akmenas/qa/home-tablet.png).

### G2 · PASS · local

Middle/end answer new questions rather than repeating promotions or decorative cards.

The full homepage develops material criteria, three guide questions, a preparation list and contact rather than repeating promotions.

Įrodymai: [home-desktop.png](../../sites/akmenas/qa/home-desktop.png), [FINISH-REVIEW.md](../../sites/akmenas/FINISH-REVIEW.md).

### G3 · PASS · local gate

Primary/secondary actions, privacy route, empty/error/success states have real behavior.

Action/privacy URLs resolve; empty native validation and real 400/403/404/200 server outcomes were exercised.

Įrodymai: [native-form.json](../../sites/akmenas/qa/native-form.json), [FORM-VERIFICATION.json](../../sites/akmenas/FORM-VERIFICATION.json), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### H1 · PASS · local gate

At least three distinct prepared guides are individually read and useful for the site's intent; no word-count substitute.

All three guides were individually read against primary sources and evaluated for usefulness, not word count.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [RESEARCH.md](../../sites/akmenas/research/RESEARCH.md).

### H2 · PASS · local gate

Claims, terminology, examples, limitations and sources are checked; unsafe universal technical advice is absent.

Product-specific documents take precedence. No universal resistance warranty, structural dimensions or hazardous chemical recipes appear.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [RESEARCH.md](../../sites/akmenas/research/RESEARCH.md).

### H3 · PASS · local

Each guide gives a usable explanation/example/checklist, readable structure and next step without filler.

The guides include a comparison worksheet, an inquiry checklist/example and a care log with a useful next step.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [materials-320.png](../../sites/akmenas/qa/materials-320.png), [planning-320.png](../../sites/akmenas/qa/planning-320.png), [care-320.png](../../sites/akmenas/qa/care-320.png).

### H4 · PASS · local gate

Long article, lists, figures and source sections are actually rendered and mobile-tested, not silently discarded.

All three long bodies, lists, sources and real heading fragments render;17 final captures were reopened.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [FINISH-VERDICT.json](../../sites/akmenas/FINISH-VERDICT.json), [responsive-evidence.json](../../sites/akmenas/qa/responsive-evidence.json).

### H5 · PASS · local gate

Each initial guide has an inspected topic-specific image; homepage/index and other pages have purposeful visual coverage, actual files and responsive crops, or a documented text-focused reason where imagery adds no value.

Every guide has an inspected relevant image. Homepage/hub coverage,20 actual WebP variants, srcset and Article images were checked; text-focused trust/legal/contact exceptions are documented.

Įrodymai: [MEDIA-LEDGER.json](../../sites/akmenas/MEDIA-LEDGER.json), [VERSION.json](../../sites/akmenas/VERSION.json), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [FINISH-VERDICT.json](../../sites/akmenas/FINISH-VERDICT.json), [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json).

### I1 · PASS · local gate

Visible attribution identifies a real Person or Organization with a public profile or clear identity.

The visible byline names MB Pinet editorial Organization and links to its public profile.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [materials-390.png](../../sites/akmenas/qa/materials-390.png).

### I2 · PASS · local gate

Author/profile/schema identity agrees; no fictional expert or unverified experience.

Organization, byline and profile agree; no fictional specialist or claimed stone expertise.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json).

### I3 · PASS · local gate

Visible publication/review dates and structured dates have the same meaning; dates are not refreshed per request.

Fixed package publication/review dates agree with visible and structured dates, rather than refreshing per request.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [core-tests.log](../../sites/akmenas/core-tests.log).

### I4 · UNVERIFIED · launch gate

Initial production publication/deployment date is documented; planned dates are not evidence of past public availability.

Local publishAt is not deployment evidence. No actual production publication date exists yet.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json).

### J1 · PASS · local gate

About/editorial information explains purpose, AI role, source method, limitations and corrections contact.

About/editorial pages explain the pilot, AI/agent role, sources, limits and corrections contact.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### J2 · PASS · local

Review is attributed honestly to the agent/process; no claim of human/qualified approval without it.

Approval actor is codex-source-review; humanApproval:false. No human or qualified-expert approval is asserted.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [VERSION.json](../../sites/akmenas/VERSION.json).

### J3 · PASS · local gate

Factual corrections propagate through studio approval and public/LLM projections; review evidence is retained.

The service→faq correction used real studio edit/approve/export. Current hash/import/compile match; tests reject modified approved content.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [core-tests.log](../../sites/akmenas/core-tests.log), [studio-tests.log](../../sites/akmenas/studio-tests.log).

### K1 · PASS · local gate

Every public URL has one useful H1, title, description, correct language and canonical.

Actual 11-page HTML audit verifies one H 1, title, description, Lithuanian language and canonical; zero findings.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### K2 · PASS · local

Heading order, informative alt, sharing metadata and social image (when used) match actual content.

Heading/alt/OG/Article imagery match content; real mobile long-guide rendering was inspected.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [FINISH-VERDICT.json](../../sites/akmenas/FINISH-VERDICT.json).

### K3 · PASS · local gate

Unknown/future/private URLs return proper 404/noindex and do not canonicalize to the homepage.

Unknown/future/private paths and unknown hosts pass actual 404/isolation tests without homepage canonicalization.

Įrodymai: [seo-smoke.log](../../sites/akmenas/seo-smoke.log), [core-tests.log](../../sites/akmenas/core-tests.log).

### L1 · PASS · local gate

JSON-LD parses and uses truthful appropriate WebSite/WebPage/Organization/Article entities and stable IDs.

JSON-LD parses truthful WebSite/WebPage/Organization/Article entities; the initial double serialization was repaired.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### L2 · PASS · local gate

Visible breadcrumb and schema path/name/URL agree; profile and author relations point to eligible public pages.

Visible and structured breadcrumbs agree with the shared name/path contract and eligible author profile.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### L3 · PASS · local gate

No invented Offer/Product/Review/AggregateRating/LocalBusiness or unsupported rich-result promise.

No Product/Offer/Review/AggregateRating/LocalBusiness exists. Unsupported Service was removed through approved content type correction.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [VERSION.json](../../sites/akmenas/VERSION.json).

### L4 · UNVERIFIED · launch

Official rich-result/URL Inspection findings are recorded after actual crawlable deployment; local checks are labelled local.

No official crawlable-domain rich-result or URL Inspection evidence exists. Local parsing is labelled local.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### M1 · PASS · local gate

Contextual links use real same-site target IDs and informative anchors; fragments exist.

Context links use actual page IDs and valid fragment targets; HTML audit has no findings.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### M2 · PASS · local gate

Future/unapproved/revoked targets disappear consistently from prose, related sections, indexes and schema.

Shared eligible-page projection controls text/related/index/schema; hash/date/revocation/cross-host negatives pass.

Įrodymai: [core-tests.log](../../sites/akmenas/core-tests.log), [seo-smoke.log](../../sites/akmenas/seo-smoke.log).

### M3 · PASS · local

Cluster/pillar/related routes help distinct questions; repetition/all-to-all links are not treated as authority.

A hub and three distinct guide questions support selective related routes; no all-to-all authority promise.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### N1 · PASS · local gate

Sources have relevant primary evidence, actual target checks and retrieval dates; no partner implication.

Primary source destinations were actually read 2026-10-01; panels explain their role without claiming partnership.

Įrodymai: [RESEARCH.md](../../sites/akmenas/research/RESEARCH.md), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### N2 · PASS · local gate

Owned editorial links obey target ID, host, approval/date/deployment eligibility and disclosed relevant reason.

No owned-domain editorial links are published. The required verslomatika attribution stays plain text pending eligible live target proof.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [core-tests.log](../../sites/akmenas/core-tests.log).

### N3 · PASS · local gate

Prose links and source/related panels render correctly; sponsored/UGC relation is applied only if applicable.

Actual source/related panels render in all guides. No sponsored or UGC relationship applies to this copy.

Įrodymai: [materials-320.png](../../sites/akmenas/qa/materials-320.png), [planning-320.png](../../sites/akmenas/qa/planning-320.png), [care-320.png](../../sites/akmenas/qa/care-320.png), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### N4 · UNVERIFIED · launch

Brand/attribution and other external destinations work on the live launch; pending network domains stay unpublished.

External/attribution destinations have not been checked on a live akmenas deployment.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### O1 · PASS · local gate

Canonical host/path, sitemap, robots, redirects and slash/query behavior are coherent and actually tested.

Actual host-aware canonical/sitemap/robots/slash/query/404 behavior passes; no mass redirects.

Įrodymai: [seo-smoke.log](../../sites/akmenas/seo-smoke.log), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### O2 · PASS · local gate

Sitemap contains only eligible URLs and meaningful lastmod; robots does not substitute for private access control.

Sitemap contains 11 eligible URLs with meaningful lastmod. Private/date/hash filters are tested beyond robots.

Įrodymai: [seo-smoke.log](../../sites/akmenas/seo-smoke.log), [core-tests.log](../../sites/akmenas/core-tests.log).

### O3 · UNVERIFIED · launch gate

DNS, TLS, real host, indexing directives and domain isolation work on production.

Production DNS/TLS/host/indexing and domain isolation are not yet proved.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json).

### P1 · PASS · local gate

Same authoritative projection controls HTML, links, media, schema, sitemap and LLM output.

The shared authoritative projection supplies HTML/links/media/schema/sitemap/LLM; the niche branch receives projected props.

Įrodymai: [core-tests.log](../../sites/akmenas/core-tests.log), [seo-smoke.log](../../sites/akmenas/seo-smoke.log), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### P2 · PASS · local gate

Hash/date/revocation/cross-host negative tests pass; draft preview is private and not indexed.

Hash/date/revocation/cross-host and private-preview negative tests pass.

Įrodymai: [core-tests.log](../../sites/akmenas/core-tests.log), [seo-smoke.log](../../sites/akmenas/seo-smoke.log).

### P3 · PASS · local gate

Studio approval, import validation and compile preserve unrelated packages and reject changed approved content.

Real studio edit/approve/export and validated import/compile used. Changed-approval rejection and preservation tests pass; handover hashes are not claimed as start baseline.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json), [core-tests.log](../../sites/akmenas/core-tests.log), [studio-tests.log](../../sites/akmenas/studio-tests.log).

### Q1 · PASS · local gate

Public LLM exports match the active niche's useful facts, URLs, contacts and visible publication scope.

Actual SEO smoke checks akmenas LLM scope, contacts, eligible URLs and tenant isolation.

Įrodymai: [seo-smoke.log](../../sites/akmenas/seo-smoke.log).

### Q2 · PASS · local gate

Definitions, qualified answers and primary citations are accessible in semantic HTML; no hidden model-only claims.

Definitions, qualified answers and primary sources are visible semantic HTML, without hidden model-only claims.

Įrodymai: [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json), [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json).

### Q3 · PASS · local

llms.txt/AI visibility are supplementary; no special schema, traffic or ranking guarantee is asserted.

llms remains supplementary. Copy and plan do not guarantee ranking, traffic or AI visibility.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [CONTENT-PLAN.json](../../sites/akmenas/CONTENT-PLAN.json).

### R1 · PASS · local gate

Keyboard, focus, skip link, labels, landmarks and details/menu interactions are exercised.

Actual Enter menu, main skip focus/outline, native labels/validation, landmarks/details and valid fragments are exercised.

Įrodymai: [ACCESSIBILITY-VERIFICATION.json](../../sites/akmenas/ACCESSIBILITY-VERIFICATION.json).

### R2 · UNVERIFIED · local gate

Contrast, zoom/reflow, readable utility text and touch targets are checked; score alone is not WCAG conformance.

Contrast, target dimensions, utility type and narrow reading are recorded. Actual 200% enlargement is unsupported and unverified.

Įrodymai: [ACCESSIBILITY-VERIFICATION.json](../../sites/akmenas/ACCESSIBILITY-VERIFICATION.json).

### R3 · PASS · local gate

Images, headings, disclosure state, form requirements/errors and reduced-motion behavior remain usable.

Meaningful alt/headings/native disclosure/form constraints were checked. No timed animation; CSS removes active button movement under reduced motion.

Įrodymai: [ACCESSIBILITY-VERIFICATION.json](../../sites/akmenas/ACCESSIBILITY-VERIFICATION.json), [native-form.json](../../sites/akmenas/qa/native-form.json).

### S1 · PASS · local gate

Desktop, narrow/mobile and tablet evidence shows no overflow or hidden defects.

17 final desktop/narrow/tablet captures and DOM checks show no observed overflow; the 768 opening repair is confirmed.

Įrodymai: [FINISH-VERDICT.json](../../sites/akmenas/FINISH-VERDICT.json), [responsive-evidence.json](../../sites/akmenas/qa/responsive-evidence.json).

### S2 · UNVERIFIED · local gate

Article contents, byline, source lists, breadcrumb, form and footer work at narrow widths and enlarged text.

Narrow full-guide/contents/byline/sources/breadcrumb/form/footer evidence exists; actual enlarged text remains unverified.

Įrodymai: [ACCESSIBILITY-VERIFICATION.json](../../sites/akmenas/ACCESSIBILITY-VERIFICATION.json).

### S3 · PASS · local

Real viewport tests are distinguished from physical device and synthesized touch testing.

IAB viewport simulations are explicitly distinguished from physical phone/touch tests.

Įrodymai: [ACCESSIBILITY-VERIFICATION.json](../../sites/akmenas/ACCESSIBILITY-VERIFICATION.json).

### T1 · PASS · local gate

Production mobile lab is measured with real media and saved version/date/environment; performance target >=90 is met or remains failed.

Real-media isolated production mobile lab: home fixed three serial runs 90/92/99, median 92; guide 91. Earlier concurrent 81 is retained.

Įrodymai: [PERFORMANCE.json](../../sites/akmenas/PERFORMANCE.json), [PERFORMANCE-SAMPLES.json](../../sites/akmenas/PERFORMANCE-SAMPLES.json), [VERSION.json](../../sites/akmenas/VERSION.json).

### T2 · PASS · local

Measured LCP/CLS/TBT, image sizes, fonts, CSS and JS budgets have justified fixes; no dummy content score.

Shared responsive WebP, modern font subsets, inline font CSS and preloads reduce payload. Final LCP 3.05/3.17 s, CLS 0, TBT 50.5/19.5 ms; variance is recorded.

Įrodymai: [PERFORMANCE.json](../../sites/akmenas/PERFORMANCE.json), [PERFORMANCE-SAMPLES.json](../../sites/akmenas/PERFORMANCE-SAMPLES.json), [FONT-OPTIMIZATION.json](../../sites/akmenas/FONT-OPTIMIZATION.json).

### T3 · UNVERIFIED · launch

Production field CWV/traffic evidence is monitored separately; local Lighthouse is not field performance.

No production field CWV or traffic evidence exists; local lab is not field performance.

Įrodymai: [PERFORMANCE.json](../../sites/akmenas/PERFORMANCE.json).

### U1 · PASS · local gate

Native/server validation, origin, size limits and honest errors pass; durable D1 record survives mail/core failure.

Native/server/origin/body/host/honeypot checks pass. A durable D 1 record survives disabled SMTP/voice and the exact synthetic record was removed.

Įrodymai: [FORM-VERIFICATION.json](../../sites/akmenas/FORM-VERIFICATION.json), [native-form.json](../../sites/akmenas/qa/native-form.json).

### U2 · PASS · local gate

Operator notification recipient and SMTP acceptance are tested without client messages or exposed secrets.

Unchanged shared recipient/transport has dated 2026-09-30 TLS/AUTH/SMTP proof. Akmenas local D 1 is independently tested; production delivery is not.

Įrodymai: [SHARED-MAIL-EVIDENCE.json](../../sites/akmenas/SHARED-MAIL-EVIDENCE.json), [FORM-VERIFICATION.json](../../sites/akmenas/FORM-VERIFICATION.json).

### U3 · PASS · local gate

Matching marked Message-ID INBOX evidence is distinct from SMTP authentication/acceptance; tests do not inflate demand.

Shared form test d 2 fe… matches stored record, SMTP and INBOX received proof. The earlier separate SMTP-only test is not treated as receipt.

Įrodymai: [SHARED-MAIL-EVIDENCE.json](../../sites/akmenas/SHARED-MAIL-EVIDENCE.json).

### U4 · UNVERIFIED · launch gate

Actual production D1/bindings, delivery, recovery/reconciliation and spam/rate controls are verified.

Production D 1/bindings, delivery/reconciliation/recovery and spam limits remain unverified.

Įrodymai: [FORM-VERIFICATION.json](../../sites/akmenas/FORM-VERIFICATION.json).

### V1 · PASS · local gate

Per-site counters exclude bots/DNT/GPC/tests as supported; clicks are separate from received inquiries.

Per-site increment, bot/DNT/GPC non-storage and origin/path/body/event boundaries pass; test counter restored. Clicks are separate from leads.

Įrodymai: [INTEREST-VERIFICATION.json](../../sites/akmenas/INTEREST-VERIFICATION.json).

### V2 · PASS · local gate

Measurement privacy statements match stored fields/cookies/identifiers and enabled providers.

Counter stores site/day/path/event/count without visitor identifiers or cookies; local notice matches enabled inventory.

Įrodymai: [INTEREST-VERIFICATION.json](../../sites/akmenas/INTEREST-VERIFICATION.json), [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json).

### V3 · UNVERIFIED · operations gate

GSC/analytics/qualified inquiries and testing interval support the niche decision; voice is off unless separately authorized and gated.

GSC/real sessions/qualified value are unmeasured; voice is off. Decision window starts after real indexing.

Įrodymai: [CONTENT-PLAN.json](../../sites/akmenas/CONTENT-PLAN.json).

### W1 · PASS · local gate

Notice and usage terms match an information/inquiry pilot, actual data inventory and current authoritative requirements.

Notice/terms match a local information and synthetic-inquiry pilot, with official GDPR/VDAI source review and explicit limits.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [RESEARCH.md](../../sites/akmenas/research/RESEARCH.md).

### W2 · PASS · local gate

Purpose, contact, rights, processors/transfer scope and storage/deletion limits are stated truthfully; no invented policy or legal identity.

Contact, purposes and rights are described truthfully. Retention/basis/processors/transfers are explicitly unconfirmed, blocking production.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json), [HTML-AUDIT.json](../../sites/akmenas/HTML-AUDIT.json).

### W3 · UNVERIFIED · launch gate

Production legal basis, recipients/processors, transfers, retention and delete/recovery process are established and accurate in the public notice.

Production legal basis, recipient/processors/transfers/retention/delete-recovery decisions are not established. Local notice must be replaced through approval before launch.

Įrodymai: [CONTENT-REVIEW.json](../../sites/akmenas/CONTENT-REVIEW.json).

### W4 · PASS · local gate

Nonessential cookie/marketing consent is implemented only when actually needed; inquiry is not blanket marketing consent.

No ads/GA/pixels/nonessential cookies are enabled; native inquiry consent is not marketing consent.

Įrodymai: [INTEREST-VERIFICATION.json](../../sites/akmenas/INTEREST-VERIFICATION.json), [native-form.json](../../sites/akmenas/qa/native-form.json).

### X1 · PASS · local gate

No secrets/private leads/drafts in Git, public bundle, media paths, logs or LLM output; tenant and payload boundaries tested.

Own package/render/LLM/private paths and secret exclusions checked. Originals private and exact synthetic lead removed; tenant/payload negatives pass.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json), [SECURITY-VERIFICATION.json](../../sites/akmenas/SECURITY-VERIFICATION.json), [FORM-VERIFICATION.json](../../sites/akmenas/FORM-VERIFICATION.json), [seo-smoke.log](../../sites/akmenas/seo-smoke.log).

### X2 · PASS · local

Error behavior, dependence on optional voice/core, headers, spam vectors and recovery gaps are assessed with evidence.

Origin/body/honeypot/host failure checks and D 1 independence are exercised. Production rate/binding/restore gaps remain explicit.

Įrodymai: [SECURITY-VERIFICATION.json](../../sites/akmenas/SECURITY-VERIFICATION.json), [FORM-VERIFICATION.json](../../sites/akmenas/FORM-VERIFICATION.json), [INTEREST-VERIFICATION.json](../../sites/akmenas/INTEREST-VERIFICATION.json).

### X3 · UNVERIFIED · launch gate

Production access, abuse limits, backups/restore and incident controls are working; unresolved risk is not hidden by a score.

Production access, abuse controls, backups/restore and incident procedures remain unproved.

Įrodymai: [SECURITY-VERIFICATION.json](../../sites/akmenas/SECURITY-VERIFICATION.json).

### Y1 · PASS · local gate

Shared fixes live in core; site-specific identity/content remain isolated; schema change updates both validators and integration tests.

Shared SEO/media/contact/D 1/link helpers are reused. Only own renderer/dispatch/package/fonts added; schema unchanged.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json), [core-tests.log](../../sites/akmenas/core-tests.log), [studio-tests.log](../../sites/akmenas/studio-tests.log).

### Y2 · PASS · local gate

Core/SEO regressions pass all current niches after relevant changes, with actual commands/results.

Actual 19 core/15 studio and four installed-niche SEO checks pass. Own isolated TypeScript/ESLint pass; concurrent other-niche global TypeScript errors are disclosed.

Įrodymai: [core-tests.log](../../sites/akmenas/core-tests.log), [studio-tests.log](../../sites/akmenas/studio-tests.log), [seo-smoke.log](../../sites/akmenas/seo-smoke.log), [typecheck-isolated.log](../../sites/akmenas/typecheck-isolated.log), [eslint.log](../../sites/akmenas/eslint.log), [typecheck.log](../../sites/akmenas/typecheck.log).

### Y3 · PASS · local gate

START_HERE, AGENTS, builder/planner and site journal link the current acceptance workflow for a fresh session.

Journal/handover link current START/core/builder/planner/audit workflow; instruction hashes are labelled handover-only.

Įrodymai: [VERSION.json](../../sites/akmenas/VERSION.json), [HANDOVER.md](../../sites/akmenas/HANDOVER.md).

### Z1 · PASS · local gate

Checklist, baseline findings, repairs, screenshots, versions, remaining blockers and score evidence are stored per site.

All 85 site-specific statuses/evidence, scorer, fixes, captures, version and remaining blockers are retained; FIRST-RUN precedes the first final response.

Įrodymai: [PHASE-1-AUDIT.json](../../sites/akmenas/PHASE-1-AUDIT.json), [PHASE-1-SCORE.json](../../sites/akmenas/PHASE-1-SCORE.json), [HANDOVER.md](../../sites/akmenas/HANDOVER.md), [VERSION.json](../../sites/akmenas/VERSION.json).

### Z2 · PASS · local gate

10/10/local-ready/domain-ready claims obey the score contract; failed/unverified checks are visible.

Local 9.72 is not 10; R 2/S 2 blockers are visible. Launch/demand and subjective craft remain separate.

Įrodymai: [PHASE-1-SCORE.json](../../sites/akmenas/PHASE-1-SCORE.json), [FINISH-VERDICT.json](../../sites/akmenas/FINISH-VERDICT.json), [HANDOVER.md](../../sites/akmenas/HANDOVER.md).

### Z3 · UNVERIFIED · launch gate

Final domain-ready handover has all applicable launch gates proved; no unmeasured guarantee of demand or ranking.

Domain-ready is not claimed. Production and demand gates remain unproved.

Įrodymai: [HANDOVER.md](../../sites/akmenas/HANDOVER.md).


Scorer: `node SKILLS/niche-site-audit/scripts/score-audit.mjs sites/akmenas/PHASE-1-AUDIT.json`. Rezultatas: PHASE-1-SCORE.json. Skaičius neatšaukia atvirų vartų ir nėra reitingų, paklausos ar WCAG pažadas.
