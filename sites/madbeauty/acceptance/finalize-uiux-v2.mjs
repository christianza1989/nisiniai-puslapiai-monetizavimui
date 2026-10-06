import {readFile,writeFile,readdir,copyFile,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {openStore} from '../backend/store.mjs';
const site=path.resolve(import.meta.dirname,'..'),workspace=path.resolve(site,'../..'),research=path.join(workspace,'research/madbeauty-implementation'),at=new Date().toISOString();
const json=async p=>JSON.parse(await readFile(p,'utf8')),save=(p,x)=>writeFile(p,JSON.stringify(x,null,2)+'\n');
const backup=async file=>{const target=file.replace(/\.json$/,'-v1.json');try{await access(target);}catch{await copyFile(file,target);}};
const matrixFile=path.join(site,'uiux/SCREEN_STATE_MATRIX.json');await backup(matrixFile);
const matrix=await json(matrixFile),old=await json(path.join(research,'uiux-browser-v1.json')),current=await json(path.join(research,'uiux-browser-v2.json'));
const mark=(id,state,evidence,note)=>{
 const screen=matrix.screens.find(s=>s.id===id);if(!screen||screen.ownerReviewExcluded)return;
 const prior=screen.states[state]||{evidence:[]};
 screen.states[state]={status:'PASS',evidence:[...new Set([...prior.evidence,...evidence])],notes:note};
};
// Reuse only the concrete recorded state, never the aggregate test count.
const priorStates={
 'search-empty-after':['public-search','empty'],
 'auth-invalid-code':['customer-entry','error'],
 'auth-challenge-reload':['customer-entry','input-retention'],
 'operator-permission-denied':['operator-queue','permission'],
 'client-draft-reload':['professional-clients','input-retention'],
 'service-draft-stable-addon-reload':['professional-service-editor','input-retention'],
 'message-draft-reload':['professional-messages','input-retention'],
 'booking-auth-recovered':['booking-details-step','input-retention'],
 'booking-hold-expired-confirmed':['booking-review-step','stale-conflict']
};
const reused=[];
for(const row of old.screens){const mapped=priorStates[row.id];if(!mapped)continue;mark(...mapped,['research/madbeauty-implementation/uiux-browser-v1.json#'+row.id,'research/madbeauty-implementation/'+row.file],'Prior actual browser state remains relevant to this unchanged task/validation/recovery component. No new pixel or physical-device claim.');reused.push({record:row.id,screen:mapped[0],state:mapped[1]});}
const mappedId=id=>id.startsWith('calendar-')?'professional-calendar':id.startsWith('professional-manual-')?'professional-manual-visit':id.startsWith('booking-cancel')?'booking-cancel':id;
const accepted=[];
for(const row of current.screens){
 const baseline=['calendar-team-before','professional-manual-visit','calendar-team-320'].includes(row.id);
 row.review=baseline?'BASELINE_ONLY: concrete defect or earlier pre-repair form; not used for current pixel acceptance.':'PASS_FOR_RECORDED_VIEW: actual pixel review by implementing agent; private QA, not every state or physical device.';
 if(baseline)continue;
 const id=mappedId(row.id),refs=['research/madbeauty-implementation/uiux-browser-v2.json#'+row.id,'research/madbeauty-implementation/'+row.screenshot];
 mark(id,'normal',refs,'Actual current browser surface rendered and reviewed; scoped to this recorded state.');
 mark(id,row.metrics.width>=1000?'desktop':'mobile',refs,'Actual recorded pixel review and CSS-pixel viewport; physical device unverified.');
 if(['empty','validation','success','keyboard-focus'].includes(row.state))mark(id,row.state,refs,'Actual recorded interaction/state, not inferred from unit tests.');
 accepted.push({screen:id,record:row.id,width:row.metrics.width,state:row.state});
}
mark('booking-reschedule','success',['research/madbeauty-implementation/uiux-browser-v2.json#professional-visit-drawer','research/madbeauty-implementation/uiux-functional-final-v2.json'],'Actual browser selected14:30; same newly created QA booking ID, version2; later cancellation is a separate version3 action.');
mark('professional-manual-visit','success',['research/madbeauty-implementation/uiux-browser-v2.json#calendar-team-mobile','research/madbeauty-implementation/uiux-functional-final-v2.json'],'Actual browser created a15min/10EUR visit for scoped QA client and meistrė B at14:00.');
mark('booking-cancel','keyboard-focus',['research/madbeauty-implementation/uiux-dialog-keyboard-v2.json'],'Actual desktop Shift+Tab wraps to submit, Tab wraps to close; both remain inside dialog.');
matrix.at=at;matrix.version='v2 bounded remaining-path acceptance';matrix.reusedEvidence=reused;
matrix.tests={backend:35,foundation:9,platform:21,http:4,calendarLayout:4,total:73};
const gaps=matrix.screens.map(s=>({id:s.id,route:s.route,ownerReviewExcluded:s.ownerReviewExcluded,unverified:Object.entries(s.states).filter(([,v])=>v.status==='UNVERIFIED').map(([k])=>k)})).filter(s=>s.unverified.length);
matrix.remainingGaps=gaps;await save(matrixFile,matrix);await save(path.join(research,'uiux-browser-v2.json'),current);
const defectsFile=path.join(site,'uiux/DEFECTS.json');await backup(defectsFile);const defects=await json(defectsFile);
const repairs=[
 ['UX19','Short overlapping visits clipped time and later visits retained whole-day narrow lanes','Connected overlap groups,112px minimum lane width,2px/minute scale, sticky axes/headers, keyboard-scroll region.'],
 ['UX20','Manual service select clipped staff and omitted price/duration before one-click creation','Full selected variant summary changes with selection and remains visible in the slot step; only active services offered.'],
 ['UX21','Provider mobile agenda omitted client, and visit drawer omitted staff/resource/duration','Client names in provider list; snapshot staff and selected resource/duration in drawer.'],
 ['UX22','320px header overflow was missed by innerWidth-based checks','Compact header controls; actual root scrollWidth compared with clientWidth,1px before and0px after.']
];
for(const [id,issue,repair] of repairs){if(defects.defects.some(d=>d.id===id))continue;defects.defects.push({id,priority:'P1',issue,baselineStatus:'BROWSER_CONFIRMED',status:'FIXED_LOCAL',repairs:[repair],confirmation:['research/madbeauty-implementation/uiux-browser-v2.json','research/madbeauty-implementation/uiux-functional-final-v2.json']});}
defects.at=at;await save(defectsFile,defects);
const beforeSource=await json(path.join(research,'uiux-functional-final-v1.json')),sourceSHA256={},syntax=[];
for(const file of [...Object.keys(beforeSource.sourceSHA256),'calendar-layout.mjs']){
 const absolute=path.join(site,'prototype/public',file);sourceSHA256[file]=createHash('sha256').update(await readFile(absolute)).digest('hex');
 if(file.endsWith('.mjs')){const r=spawnSync(process.execPath,['--check',absolute]);if(r.status!==0)throw Error('Syntax failed: '+file);syntax.push(file);}
}
const testCounts={};
for(const [name,file,expected] of [['backend','backend-tests-v16.tap',35],['platformHttpCalendar','platform-uiux-tests-v10.tap',29],['foundation','foundation-uiux-tests-v10.tap',9]]){
 const tap=await readFile(path.join(research,file),'utf8'),passed=Number(tap.match(/# pass (\d+)/)?.[1]),failed=Number(tap.match(/# fail (\d+)/)?.[1]);
 if(passed!==expected||failed!==0)throw Error('Test receipt mismatch');testCounts[name]={file,passed,failed};
}
const store=openStore({filename:path.join(site,'runtime/platform-preview.sqlite'),fixturePreview:true});let durable;
try{const d=store.read(),org=d.organizations.find(o=>o.name==='Kalendoriaus priėmimo QA'),b=d.bookings.find(b=>b.id==='booking_f8490c99-2694-4f3b-9060-8a38ae044019');if(!org||org.approved||!b||b.organizationId!==org.id||b.status!=='canceled'||b.version!==3)throw Error('Durable browser journey mismatch');durable={organizationId:org.id,approved:org.approved,booking:{id:b.id,startAt:b.startAt,endAt:b.endAt,status:b.status,version:b.version,priceMinor:b.priceMinor,durationMin:b.durationMin},orgBookings:d.bookings.filter(b=>b.organizationId===org.id).length,originalFirstVisitUnchanged:d.bookings.find(b=>b.id==='booking_284db96e-4c02-4faa-8a7b-c90aa7486daa')?.status==='confirmed'};}finally{store.close();}
const secrets=[];for(const file of await readdir(path.join(site,'runtime'))){if(!/^lighthouse-auth-headers-v\d+\.json$/.test(file))continue;const h=await json(path.join(site,'runtime',file));for(const [key,v] of Object.entries(h))if(typeof v==='string'&&/cookie|csrf|authorization/i.test(key)){secrets.push(v);if(/cookie/i.test(key))secrets.push(v.slice(v.indexOf('=')+1));}}
let scanned=0;const findings=[];
for(const dir of [research,path.join(site,'prototype/public')])for(const e of await readdir(dir,{withFileTypes:true})){if(!e.isFile()||! /\.(json|html|md|tap|txt|mjs|css)$/.test(e.name))continue;const file=path.join(dir,e.name),t=await readFile(file,'utf8');scanned++;if(secrets.some(s=>s.length>20&&t.includes(s)))findings.push(path.relative(workspace,file));}
if(findings.length)throw Error('Private credential exposed');
const privatePaths=[];for(const p of ['/backend/store.mjs','/runtime/platform-preview.sqlite','/runtime/browser-test-code.json','/runtime/lighthouse-auth-headers-v9.json']){const r=await fetch('http://127.0.0.1:8788'+p);if(r.status!==404)throw Error('Private path exposed');privatePaths.push({path:p,status:r.status});}
const narrow=await json(path.join(research,'uiux-320-header-v2.json'));if(narrow.after.rootOverflow!==0||narrow.after.controls.some(c=>c.leftOverflow||c.rightOverflow))throw Error('320px confirmation failed');
const receipt={at,reviewer:'same implementing agent',scope:'Bounded remaining-path acceptance; private loopback QA; no demo profile/photo review, shared core or live channels.',screenshots:current.screens.length,accepted,reused,testCounts,totalPassed:73,sourceSHA256,syntaxPassed:syntax.length,durableBrowserJourney:durable,lighthouse:await json(path.join(research,'performance-authenticated-v9.json')),safety:{scannedTextFiles:scanned,credentialFindings:findings,privatePaths},remainingGaps:gaps,limits:['Full70/all-state remains UNVERIFIED','Physical zoom, OS reduced-motion and production device/browser matrix unverified','Only three simultaneous staff and15-minute adjacent samples reviewed; wider team stress, DST-spanning visits and all overlap combinations not accepted','Historical normal/width checks remain scoped DOM evidence, not comprehensive pixel acceptance']};
await save(path.join(research,'uiux-functional-final-v2.json'),receipt);
await save(path.join(site,'uiux/REMAINING_GAPS.json'),{at,gaps});
const normalMissing=matrix.screens.filter(s=>!s.ownerReviewExcluded&&s.states.normal.status!=='PASS').map(s=>s.id);
const text='# Madbeauty — patikrintos kelionės ir likusios spragos\n\n2026-10-06. Vietinis priėmimas, tas pats įgyvendinantis agentas. Vienos normalios kelionės PASS nereiškia visų jos klaidų ar įrenginių priėmimo.\n\n| Kelionė | Rezultatas ir riba | Įrodymas |\n|---|---|---|\n| Komandos kalendorius → savaitė/diena → meistro filtras → klaviatūros slinkimas | PASS vietiniam trijų meistrų scenarijui: vienalaikiai15min. vizitai, gretimas15min. ir vėlesnis60min. Laikai nenukerpami; vėlesnis vizitas gauna visą plotį. | uiux-browser-v2.json, calendar-layout tests |\n| Rankinis vizitas → pakeista paslauga → kaina/trukmė → pasirinktas14:00 → vizito detalės | PASS:15min./10EUR, meistrė B, pasirinktas klientas. Desktop/mobile santrauka ir panelė. | uiux-browser-v2.json |\n| Vizito perkėlimas14:00→14:30 → atšaukimo validacija → atšaukimas → reload | PASS: tas pats ID, išlikusi kaina/trukmė, galutinė canceled/version3 būsena. Niekam nesiųstas gyvas laiškas. | uiux-functional-final-v2.json |\n| Kliento kortelė → vizitų istorija → atšauktas vizitas | PASS desktop/mobile; naujas lokalus kliento įrašas, ne tikras pirkėjas. | uiux-browser-v2.json |\n| Tušti išsaugoti profiliai; tuščia kalendoriaus diena;404 | PASS konkrečioms užfiksuotoms būsenoms. | uiux-browser-v2.json |\n| Prisijungimo atkūrimas, formų juodraščiai, pasibaigęs hold | Ankstesni konkretūs V1 įrodymai pritaikyti tik atitinkamoms eilutėms ir būsenoms; naujas pilnas pakartojimas neatliktas. | uiux-browser-v1.json |\n\nLikę paviršiai be patvirtintos normalios būsenos: '+normalMissing.map(s=>'`'+s+'`').join(', ')+'. Demo profilių/galerijų išimtys nepanaikintos.\n\nDar nepriimtas naujas pilnas inquiry/waitlist pateikimo, kliento atsiliepimo ir operatoriaus profilio peržiūros browser kelias; pilnas kelių meistrų booking-staff pasirinkimas bei visų veiksmų stale/network/permission šakos. Ne kiekvienas iš 70 ekranų turi realiai peržiūrėtą desktop ir mobile kadrą; ankstesni DOM pločių PASS nėra tokių kadrų pakaitalas. Tikslios eilutės ir likusios būsenos: SCREEN_STATE_MATRIX.json / REMAINING_GAPS.json.\n\nFizinis200%zoom, OS sumažinto judesio nustatymas ir production naršyklės/įrenginiai lieka UNVERIFIED. Trijų meistrų pavyzdys neįrodo32meistrų apkrovos, visų persidengimų ar DST intervalų. SMTP/INBOX, DNS/TLS/deploy, visas viešo katalogo SSR/SEO, tikri teikėjai ir paklausa tebėra atskiri nepriimti vartai.\n\nIntervencijos: pirmas kalendoriaus helper integravimas turėjo sintaksės klaidą; perrašyta ir node --check bei actual reload PASS. Išlikęs320px vieno pikselio header persiliejimas patvirtintas lyginant scrollWidth su clientWidth, pataisytas ir0px retestas. Pirmas V10 testų paleidimas apėmė29testus, trūkstami9foundation testai paleisti atskirai; bendras rezultatas35+29+9=73PASS. Originalūs kvitai ir nesėkmės išlaikyti.\n';
await writeFile(path.join(site,'uiux/JOURNEYS.md'),text);
console.log(JSON.stringify({screenshots:current.screens.length,acceptedRecords:accepted.length,reusedStates:reused.length,normalMissing,totalPassed:73,syntaxPassed:syntax.length,privateFindings:findings.length}));
