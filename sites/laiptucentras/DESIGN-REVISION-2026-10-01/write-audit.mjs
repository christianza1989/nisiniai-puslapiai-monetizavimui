import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catalogFromMarkdown,scoreAudit} from '../../../SKILLS/niche-site-audit/scripts/score-audit.mjs';
const root='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui';
const rev=import.meta.dirname,site=path.dirname(rev),parent=path.join(root,'research/autonomy/laiptucentras-review');
const version=JSON.parse(await fs.readFile(path.join(rev,'VERSION-CHECK.json'),'utf8'));
if(!version.passed||!version.pages.every(p=>p.bodyUnchanged&&p.titleUnchanged&&p.publishAtUnchanged))throw Error('Inspect source drift before audit evidence reuse');
const prior=JSON.parse(await fs.readFile(path.join(parent,'PARENT-AUDIT.json'),'utf8'));
const catalog=catalogFromMarkdown(await fs.readFile(path.join(root,'SKILLS/niche-site-audit/references/checklist.md'),'utf8'));
const affected=new Set(['D1','E1','E2','E3','F1','F2','H1','H2','H3','H4','H5','J1','J2','J3','K1','K2','K3','L1','L2','L3','M1','M2','M3','N1','N3','O1','O2','P1','P2','P3','Q1','Q2','Q3','R1','R3','S1','S3','T1','T2','W4','Y1','Y2','Y3','Z1','Z2']);
const hash=b=>createHash('sha256').update(b).digest('hex');
const reusedBackend=['lib/niche-mail.ts','lib/smtp-protocol.mjs','app/niche/[siteId]/lead/route.ts','lib/niche-schema-core.mjs'];
for(const file of reusedBackend)if(!version.sourceChecks.find(r=>r.file===file)?.unchanged)throw Error(`Prior backend evidence invalidated: ${file}`);
const luminance=hex=>{let full=hex.replace('#','');if(full.length===3)full=[...full].map(x=>x+x).join('');const c=full.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
const contrast=(a,b)=>{const [l,h]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (h+.05)/(l+.05);};
const contrastRows=[['text','#203140','#f5f6f3',4.5],['muted','#4e606c','#f5f6f3',4.5],['inverse','#fff','#203140',4.5],['focus','#527d97','#f5f6f3',3]].map(([role,fg,bg,min])=>({role,fg,bg,ratio:contrast(fg,bg),min,pass:contrast(fg,bg)>=min}));
if(!contrastRows.every(r=>r.pass))throw Error('Actual palette contrast gap');
await fs.writeFile(path.join(rev,'CONTRAST.json'),JSON.stringify({method:'WCAG relative luminance for actual CSS palette; browser computed shell/header #f5f6f3 and no body filter verified. Not a complete WCAG certification.',contrastRows},null,2));
const checks=catalog.map(c=>{const old=prior.checks.find(p=>p.id===c.id);if(!old)throw Error('Missing prior same-site criterion');const check={...c,status:old.status,evidence:old.evidence.map(e=>path.resolve(parent,e)),notes:old.notes};
 if(check.status==='PASS'){
  check.evidence.push(path.join(rev,'VERSION-CHECK.json'));
  check.notes+=' Reuse is scoped to the same domain: all eleven prose bodies, titles and publishAt plus relevant backend hashes remain unchanged. No new SMTP/INBOX receipt or demand is claimed.';
 }
 if(affected.has(c.id)&&check.status==='PASS'){
  check.evidence.push(path.join(rev,'html-final.json'),path.join(rev,'BROWSER-FINAL.json'),path.join(rev,'BROWSER-ADDITIONAL.json'),path.join(rev,'QA.md'));
  check.notes='Current root redesign independently inspected: 11 real public URLs, all three initial guides, matching illustrations/srcset, truthful contacts/action, internal/external source links, schemas and native controls. Relevant details and limitations in revision QA; historical first-result judgment is preserved separately.';
 }
 if(c.id.startsWith('E')&&check.status==='PASS'){check.evidence.push(path.join(rev,'DIRECTION.md'),path.join(rev,'CRAFT-REVIEW.json'),path.join(rev,'home-desktop-crop-final.jpg'),path.join(rev,'home-mobile-crop-final.jpg'));check.notes='Substantive departure from the nearest auksarankiams composition: image-led architectural/navy hero, sans display, component rows, useful quote-scope tool, editorial guide rows, distinct material/unfinished-space imagery and own stair mark. This is later root repair, not the autonomous first result.';}
 if(c.id.startsWith('H')&&check.status==='PASS')check.evidence.push(path.join(rev,'MEDIA.json'),path.join(rev,'EDITORIAL-MEDIA-REVIEW.json'));
 if(c.id==='R1')check.evidence.push(path.join(rev,'CONTRAST.json'));
 if(c.id==='R2'||c.id==='S2'){check.status='UNVERIFIED';check.evidence=[path.join(rev,'BROWSER-FINAL.json'),path.join(rev,'BROWSER-ADDITIONAL.json')];check.notes='Actual 320/390/768/1440 viewport evidence does not prove browser/text enlargement to 200%. Supported Browser API does not establish actual browser zoom; no unsupported shortcut or DPR inference used as PASS.';}
 if(c.id==='T1'||c.id==='T2'){check.evidence.push(path.join(rev,'performance-summary.json'));check.notes='One mobile Lighthouse run per URL on the real isolated production renderer with images: home 91/100/100/100; price guide 93/100/100/100. CLS0, LCP3.1/2.9s. Measured before later favicon-only Worker precedence fix; renderer/CSS/package bytes unchanged. No production field CWV claim.';}
 if(c.id==='Y2'){check.evidence.push(path.join(rev,'SEO-SMOKE.json'),path.join(rev,'core-tests-post-favicon.log'));check.notes='Shared favicon precedence repair confirmed via actual HTTP for six isolated packages, both favicon URLs, unknown/mismatched host. 24 core tests passed. Seventh miniekskavatoriai was concurrently added by its owner; root does not claim its runtime tested. Its one added dispatch line is documented, remaining laipt branch/guards unchanged.';}
 return check;});
const audit={siteId:'laiptucentras',canonicalHost:'laiptucentras.lt',phase:1,evaluatedAt:new Date().toISOString(),evaluator:'Root later redesign acceptance, version-scoped same-domain evidence reuse; not independent human design rating or first-result score',environment:{preview:'http://127.0.0.1:8899/',runtime:'isolated production Worker8866, read-only canonical-host bridge8899',smtpEnabled:false,voiceEnabled:false,productionDeployed:false,newLeadPosts:0,newEmails:0},version:{packageSha256:version.packageSha256,sourceCheck:'DESIGN-REVISION-2026-10-01/VERSION-CHECK.json',baseline:'DESIGN-REVISION-2026-10-01/BASELINE.json'},verdict:{local:'NOT READY: R2/S2 UNVERIFIED',launch:'NOT READY',demand:'NOT MEASURED',visual:'Later repaired candidate; subjective craft separate'},checks};
const score=scoreAudit(audit,catalog);
const evidencePaths=new Set(checks.flatMap(c=>c.evidence));for(const p of evidencePaths){if(/^https?:/.test(p))continue;await fs.access(p);}
await fs.writeFile(path.join(rev,'PHASE-1-AUDIT.json'),JSON.stringify(audit,null,2));await fs.writeFile(path.join(rev,'AUDIT-SCORE.json'),JSON.stringify(score,null,2));
let md=`# Dabartinės laiptų svetainės pirmos fazės auditas\n\n${audit.evaluatedAt}. Tai vėlesnė root pataisa; originalus autonominis pirmas rezultatas ir parent7,85/9,71 vertinimas neperrašyti. [QA](${rev.replaceAll('\\','/')}/QA.md), [versija](${rev.replaceAll('\\','/')}/VERSION-CHECK.json), [craft](${rev.replaceAll('\\','/')}/CRAFT-REVIEW.json).\n\nLocal ${score.stages.local.passed}/${score.stages.local.applicable} = ${score.stages.local.score}/10, launch ${score.stages.launch.score}/10, operations ${score.stages.operations.score}/10. Kritiniai R2/S2 lieka UNVERIFIED, todėl nevadinama local-ready, 10/10 ar domain-ready. Nėra tikros paklausos duomenų.\n\nP0/P1 runtime favicon klaida pataisyta, actual6host testai PASS. P2 mobilus TOC sutrumpintas, nauji vaizdai / skaitiniai ir sąmatos įrankis priimti. P1 realūs production/DNS/pašto/duomenų valdymo faktai dar nepatvirtinti. 200% didinimas neįrodytas.\n\nBūsenos perimamos tik iš to paties domeno patikrintų nepakitusių faktų, turinio ir backend versijų. Pakeistų vizualų / HTML / SEO / publikavimo patikra nauja. Visa eiga VERSION-CHECK/QA; istorinės pašto ir D1 priėmimo ribos paliktos.\n\n`;
for(const c of checks)md+=`- [${c.status==='PASS'?'x':' '}] **${c.id} · ${c.status} · ${c.stage}** — ${c.criterion}\n\n  ${c.notes}\n\n  Įrodymai: ${c.evidence.map(e=>`[${path.basename(e)}](${e.replaceAll('\\','/')})`).join(', ')}.\n\n`;
await fs.writeFile(path.join(rev,'PHASE-1-AUDIT.md'),md);
for(const name of ['PHASE-1-AUDIT.json','PHASE-1-AUDIT.md','AUDIT-SCORE.json']){const dest=path.join(site,name);try{await fs.copyFile(dest,path.join(rev,'baseline',name),fs.constants.COPYFILE_EXCL);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}await fs.copyFile(path.join(rev,name),dest);}
console.log(JSON.stringify({criteria:checks.length,stages:score.stages,packageSha256:version.packageSha256,evidenceFilesChecked:evidencePaths.size}));
