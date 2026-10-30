# Promedical inquiry restoration — 2026-10-30

Issue310; branches codex/promedical-inquiry-20261030. Current main bases Core25292e20 / publicc2d9a1fa. Current live version909b4e7e and source snapshot output/promedical-tx001-20261027/public-build are the deployment baseline. Preserve current approved content/PR80 and private drafts; pending inline-editor PR106 is excluded.

- [x] Locate removed inquiry client, existing validated lead endpoint and exact current live source.
- [x] Restore product-detail add/quantity control and header basket count/link.
- [x] Add existing form and selected products above homepage footer and on contacts.
- [x] Verify add/edit/remove/persistence and real isolated submission/validation without email.
- [x] Inspect desktop/mobile, typography, focus and long selection states.
- [x] Build only the six-file overlay on the exact current-live source, with packages/settings/admin unchanged.
- [x] Verify a candidate and release with scoped rollback; do not write production test leads.

Presentation: inherit1440 white/gray/red, Roboto, existing body1rem/label.9375rem, natural tracking and1.5–1.6 leading. Gray form section uses two columns (contact details +existing form), one below 740px. Inputs remain at least1rem, visible labels and red focus. Existing approved form/help/consent copy reused; no new medical or marketing prose. Basket is an inquiry, no purchase/price/checkout promises. Read actual desktop/narrow and validation/success states before acceptance; record zoom limits honestly.


## Verified completion

Live version:81ff5dd7-5fa4-49cb-89a9-fd25781b094d at100%; deployment07ab2735-c498-4d0d-96a9-014f6881dc13. Rollback:909b4e7e-0eb1-4bfb-98d3-47fbc7bb6cbf. PUBLIC source073cf23c84bc7876c74fc6000650519e983b816c; PR107 remains separate from main adoption. Normal framework build completed; all ten approved packages match both source baseline and the built AST registry. Five presentation files plus only the Promedical notification recipient changed in the deployed snapshot. Component modules semantically match committed source; a lint directive and JSON formatting differ without runtime changes. No compiled bundle patch.

Focused catalogue/alias/render tests6/6 and real lead route/SQLite/isolated mail-binding test1/1 pass. Shipping source TypeScript, scoped lint and detector pass. Fresh-main whole-project typecheck with reused deployed dependencies reports a missing unrelated embla-carousel-auto-scroll dependency; it is not claimed as a whole-main PASS. The actual shipping checkout has no type errors.

Actual compiled Worker on8933: product add, two distinct products, quantity2→3, reload persistence, removing the second model, and form submission to isolated D1 all pass. The stored message contains only NEREZ1101 with3units and the local test note. No actual outgoing email or production test lead. Desktop1440 and mobile390/320 are readable without horizontal overflow. Live keyboard name→email→message and visible focus checked. Native200% zoom and custom text-spacing overrides remain UNVERIFIED, not a WCAG certification.

Earlier runtime starts failed while8919 was occupied by a foreign review server; it was left untouched. The8933 Worker succeeds after initializing its deliberately separate schema and paused settings. The attempted isolated component-only preview never ran and is not acceptance evidence. Wrapper/CLI parsing and canonical Host test corrections are retained in private logs.

Cloudflare candidate0% and live100% each pass15 routes and101 resources. Sitemap, robots, llms, llms-full and admin static files match the previous version exactly. All bindings/secrets, compatibility and limits are retained. No public login link. Final D1 counts remain20drafts/20history/9leads; original guide pause and pending inline-editor PR106 preserved.

Notification routing gap: displayed sales@azprekyba.lt differed from the existing send_email allowed destination info@promedical.lt. Only mailRecipientsBySite.promedical is now pinned to that already-configured mailbox, retaining the visitor Reply-To and sender uzklausos@promedical.lt. The visible sales contact is unchanged. Actual inbox receipt has not been tested; the real route with an isolated binding verifies recipient selection and durable retention after send failure. Current official API reference: https://developers.cloudflare.com/email-service/api/send-emails/workers-api/.

Final evidence: D:/Core/output/promedical-inquiry-20261030/FINAL.json, build-verification.json, browser-verification.json, local-http.json, candidate-http.json, live-http.json and live-form.png. Own local test server8933 stopped and viewport reset; live homepage tab retained for owner review. No foreign process, draft, channel or file changed.

## Owner rejection and rollback — supersedes the earlier completion status

