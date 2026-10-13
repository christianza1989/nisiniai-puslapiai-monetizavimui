import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {catalogFromMarkdown,scoreAudit} from '../../../SKILLS/niche-site-audit/scripts/score-audit.mjs';
const dir=path.resolve(fileURLToPath(new URL('.',import.meta.url)),'..');
const project=path.resolve(dir,'../..');
const catalog=catalogFromMarkdown(await readFile(path.join(project,'SKILLS/niche-site-audit/references/checklist.md'),'utf8'));
const decisions={};
function set(ids,status,evidence,notes){for(const id of ids.split(' '))decisions[id]={status,evidence,notes};}
set('A1','PASS',['PAGES.md','prototype/shop/index.html'],'Private Phase 1; planned prices, no checkout/order/stock claim.');
set('A2','FAIL',['PAGE_PLAN.md','prototype/shop/index.html','prototype/contact/index.html'],'Payer/revenue hypothesis and honest choices exist, but interest opens a mailto draft; no durable business-intent record.');
set('B1','PASS',['knowledge/content.mjs','knowledge/package/content-package.json','prototype/editorial/index.html'],'MB Pinet is the configured organization; hello@phonebridger.com is the owner-approved contact. Recipient consistency is not delivery or legal-identity verification.');
set('B2','PASS',['PRODUCT.md','prototype/index.html','knowledge/PROMPTS.md'],'Illustrative demo/sample-user reviews are identified; no Review/AggregateRating schema or invented expert. Original contextual guide imagery is labelled.');
set('C1','PASS',['knowledge/RESEARCH.md'],'One bounded Archive/domain retrieval was inaccessible. Limits recorded; not evidence of no history or domain ownership.');
set('C2','PASS',['knowledge/RESEARCH.md','qa/knowledge-v1/verification.json'],'Unknown legacy URLs deferred until history can be inspected; no bulk homepage redirects. Missing/private guide URLs return404.');
set('C3','NA',[],'No legacy redirects implemented in this prepared preview. Real domain history remains unresolved under C1/B3/O3.');
set('D1','PASS',['PAGE_PLAN.md','qa/site-pages-v1/responsive-geometry.json'],'Existing dated official-brand desktop/mobile inspections inform the inherited product-choice and support journey. Guide work extends that chosen identity; source availability limits are recorded.');
set('D2 D3','PASS',['knowledge/RESEARCH.md','knowledge/content.mjs','PAGE_PLAN.md'],'Native instructions checked against current release documents; platform claims use primary sources. Search/buyer intents are hypotheses, with no invented volume, demand or result.');
set('E1 E2 E3','PASS',['DESIGN.md','knowledge/DESIGN.md','knowledge/PROMPTS.md','knowledge/image-ledger.json','qa/knowledge-v1/finish-review.md'],'Pinned identity preserved; all16 initial captures inspected. Fresh review repairs scored ship for the bounded tablet/category fixes. Four1536x1024 contextual images inspected, with20 shared-pipeline derivatives. Not an independent product test.');
set('F1 F2 F3','PASS',['qa/knowledge-v1/verification.json','qa/knowledge-v1/browser-checks.json','PAGES.md'],'Seventeen inner routes plus homepage; new6 destinations reachable in navigation/footer/context.286 same-origin checks, distinct jobs, no doorway location variants.');
set('G1 G2','PASS',['PRODUCT.md','DESIGN.md','prototype/index.html'],'Selected homepage presents Windows/Android offer and live illustrative demo, features, setup, FAQs and disclosed sample feedback; it remains visually frozen.');
set('G3','FAIL',['qa/knowledge-v1/lighthouse-homepage-frozen.json','PAGES.md'],'Actual frozen app.js raises a null addEventListener exception at63; mailto-only contact and recovery do not prove delivered outcomes. Inner account behavior is locally exercised.');
set('H1 H2 H3 H4 H5','PASS',['knowledge/content.mjs','knowledge/RESEARCH.md','qa/knowledge-v1/verification.json','qa/knowledge-v1/browser-checks.json','qa/knowledge-v1/guides-getting-started-desktop.png','qa/knowledge-v1/guides-usb-wifi-mobile.png','qa/knowledge-v1/guides-android-permissions-desktop.png','qa/knowledge-v1/guides-phone-position-mobile.png'],'All four guides individually read and rendered, each with direct answer, useful steps, checks/limits/next action and topic-specific figure. Android access warning, one USB phone, source-app audio policy and no native file dragging are qualified.');
set('I1 I2','PASS',['prototype/editorial/index.html','knowledge/package/content-package.json'],'Organization rather than fictional person; visible byline/profile/schema use configured MB Pinet. Actual production legal identity still needs B3 evidence.');
set('I3','FAIL',['prototype/guides/getting-started/index.html','knowledge/package/content-package.json'],'Visible prepared/reviewed date is honestly labelled private. Shared Article datePublished currently represents prepared publishAt; real first public publication must replace it before admission. No historical public availability asserted.');
set('J1 J2 J3','PASS',['knowledge/prepare.mjs','prototype/editorial/index.html','qa/knowledge-v1/verification.json'],'Editorial AI/source/correction/illustration scope explicit. Agent review attributed as agent review. Real Studio CRUD approval/export; mutation rejected, corrected alias revisions reviewed again; no handwritten approval hashes.');
set('K1','FAIL',['prototype/index.html','qa/knowledge-v1/verification.json'],'Prepared inner-page metadata uses core helpers, but the user-frozen homepage head lacks canonical and JSON-LD. No silent protected-region change.');
set('K2','PASS',['qa/knowledge-v1/verification.json','knowledge/render.mjs','prototype/assets/brand-mark.svg'],'English H1/headings and informative alt/sharing metadata match new content. Actual PhoneBridger SVG/favicon, no unrelated inherited brand.');
set('K3','PASS',['qa/knowledge-v1/verification.json','core-preview.test.mjs'],'Actual404 for unknown/private routes, no homepage canonical fallback; preview carries noindex atHTTP boundary.');
set('L1','FAIL',['knowledge/render.mjs','prototype/index.html'],'All prepared inner graphs parse and match shared projection; whole-site requirement remains incomplete because frozen homepage graph absent.');
set('L2 L3','PASS',['qa/knowledge-v1/verification.json','prototype/guides/android-permissions/index.html'],'Visible/schema breadcrumb and organization/profile agree. No invented Product/Offer/Review/AggregateRating entity or rich-result promise.');
set('M1 M2 M3','PASS',['knowledge/verify.mjs','qa/knowledge-v1/verification.json','tests/niche-links.test.mjs (sibling core)'],'Real target IDs, meaningful anchors and existing fragments checked. Adapter corrected to feed root paths to shared contextualParts then emit relative URLs. Future/revoked projection hides targets. Whole-site authoritative cutover remains P1.');
set('N1','PASS',['knowledge/RESEARCH.md','knowledge/content.mjs'],'Current primary Android/Google sources opened; retrieval dates and specific claim scope retained. No endorsement implication.');
set('N2','PASS',['knowledge/package/content-package.json','tests/niche-links.test.mjs (sibling core)'],'No owned-network links exported by this site. Shared eligibility negatives retained; no unpublished partner domains introduced.');
set('N3','PASS',['qa/knowledge-v1/verification.json','qa/knowledge-v1/lighthouse-permissions-final.json'],'Source/prose/related links actually rendered. Inline prose and byline links underlined; no sponsored or user-submitted link relation is applicable to these authored sources.');
set('O1','FAIL',['core-preview.test.mjs','prototype/robots.txt','prototype/sitemap.xml','prototype/index.html'],'Private slash/query behavior and intended prepared URLs tested. Canonical completeness fails on frozen homepage; real-host coherence not established.');
set('O2','PASS',['knowledge/verify.mjs','qa/knowledge-v1/verification.json','core-preview.test.mjs'],'14 eligible prepared URLs only; future/revoked/auth excluded. Real loopback/Host/hash guards, not robots alone. Meaningful reviewed revision timestamps retained.');
set('P1','FAIL',['knowledge/render.mjs','knowledge/projection.json','prototype/manifest.json'],'New6 guide/editorial HTML and inner metadata use one shared projection. Older frozen homepage and static commercial/auth surfaces still travel in a private attested snapshot; full public HTML cutover has not happened.');
set('P2 P3','PASS',['qa/knowledge-v1/verification.json','core-preview.test.mjs','knowledge/prepare.mjs','qa/knowledge-v1/core-regression-http.json'],'Approval mutation/future/revocation, private Host/files and manifest isolation tested. Actual core shadow importer validated14pages20assets; no live host or registry activation. Nine incumbents unchanged.');
set('Q1','FAIL',['prototype/llms.txt','prototype/llms-full.txt','knowledge/projection.json'],'Prepared English exports are consistent with reviewed package, but no active PhoneBridger public projection exists. Public publication scope/dates and whole-site authority remain incomplete.');
set('Q2 Q3','PASS',['knowledge/content.mjs','knowledge/RESEARCH.md','knowledge/render.mjs'],'Useful qualified answers in semantic HTML with primary citations; no model-only claims. llms.txt is optional supplementary output, not an AI ranking requirement or guarantee.');
set('R1','PASS',['qa/knowledge-v1/browser-checks.json','qa/knowledge-v1/interactions-final.json','VERIFY.md'],'Actual guide TOC/details, navigation menu/Escape, skip anchor and visible focus exercised; earlier local form/session state checks retained separately.');
set('R2 R3','FAIL',['qa/knowledge-v1/lighthouse-homepage-frozen.json','qa/knowledge-v1/performance-summary.json'],'New hub/permission Lighthouse accessibility100 is not conformance. Frozen homepage has prohibited aria-label and visible/accessibility-name mismatch; actual200% browser zoom/OS reduced-motion behavior not exercised.');
set('S1','PASS',['qa/knowledge-v1/browser-checks.json','qa/knowledge-v1/finish-review.md'],'Sixnew routes at1280/390/320/768; all actual images loaded/no overflow. Tablet composition repaired and fresh scored ship; reading captures individually inspected.');
set('S2','UNVERIFIED',['qa/knowledge-v1/browser-checks.json'],'Narrow reading/TOC/figure/source/footer checked, but actual enlarged text/200% zoom is not available through current IAB controls. Narrowing viewport is not substituted for zoom.');
set('S3','PASS',['qa/knowledge-v1/browser-checks.json'],'Browser viewport evidence labelled browser evidence, not physical Android/device/Pointer Lock proof.');
set('T1','FAIL',['qa/knowledge-v1/performance-summary.json'],'Actual local production-media mobile Lighthouse: guide hub96, permissions97, frozen homepage62 (threshold>=90 unmet). No live production measurement. Homepage LCP15.33s/TBT106ms; preserve freeze and retain failure.');
set('T2','PASS',['knowledge/image-ledger.json','qa/knowledge-v1/performance-summary.json'],'Default mobile Lighthouse13.5.0 and timestamps saved. Guide LCP2.64/2.41s, CLS0.00021/0.01053, TBT0. 20 small WebP variants, srcsets/sizes/dimensions/lazy lower images and prioritizedhero. Homepage optimization is a separately authorized repair dependency.');
set('U1','FAIL',['PAGES.md','prototype/contact/index.html'],'Mailto draft does not create durable D1 inquiry or prove core-failure recovery. Existing shared contact capability is not wired into this private site.');
set('U2 U3','UNVERIFIED',['PAGES.md'],'No real SMTP acceptance or matching marked Message-ID INBOX receipt tested for PhoneBridger. No customer messages sent. Missing evidence is notNA.');
set('V1','FAIL',['prototype/assets/site-pages-v1/site.js','PAGES.md'],'No per-site bot/DNT/GPC/test-filtered inquiry counters wired. Saved choice/browser clicks are not received inquiries or demand.');
set('V2','PASS',['prototype/privacy/index.html','PAGES.md'],'Current private website cookie/local-storage/account/email-draft facts disclosed, no active analytics/marketing provider implied. Production data processors still need W2/W3.');
set('W1 W2','UNVERIFIED',['prototype/privacy/index.html','prototype/terms/index.html'],'Preview inventory/limits present, but current legal requirements, actual seller identifiers, processors/transfers, retention/deletion and production basis not independently established. Do not infer compliance.');
set('W4','PASS',['prototype/privacy/index.html','prototype/assets/site-pages-v1/site.js'],'No enabled nonessential cookies/marketing, no blanket marketing consent or fake cookie banner. Necessary local session is separate.');
set('X1','PASS',['core-preview.test.mjs','qa/knowledge-v1/verification.json','qa/knowledge-v1/staged-safety.json'],'Actual staged-blobs scan across scoped companion files passes with exact local-secret comparisons; public-core/rules staged scans also pass. Runtime tenant/payload/private-file guards tested. No arbitrary-data absence guarantee.');
set('X2','PASS',['PAGES.md','core-preview.test.mjs','qa/knowledge-v1/lighthouse-homepage-frozen.json'],'Error/optional core/account boundaries and remaining recovery/spam/mail gaps explicitly recorded. Existing console failure retained under freeze, not hidden by score.');
set('Y1 Y2','PASS',['qa/knowledge-v1/core-regression-http.json','qa/knowledge-v1/core-checks.json','CORE_FEEDBACK.md'],'Pure SEO/localized schema fix in shared core;52tests,tsc/scopedESLint/build and all9real local Worker smoke checks pass.45fixed-clock incumbent outputs byte identical. No package or nativeinput changes.');
set('Y3','PASS',['README.md','knowledge/README.md','../../START_HERE.md','../../AGENTS.md'],'Existing project entrypoints lead to current module/audit/core-feedback; new knowledge README links maintained contract and exact build dependencies.');
set('Z1 Z2','PASS',['PHASE-1-AUDIT.json','PHASE-1-AUDIT.md','qa/knowledge-v1/finish-review.md','qa/knowledge-v1/performance-summary.json'],'All85criteria retained and scored by maintained scorer. Original failed reports/review and repairs preserved. Local/launch NOTREADY, demandUNMEASURED; no10/10 claim.');
const pkg=await readFile(path.join(dir,'knowledge/package/content-package.json'));
const manifest=await readFile(path.join(dir,'prototype/manifest.json'));
const gitHead=cwd=>execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim();
const audit={siteId:'phonebridger',canonicalHost:'phonebridger.com',phase:1,evaluatedAt:new Date().toISOString(),evaluator:'Codex agent; not independent human or legal certification',environment:{source:'127.0.0.1:4177',privateCore:'127.0.0.1:4187',regressionWorker:'127.0.0.1:8789',lighthouse:'13.5.0 default mobile',publicDeployment:false},version:{companionParent:gitHead(project),coreParent:gitHead(path.resolve(project,'../dovanos-memorycasting')),packageSha256:createHash('sha256').update(pkg).digest('hex'),manifestSha256:createHash('sha256').update(manifest).digest('hex')},verdict:{local:'NOT READY',launch:'NOT READY',demand:'UNMEASURED',visual:'Guide review repairs scored ship; production/runtime readiness separate'},checks:catalog.map(c=>({...c,...(decisions[c.id]||{status:'UNVERIFIED',evidence:[],notes:c.stage==='operations'?'No production observations, qualified demand or operational interval exist.':'Actual public deployment/bindings/domain/legal/delivery/inspection evidence not available; local preparation cannot certify this gate.'})}))};
const scores=scoreAudit(audit,catalog);
audit.scores=scores;
await writeFile(path.join(dir,'PHASE-1-AUDIT.json'),JSON.stringify(audit,null,2)+'\n');
const preamble=`# PhoneBridger — whole-site A–Z audit, 6 October 2026

**Local NOT READY · launch NOT READY · demand UNMEASURED.** This is an actual agent audit of the prepared private site, not a certification or public launch. The attractive page design and local account tests do not close content, operational or production gates.

## Baseline and repairs

The owner's follow-up identified omitted guides/search/LLM work after an earlier multipage completion claim. Four individually reviewed guides, a hub and editorial page now exist. Actual Studio approval/export and shared projection/media/schema/SEO helpers prepare14eligible pages/20images; auth is excluded. Core importer ran in shadow mode only. A section contract was documented for this inherited Read extension; no invented new-world seed or guide quota is applied beyond the active network contract.

Fresh visual review found the768px hub's empty featured column and thumbnail strips, plus redundant uppercase category labels. They were repaired in one batch and scored ship from four recaptures. A code-only TOC offset finding was withdrawn after inspecting inherited105px scroll padding. Original review and failed Lighthouse runs remain. Actual Lighthouse identified inline links relying only on color; underlines fixed hub/accessibility95→100 and permissions96→100. A separate actual-browser check caught relative URLs being rejected by the shared root-path-only inline-link helper; the adapter now feeds safe root paths and emits relative links, with a contextual-prose regression check and actual re-reviewed Studio alias revision.

## Measured evidence

Seventeen inner routes,313served manifest files and7private verification files; total snapshot80,990,913bytes.286same-origin link checks;20responsive guide images; future/revoked/auth exclusions; unreviewed mutation rejection; actual loopback/private-host denial and account cycle. All471saved pre-existing file hashes plus homepage outside footer unchanged (472baseline entries). No native mouse/app/build/release/configuration changes.

Lighthouse13.5.0 default mobile on exact private preview media: hub96performance/100accessibility, permission guide97/100, frozen homepage62/96. Final guide LCP2.64/2.57s andTBT0. Homepage LCP15.33s,TBT106ms; actual app.js null addEventListener exception and ARIA/name issues retained under the user's freeze. Local Lighthouse is not field performance or WCAG conformance. Actual200%browser zoom and OS reduced-motion checks remain unverified.

All52core tests and13account/integration tests pass. TypeScript, scopedESLint and actual production build pass with existing framework/chunk warnings. All9existing niches pass actual local productionWorker HTTP smoke;45fixed-clock SEO outputs remain byte identical. No PhoneBridger active package/host/public deployment is admitted.

## Remaining concrete gates

- Frozen homepage: metadata/schema, script error, accessibility and measured performance require a separately authorized repair. The protected surface was not silently edited.
- Full public projection: cut over older static commercial/home content through the active shared authoring/publication process; reconcile real first-publication dates before admission.
- Domain/operator/hosting/legal: domain ownership/history retrieval, DNS/TLS, seller identity, processing/retention/terms and actual deployment facts remain unavailable.
- Business outcome: wire existing shared durable inquiry service, prove notification plus matching markedINBOX receipt, enable truthful per-site measurement. Current contact opens only an email draft. No fake sent state or demand.
- Hosted accounts/recovery, licence/payment/stock/fulfilment remain separate integration dependencies; creator remains deferred.

## Scores from the maintained scorer

${Object.entries(scores.stages).map(([k,v])=>`- ${k}: ${v.passed}/${v.applicable} applicable, ${v.score}/10; gateReady=${v.gateReady}. Blockers: ${v.blockers.join(', ')||'none'}.`).join('\n')}

The score is deliberately not a polished-design rating. Missing access is notNA. C3 alone isNA because no legacy redirect is implemented, not because retrieval failed. Open PRs are review availability, not merged adoption.

## A–Z evidence

`;
await writeFile(path.join(dir,'PHASE-1-AUDIT.md'),preamble+audit.checks.map(c=>`### ${c.id} · ${c.status} · ${c.stage}${c.gate?' gate':''}\n\n${c.criterion}\n\n${c.notes}\n\nEvidence: ${c.evidence.length?c.evidence.map(x=>'`'+x+'`').join(', '):'not available'}.\n`).join('\n'));
console.log(JSON.stringify({criteria:audit.checks.length,stages:scores.stages}));
