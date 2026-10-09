// Site-specific calendar data; the shared core supplies UTC/DST conversion.
// Historical approved packages are inputs, never edited by this script.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {localPublishAt,localDate} from '../../../content-studio/src/content-schedule.mjs';
const here=new URL('./',import.meta.url), read=f=>JSON.parse(readFileSync(new URL(f,here),'utf8'));
const plan=read('../topical-authority-20261006/PLAN.json');
const priorBytes=readFileSync(new URL('../content-execution-20261007/batch30/release/content-package.json',here));
const priorHash=createHash('sha256').update(priorBytes).digest('hex');
assert.equal(priorHash,'75aa78c1109f046a54ec03354dcf677c2a3af619ce549d5e59cf6ce514f806c4');
const prior=JSON.parse(priorBytes), identity=read('../content-execution-20261007/STUDIO-IDENTITY-MAP.json');
const written=new Map(prior.pages.filter(p=>p.type==='guide').map(p=>[p.slug,p]));
const ids=new Map(identity.pages.map(p=>[p.slug,p.pageId]));
const dateStart='2026-10-13',dateEnd='2027-04-06',zone='Europe/Vilnius';
const dayAfter=d=>new Date(Date.parse(d+'T12:00:00Z')+86400000).toISOString().slice(0,10);
const allSlots=[];
for(let date=dateStart;date<=dateEnd;date=dayAfter(date)){
  const weekday=new Date(date+'T12:00:00Z').getUTCDay();
  for(const time of weekday===0||weekday===6?['10:00']:['10:00','16:00'])allSlots.push({date,time,publishAt:localPublishAt(date,time,zone)});
}
const byId=new Map(plan.pages.map(p=>[p.id,p]));
const seasonal=plan.pages.filter(p=>p.wave==='SEASONAL');
assert.equal(seasonal.length,4);
const pinned=new Map(seasonal.map(p=>[p.id,{date:p.publishDate,time:'10:00',publishAt:localPublishAt(p.publishDate,'10:00',zone)}]));
const reserved=new Set([...pinned.values()].map(s=>s.publishAt));
const free=allSlots.filter(s=>!reserved.has(s.publishAt));
const evergreen=plan.pages.filter(p=>p.wave!=='SEASONAL');
assert.ok(free.length>=evergreen.length);
// Spread the complete scope across the whole horizon, rather than fill early
// days and leave the last month empty. Maximum two slots/day, distinct hours.
const chosen=evergreen.map((_,i)=>free[Math.floor(i*(free.length-1)/(evergreen.length-1))]);
const preparedAncestors=new Set();
for(const p of evergreen.filter(p=>written.has(p.slug))){let q=p;while(q.parentId){preparedAncestors.add(q.parentId);q=byId.get(q.parentId);assert.ok(q);}}
const completed=new Set(plan.retained.map(p=>p.id)),pending=new Map(evergreen.map(p=>[p.id,p]));
const order=[],categoryUse=new Map();
while(pending.size){
  const available=[...pending.values()].filter(p=>!p.parentId||completed.has(p.parentId));
  assert.ok(available.length,'Cyclic or absent parent');
  const priority=p=>written.has(p.slug)||preparedAncestors.has(p.id)?0:!p.parentId?1:Number(p.wave)+1;
  available.sort((a,b)=>priority(a)-priority(b)||(categoryUse.get(a.categoryId)||0)-(categoryUse.get(b.categoryId)||0)||a.id.localeCompare(b.id));
  const p=available[0];order.push(p);pending.delete(p.id);completed.add(p.id);categoryUse.set(p.categoryId,(categoryUse.get(p.categoryId)||0)+1);
}
const assignments=new Map(order.map((p,i)=>[p.id,chosen[i]]));
for(const [id,s]of pinned)assignments.set(id,s);
const entries=[...plan.retained.map(p=>{
  const page=written.get(p.slug);assert.ok(page);assert.equal(page.publishAt,p.publishAt);
  return {planId:p.id,pageId:page.id,slug:p.slug,title:page.title,publishAt:page.publishAt,localDate:localDate(page.publishAt,zone),localTime:new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(page.publishAt)),status:'PUBLISHED',parentId:null,previousPublishAt:page.publishAt};
}),...plan.pages.map(p=>{
  const s=assignments.get(p.id),page=written.get(p.slug);
  return {planId:p.id,pageId:page?.id||ids.get(p.slug),slug:p.slug,title:page?.title||p.title,...s,localDate:s.date,localTime:s.time,status:page?'APPROVED_DEPLOYED_OLD_SCHEDULE':'PLAN_NOT_WRITTEN',parentId:p.parentId,seasonal:p.wave==='SEASONAL',previousPublishAt:page?.publishAt||p.publishAt,reviewLevel:p.reviewLevel,readiness:'Publication still requires actual content, media and revision-bound review; health/legal gates remain.'};
})].sort((a,b)=>Date.parse(a.publishAt)-Date.parse(b.publishAt));
assert.equal(entries.length,295);assert.equal(new Set(entries.map(e=>e.slug)).size,295);assert.ok(entries.every(e=>e.pageId));
const entryById=new Map(entries.map(e=>[e.planId,e]));
for(const e of entries)if(e.parentId)assert.ok(Date.parse(entryById.get(e.parentId).publishAt)<Date.parse(e.publishAt),'Parent must precede support '+e.planId);
const daily=new Map(),weekly=new Map();
for(const e of entries.filter(e=>e.status!=='PUBLISHED')){
  const count=(daily.get(e.localDate)||0)+1;daily.set(e.localDate,count);assert.ok(count<=2);
  const week=Math.floor((Date.parse(e.localDate+'T12:00:00Z')-Date.parse(dateStart+'T12:00:00Z'))/(7*86400000));weekly.set(week,(weekly.get(week)||0)+1);
  assert.ok(e.localDate>=dateStart&&e.localDate<=dateEnd);
}
assert.equal(new Set(entries.filter(e=>e.status!=='PUBLISHED').map(e=>e.publishAt)).size,292);
assert.ok([...weekly.values()].every(n=>n<=12));
const map={format:'madbeauty-publication-calendar/v3',createdAt:'2026-10-09',timezone:zone,start:dateStart,end:dateEnd,scope:295,alreadyPublished:3,preparedGuides:35,scheduledReadyGuides:32,unwrittenGuides:260,policy:{ownerRequestedContinuous:true,maxPerDay:2,weekdayTimes:['10:00','16:00'],weekendTimes:['10:00'],maxPerSevenDays:12,seasonalDatesPreserved:true,claim:'Editorial cadence, not a Google ranking rule'},previousPackageSha256:priorHash,entries,checks:{distinctFutureInstants:292,parentBeforeChild:true,historicalDatesUnchanged:true,datesWithinHorizon:true,seasonalDatesUnchanged:true}};
const revised=structuredClone(plan);revised.updatedAt='2026-10-09';revised.supersedes='2026-10-06 bulk wave dates; scope/research/identity preserved';revised.publicationCalendar='PUBLICATION-CALENDAR.json';revised.execution.calendarStatus='CONTINUOUS_OWNER_REQUESTED_PUBLICATION_PENDING_FOR_CHANGED_READY_GUIDES';revised.completionTarget=dateEnd;revised.completionMeaning='Owner target to publish the entire reviewed 295-guide scope by 2027-04-06; remaining 260 guides still need writing, media, review and release.';revised.publicationPolicy=map.policy;
for(const p of revised.pages){const e=entryById.get(p.id);p.previousResearchWave=p.wave;p.previousPlannedPublishAt=p.publishAt;p.publishAt=e.publishAt;p.publishDate=e.localDate;p.publishLocalTime=e.localTime;p.deliveryStatus=e.status;p.pageId=e.pageId;}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const labels={PUBLISHED:'Jau paskelbtas',APPROVED_DEPLOYED_OLD_SCHEDULE:'Parengtas; nauja data dar diegiama',PLAN_NOT_WRITTEN:'Planas; tekstas dar neparašytas'};
const html=`<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Madbeauty: nuoseklus pusmečio publikavimas</title><style>body{font-family:system-ui,sans-serif;margin:0;background:#f6f4fb;color:#241c36;line-height:1.5}main{max-width:1150px;margin:auto;padding:28px 18px 60px}h1{font-size:clamp(25px,4vw,38px)}.notice{padding:18px;background:white;border-left:5px solid #7040e8}input,select{font:inherit;padding:10px;border:1px solid #b4a8c9;border-radius:6px;margin:0 8px 12px 0}table{width:100%;background:white;border-collapse:collapse}td,th{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #e5ddec}th{background:#ece4fa}a{color:#5c30bd}.date{white-space:nowrap}.scroll{overflow:auto}[hidden]{display:none!important}details{background:white;padding:14px;margin:8px 0}.brief p{margin:8px 0}.note{color:#625472;font-size:14px}</style><main><h1>Nuoseklus pusmečio publikavimo kalendorius</h1><p>2026-10-13–2027-04-06. Visos datos ir valandos Lietuvos laiku (Europe/Vilnius).</p><p class="notice"><strong>295 temos: 3 jau paskelbtos, 32 parengtos ir 260 dar neparašytų.</strong> Darbo dienomis iki 2 straipsnių — 10:00 ir 16:00; savaitgaliais iki 1 — 10:00. Apie 11–12 per savaitę. Ta pati valanda nebekartojama skirtingiems būsimiems straipsniams. Pagrindinis gidas pasirodo prieš jo tęstines temas. Sezoninių temų datos išlaikytos.</p><p id="deployment-note">Šis kalendorius yra naujas patvirtintas planavimo sprendimas. Parengtų tekstų pakeistos datos dar laukia naujo peržiūrėto paketo ir faktinio diegimo. Neparašytos temos savaime nepasirodys; jų parengimas ir patvirtinimas būtinas. Nebaigti įrodymų ar specialisto peržiūros vartai gali nukelti konkrečią temą — data jų neapeina.</p><h2>Visų straipsnių data ir valanda</h2><label>Paieška <input id="q" placeholder="Straipsnio tema"></label><label>Būsena <select id="state"><option value="">Visi 295</option value="PUBLISHED">Paskelbti</option><option value="APPROVED_DEPLOYED_OLD_SCHEDULE">Parengti</option><option value="PLAN_NOT_WRITTEN">Dar neparašyti</option></select></label><p id="count">295 straipsniai</p><div class="scroll"><table><thead><tr><th>Data ir valanda</th><th>Straipsnis</th><th>Parengimas</th></tr></thead><tbody>${entries.map(e=>`<tr data-status="${e.status}" data-title="${escape(e.title.toLowerCase())}"><td class="date">${e.localDate}<br><strong>${e.localTime}</strong></td><td>${escape(e.title)}<br><small>/${e.slug}</small><details><summary>Tema ir rengimo briefas</summary><div class="brief">${byId.has(e.planId)?`<p>${escape(byId.get(e.planId).originalContribution)}</p><ol>${byId.get(e.planId).outline.map(h=>`<li>${escape(h)}</li>`).join('')}</ol><p>Nuorodų ir šaltinių briefas: PLAN.json, ID ${e.planId}.</p>`:'Esamo gido istorinė publikavimo data išlaikyta.'}</div></details></td><td>${labels[e.status]}</td></tr>`).join('\n')}</tbody></table></div><p class="note">Planavimo ritmas nesuteikia Google indeksavimo ar pozicijų garantijos. Istorinis paketas ${priorHash} neperrašytas.</p></main><script>const rows=[...document.querySelectorAll('tbody tr')];function apply(){const q=document.querySelector('#q').value.toLowerCase(),state=document.querySelector('#state').value;let n=0;for(const r of rows){r.hidden=!!((q&&!r.dataset.title.includes(q))||(state&&r.dataset.status!==state));if(!r.hidden)n++}document.querySelector('#count').textContent='Rodoma '+n+' iš 295'}document.querySelector('#q').addEventListener('input',apply);document.querySelector('#state').addEventListener('change',apply);</script></html>`;
mkdirSync(here,{recursive:true});
for(const [file,data]of [['PUBLICATION-CALENDAR.json',map],['PLAN.json',revised]])writeFileSync(new URL(file,here),JSON.stringify(data,null,2)+'\n');
writeFileSync(new URL('MADBEAUTY-NUOSEKLUS-PUSMECIO-PLANAS.html',here),html);
const schedule=entries.filter(e=>e.status==='APPROVED_DEPLOYED_OLD_SCHEDULE').map(e=>({pageId:e.pageId,slug:e.slug,title:e.title,previousPublishAt:e.previousPublishAt,publishAt:e.publishAt,datePublished:e.publishAt,localDate:e.localDate,localTime:e.localTime}));
writeFileSync(new URL('READY-GUIDES-DATE-CHANGES.json',here),JSON.stringify({previousPackageSha256:priorHash,scope:'Only approved future guides; three historic guides and four supporting pages preserved',guides:schedule},null,2)+'\n');
writeFileSync(new URL('PUBLIKAVIMO-KALENDORIUS.md',here),'# Madbeauty: nuoseklus pusmečio kalendorius\n\nVisos valandos Lietuvos laiku. 295 temos: 3 paskelbtos, 32 parengtos, 260 neparašytų. Parengtų tekstų datos reikalauja naujo paketo diegimo; planai nėra vieši tekstai.\n\n| Data | Valanda | Straipsnis | Parengimas |\n| --- | --- | --- | --- |\n'+entries.map(e=>`| ${e.localDate} | ${e.localTime} | ${e.title.replaceAll('|',' / ')} | ${labels[e.status]} |`).join('\n')+'\n');
console.log(JSON.stringify({total:entries.length,prepared:35,unwritten:260,first:entries[3],last:entries.at(-1),readyFirst:schedule[0],readyLastEvergreen:schedule.filter(e=>!entryById.get(entries.find(x=>x.pageId===e.pageId).planId).seasonal).at(-1),days:daily.size,weekly:[...weekly.values()],priorUnchanged:createHash('sha256').update(readFileSync(new URL('../content-execution-20261007/batch30/release/content-package.json',here))).digest('hex')===priorHash},null,2));