2026-10-30 15:02 UTC: Rokas rejected the published form/basket and explicitly instructed immediate removal from the live site and further work in local test environment only. Restored exact prior Worker909b4e7e-0eb1-4bfb-98d3-47fbc7bb6cbf at100%. Homepage, contacts and Mayo product return200 with the new form and basket absent. No D1 write, content restore, DNS or credential operation. Receipt D:/Core/output/promedical-inquiry-20261030/OWNER_ROLLBACK.json. The previous deployment/acceptance section is historical, not current release authority.

Current status: LOCAL REVIEW ONLY; do not redeploy81ff5dd7, merge/adopt this design, or publish further changes without a new explicit owner approval after preview. Preserve all source and evidence for local revision. Local candidate uses isolated DB and disabled mail at http://127.0.0.1:8933/. PR107 is on hold; code tests did not constitute owner design approval.

## Local style refinement — 2026-10-30

Owner requests matching homepage typography and joining the footer directly to the form at identical width. LOCAL ONLY. No live deployment, new copy, endpoint or data change.

- [x] Inventory current styles and actual computed baseline: Roboto present, but inputs inherit500 weight; nested form30px padding shrinks fields; form/footer separated82px; footer pseudo-element bleeds beyond matching boxes.
- [x] Use existing section-heading scale24–32px/700, responsive secondary headings18–21px/600, body/input16px/400, labels15px/500, help14px/400, buttons15px/500; line-height1.5–1.6 and normal tracking.
- [x] Remove nested form panel/padding; retain responsive white fields and red actions, recolor contact links to homepage ink/red.
- [x] Join section and footer with shared width/gutters/background and no gap or pseudo-element bleed. Stack contact area below1000px; validate1440/768/390/320.
- [x] Inspect real local desktop/mobile and focus; preserve basket/form behavior. Native zoom/text-spacing limits stay explicit.

Local iteration uses a loopback-only style gateway over the unchanged compiled isolated Worker. It injects the exact source CSS, with no compiled bundle mutation or remote resource. The source imports that same stylesheet for the later normal build after owner approval. Production version909b4e7e remains the accepted live baseline.

Local result: http://127.0.0.1:8935/#uzklausa. Exact source stylesheet is imported by the homepage; existing conflicting contact rules removed. Desktop/tablet/mobile width checks1440/768/390/320: identical form/footer edges, zero join gap, no horizontal document overflow, footer bleed disabled. Inputs computed16px/400; focus email solid3px after keyboard Tab. Visible contact sales@azprekyba.lt retained. CSS parser0warnings; scoped ESLintPASS; Impeccable detector0findings; git diff--checkPASS. Raw measurements and desktop/mobile screenshots: D:/Core/output/promedical-inquiry-20261030/style-browser-checks.json and style-*.png. Computed family is PromedicalRoboto; browser DOM font-face enumeration is empty, so actual font loading is not asserted from that API. Native200% zoom and custom text spacing remain UNVERIFIED.

Gateway request forwarding maps only its own loopback origin8935 to the isolated upstream8933; other origins retain server rejection. Empty same-origin form submission correctly returns400 instead of403, with no stored lead or email. No production form submission, mail, content write or deploy. Existing full compiled form/basket tests remain historical backend evidence; this CSS iteration has not had another full application build. Source CSS parse and browser proof are the current typography/layout evidence. Full build remains required before a later owner-approved release.

Public source commit: c1fad522d53796d46e0efc2eaf1756e71f6a350b. Core main25292e20219b735df7f04c5807dd4c100f98addc; public mainc2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da. Paired handoff freshnessPASS at2026-10-30T15:14Z. PR107/311 stay draft/on hold. No merge or deployment. Viewport override reset; updated local tab retained as owner deliverable. Current live remains909b4e7e.
## Requested Hostinger sender and all-page footer —2026-10-30

Owner requested kontaktuforma@kontaktuforma.lt → sales@azprekyba.lt, and equal footer widths on every Promedical page. LOCAL ONLY; earlier production hold remains.

