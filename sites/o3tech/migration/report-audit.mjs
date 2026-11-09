import{readFile,writeFile}from'node:fs/promises';import path from'node:path';
const root=path.resolve(process.env.O3TECH_MIGRATION_ROOT||path.resolve(import.meta.dirname,'../../../..')),dir=path.join(root,'core/sites/o3tech');
const file=path.join(dir,'PHASE-1-AUDIT.json'),audit=JSON.parse(await readFile(file,'utf8'));
audit.evaluatedAt=new Date().toISOString();audit.evaluator='Codex; scoped preservation migration / local draft preparation';
audit.environment={host:'127.0.0.1:4783',stage:'unapproved-local-preview',os:'Windows',browser:'Playwright Chromium; desktop1440, mobile390 and320',mail:'disabled',storage:'local isolated SQLite binding for native lead route'};
audit.version={sourceVersion:'codex/o3tech-migration-20261029; CORE25292e20/PUBLICc2d9a1fa bases',packageSha256:null,reason:'No approved package exists; cannot run bound approved-package completion verifier.'};
audit.verdict={local:'PREVIEW_IMPLEMENTED_NOT_RELEASE_READY',launch:'NOT_AUTHORIZED_NOT_DEPLOYED',demand:'UNMEASURED',visual:'Original identity retained; scoped desktop/mobile inspection and bounded repairs completed.'};
const pass={
 A1:['sites/o3tech/BUSINESS.md','Catalogue and rental enquiry retained; no commerce or demand fiction.'],
 B2:['sites/o3tech.md','Owner explicitly preserves this same-business identity/contacts; no borrowed identity or invented reviews added.'],
 C1:['sites/o3tech/history/REPORT.md','Actual bounded archive run, incomplete content-CDX request and readable2022/2025 samples recorded.'],
 C2:['sites/o3tech/history/url-decisions.json','Live useful paths preserved; cart/account/checkout/sample removed; no blanket redirects.'],
 D3:['sites/o3tech/TOOLS.md','No current demand/visibility metric invented; expired Treg connection and zero paid calls documented.'],
 E2:['sites/o3tech/DESIGN.md','Incumbent tokens/roles/composition and source baseline recorded; catalogue/footer corrections confirmed.'],
 E3:['private/assets-map.json','38same-owner existing raster families imported through native pipeline with original SHA/source/rights; no generated projects or reviews.'],
 F1:['private/preview-checks.json','All23keptdraft paths and43internalURLs/fragments return actual200; product/category relationship preserved from live listing.'],
 F3:['sites/o3tech/history/url-decisions.json','Retained existing distinct product/category/information roles; no new doorway variants.'],
 G1:['private/desktop-final.png','Original ozone-equipment identity and existing enquiry routes retained.'],
 H4:['private/preview-checks.json','All392importedtextblocks/listitems present in actual HTML; long policy93blocks and information diagrams preserved.'],
 H5:['private/assets-map.json','Existing topical/product/category imagery retained; legal pages without original imagery stay text-focused. No new guides in this preservation brief.'],
 J2:['sites/o3tech/CONTENT_READINESS.md','No human/expert approval asserted;23native drafts remain unapproved.'],
 L3:['components/niche/o3tech-site.tsx','Uses shared schema after native projection; no Offer/rating/inventory/product-sales schema invented.'],
 Q3:['sites/o3tech.md','No llms/indexing/AI-citation/traffic guarantee.'],
 S3:['private/preview-checks.json','Desktop/mobile evidence is labelled browser viewport testing; physical devices/browser zoom not claimed.'],
 T2:['private/lighthouse-mobile.json','Actual private draft mobile lab99performance; FCP0.8s,LCP2.2s,TBT48ms,CLS0.00038,272373transferredbytes. No dummy media.'],
 X1:['private/preview-checks.json','Noindex loopback-only draft server, foreignHost421, no discovery exports; raw/model/leads outsideGit and public package.'],
 Z2:['sites/o3tech/CONTENT_READINESS.md','Explicitly no release-ready/domain-ready/10of10 claim; catalogue and content/privacy gates remain.']
};
const fail={H2:'Unreviewed original absolute ozone/health/safety claims retained privately; source ownership is not claim validation.',W1:'Existing legal pages describe online sales/cart/payment although owner removes ecommerce.',W2:'Existing cookie/ecommerce material does not yet document the new native enquiry data/storage/delivery lifecycle.'};
const na={D1:'Owner explicitly requires preserving this existing site, not a new identity/business concept; incumbent desktop source and screenshots replace competitor-concept selection.',H1:'No new article/guide batch commissioned; all existing information pages are migrated. Three new guides would expand the preservation brief.',C3:'No legacy301redirect implemented; removed utilities remain404 in private preview.'};
for(const c of audit.checks){
 if(pass[c.id]){c.status='PASS';c.evidence=[pass[c.id][0]];c.notes=pass[c.id][1];}
 else if(fail[c.id]){c.status='FAIL';c.evidence=['sites/o3tech/CONTENT_READINESS.md'];c.notes=fail[c.id];}
 else if(na[c.id]){c.status='NA';c.evidence=['sites/o3tech.md'];c.notes=na[c.id];}
 else{c.status='UNVERIFIED';c.evidence=['sites/o3tech/CONTENT_READINESS.md'];c.notes='No approved public package/deployment exists. Draft/source checks do not certify this full criterion. Production SEO/time/revocation, operator notification/INBOX, current facts/privacy, actual200%browser zoom, live operations and demand remain distinct where relevant.';}
}
await writeFile(file,JSON.stringify(audit,null,2)+'\n');
let md='# o3tech.lt · scoped migration acceptance\n\nLocal draft preview implemented. Not approved/released/deployed and not a complete phase-one/domain-ready acceptance.\n\n';
md+='23preservedpaths;11products;5categories;38originalassetfamilies. Actual source, block/link/asset/form checks, screenshots and Lighthouse are in the private migration workspace. Native75and public299regressions passed; final type/build status is recorded in HANDOFF. No paid data or real email used.\n\n';
md+='Baseline repairs: restored category images without Elementor reveal JS, preserved incomplete WooStore category memberships from actual listings, retained phone/preference through native durable form message, removed unrelated products from narrow category recommendations, corrected320pxfooter overflow and mobile utility heading size.\n\n';
md+='The6navigation-onlyindices now pass exact structural admission after owner authorization; no new prose was added. Open gates:retained claims/prices/legal text require review; ownerapproval/release/publication missing; realD1/mail/INBOX/abuse/measurement/DNS and approved-package HTTP verifier not performed. Actual browser200%zoom remains UNVERIFIED;320pxreflow and simultaneous text-spacing overrides were exercised.\n\n';
for(const c of audit.checks)md+=`- **${c.id} · ${c.status} · ${c.stage}** — ${c.criterion}\n\n  ${c.notes} Evidence: ${c.evidence.join(', ')}.\n\n`;
await writeFile(path.join(dir,'PHASE-1-AUDIT.md'),md.trimEnd()+'\n');console.log('Scoped audit retained all85criteria with literal unresolved gates.');