- [x] Fetch both mains, inspect canonical mail contract and existing SMTP dispatcher. Preserve other tenants and durable lead retention; no automatic transport retry.
- [x] Locate owner-designated private password file without printing/copying it into source. TLS465 mailbox authentication verified; zero messages in auth check.
- [x] Set only Promedical recipient to sales@azprekyba.lt; SMTP authenticates and sends From exactly kontaktuforma@kontaktuforma.lt, branding Promedical, Reply-To the visitor.
- [x] Share footer width, horizontal padding, responsive gutters and bleed removal across the existing Promedical Chrome; keep homepage form/footer joined. Existing14px footer links/13px legal text retained.
- [x] Normal isolated framework build preserving all ten approved content packages and current assets.
- [x] Actual local Worker form → isolated D1 → authenticated SMTP single labelled test to sales@azprekyba.lt. Distinguish provider acceptance from inbox receipt.
- [x] Browser desktop/mobile checks for homepage, product/catalogue, category and contact/policy footer widths; source guards, relevant mail regressions and handoff.

Historical MAIL_CORE evidence shows a possible deployed-edge TCP restriction to Hostinger. Local SMTP authentication alone is not production Worker qualification. Do not work around TCP restrictions with IP forcing or disabled TLS; no production switch is authorized in this step.


Normal isolated build PASS. Actual compiled registry exactly matches all10 approved baseline packages; recipient sales@azprekyba.lt is present in compiled server. Private SMTP credentials stay only in ignored local runtime configuration; no credential value printed or committed. PUBLIC source5807461703ad0245c69f016d694c9c9e8b1c876f. Current core main25292e20219b735df7f04c5807dd4c100f98addc, public mainc2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da; paired handoff fetchPASS2026-10-30T15:43Z. Exact staged source safetyPASS plus separate exact designated password/base64 absence check; mail regressions5/5PASS; detector0findings.

Actual local Worker8937 + isolated D1 + Hostinger implicit TLS465: a single labelled form submission with NEREZ1101, quantity2, visitor Reply-To sales@azprekyba.lt was accepted. Lead7b3d6dc8-44d3-495c-9b9c-3ce6a40db021 has status notified. Message-ID7b3d6dc8-44d3-495c-9b9c-3ce6a40db021@kontaktuforma.lt; test tag PROMEDICAL-SMTP-343b730a. SMTP250 acceptance is verified; exact sales mailbox receipt remains UNVERIFIED pending owner response. Two narrowly targeted Gmail searches in the connected info@azprekyba.lt account found no match; this does not establish delivery failure at sales. No resend. Receipt SMTP_LOCAL_ACCEPTANCE.json and screenshot smtp-browser-success.png under D:/Core/output/promedical-inquiry-20261030/.

Current local review stays http://127.0.0.1:8935/#uzklausa. Gateway now forwards to the normally compiled8937 Worker, with only exact loopback origin mapping. Previous CSS/HTML injection removed; actual compiled CSS checked separately. Empty fields400, wrong origin403; no additional mail from these rejected requests. Original8933 isolated preview remains mail-disabled and is no longer the gateway upstream. No production change; live909b4e7e and guide pause remain. Future production transport qualification and release still require owner-approved deployment; local acceptance is not deployed-edge qualification.

Footer source uses one shared component/style for public pages. Twelve desktop1440/mobile390 checks across home/catalogue/product/category/contacts/privacy have identical edges and zero horizontal overflow. Separate normal-build confirmation on home/catalogue/contacts at both widths matches the same1281.625px desktop/335px mobile boxes; homepage form/footer seam is zero, pseudo-element bleed absent, no injected stylesheet. Viewport reset; temporary test/audit tabs closed. Stale original tab binding could not be controlled, so a fresh updated local tab was left as deliverable without changing old user-entered values. Final proof footer-compiled-final.png. Native200% zoom/custom text spacing retain previous UNVERIFIED status. PR107/311 stay draft/on hold; no merge, SMTP production activation, DNS or public deployment.


## Owner-confirmed inbox receipt —2026-10-30

Owner replied “Taip, gautuosiuose” to the exact test subject [promedical.lt] Poreikio užklausa7b3d6dc8. The single labelled local Worker→Hostinger message from kontaktuforma@kontaktuforma.lt reached sales@azprekyba.lt Inbox. Receipt is owner-confirmed, not inferred from the connected info mailbox. SMTP_LOCAL_ACCEPTANCE.json and SMTP_FOOTER_REVIEW.json now record LOCAL_DELIVERY_VERIFIED; this supersedes their earlier pending inbox state. No second message sent. This confirms the local runtime delivery only: production remains unchanged and release remains on hold.
