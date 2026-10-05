import {createAdapter} from '/demo-adapter.mjs';
import {makeClock,localInstant,formatMoney,TAXONOMY} from '/demo-model.mjs';
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const boot=await fetch('/boot.json').then(r=>r.json());
const {assets}=await fetch('/media.json').then(r=>r.json());
let clock=makeClock(boot.now),adapter,request=0,dayOffset=1,chosenTime=null,toastTimer;
const favorites=new Set();
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="icons.svg#${name}"/></svg>`;
const photo=(id,sizes,extra='')=>{const a=assets.find(x=>x.id===id);const best=a.variants.find(x=>x.width<=800)??a.variants[0];return `<img src="${escape(best.file)}" srcset="${a.variants.map(v=>escape(v.file)+' '+v.width+'w').join(', ')}" sizes="${sizes}" width="${best.width}" height="${best.height}" alt="${escape(a.alt)}" ${extra}>`;};
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;toastTimer=setTimeout(()=>{$('toast').textContent='';},3500);}
$('service').innerHTML='<option value="">Visos paslaugos</option>'+TAXONOMY.map(t=>`<option value="${t.id}">${t.label}</option>`).join('');
function dateText(iso,options){return new Intl.DateTimeFormat('lt-LT',{timeZone:clock.timezone,...options}).format(new Date(iso));}
async function renderCatalog() {
  const revision=++request;
  adapter=createAdapter({enabled:$('demo-toggle').checked,deployment:boot.deployment,scenario:$('scenario').value,clock});
  $('date-label').value=dateText(clock.now,{year:'numeric',month:'2-digit',day:'2-digit'});
  const list=await adapter.catalog({city:$('city').value,taxonomyServiceId:$('service').value||null});
  if(revision!==request)return;
  $('catalog-count').textContent=adapter.mode==='off'?'Demo išjungta':`${list.length} paslaugų variantai · rodomi pirmi 6`;
  $('catalog-status').textContent=adapter.mode==='off'?'Jokių fiktyvių rezultatų. Tikras duomenų adapteris dar neprijungtas.':'Fiktyvi pasiūla sąsajos peržiūrai; tai nėra tikri meistrai ar laisvi laikai.';
  $('results').innerHTML=list.length?list.slice(0,6).map((s,i)=>`<article class="result"><div class="result-top">${photo(s.imageId,'(max-width:600px) calc(100vw - 40px), (max-width:900px) calc((100vw - 72px)/2), (max-width:1320px) calc((100vw - 144px)/3), 392px',i>2?'loading="lazy"':'fetchpriority="'+(i===0?'high':'auto')+'"')}<button class="favorite" aria-label="Išsaugoti ${escape(s.practitionerName)}" aria-pressed="${favorites.has(s.practitionerId)}" data-favorite="${s.practitionerId}">${icon('heart')}</button></div><h3>${escape(s.practitionerName)}</h3><p class="result-sub">${escape(s.city)} · ${escape(s.organizationName)}</p><div class="service-row"><span>${escape(s.label)}<br><span class="hint">${s.durationMin} min · demonstracija</span></span><strong>${escape(formatMoney(s.priceMinor))}</strong></div><div class="result-footer"><span class="pill ${s.calendarState==='stale'?'error':''}">${s.calendarState==='none'?'Kalendorius neprijungtas':s.calendarState==='stale'?'Šaltinį reikia atnaujinti':'Demo šaltinis'}</span><button class="button outline small" data-preview="${s.id}">Peržiūrėti</button></div></article>`).join(''):`<div class="empty"><h3>${adapter.mode==='off'?'Demo duomenys išjungti':'Pagal šį pasirinkimą pavyzdžių nėra'}</h3><p>${adapter.mode==='off'?'Sąsaja laukia tikro adapterio. Fiktyvios pasiūlos fallback nėra.':'Pakeiskite paslaugą, miestą arba scenarijų.'}</p></div>`;
  $('results').querySelectorAll('[data-favorite]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.favorite;if(favorites.has(id))favorites.delete(id);else favorites.add(id);$('results').querySelectorAll('[data-favorite]').forEach(x=>{if(x.dataset.favorite===id)x.setAttribute('aria-pressed',String(favorites.has(id)));});toast('Pakeista tik demo išsaugoto meistro būsena.');}));
  $('results').querySelectorAll('[data-preview]').forEach(b=>b.addEventListener('click',()=>{const s=list.find(x=>x.id===b.dataset.preview);openDialog(`<p><strong>${escape(s.label)}</strong></p><p>${escape(s.practitionerName)} · ${escape(s.city)}</p><p>${s.durationMin} min · ${escape(formatMoney(s.priceMinor))} (fiktyvus pavyzdys)</p><p>Šis komponentas rodo paslaugos santrauką. Rezervacijos kelias dar neįgyvendintas.</p>`);}));
  const visits=adapter.mode==='demo'?await adapter.appointments({organizationId:'demo-org-0'}):[];
  $('appointment-rows').innerHTML=visits.slice(-3).map(b=>`<tr><td>${escape(dateText(b.startAt,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</td><td>Demo vizitas</td><td><span class="pill">${b.status==='canceled'?'Atšauktas':'Patvirtintas'}</span></td></tr>`).join('')||'<tr><td colspan="3">Demo vizitų nėra.</td></tr>';
  renderDateWidget();
}
function renderDateWidget(){
  const enabled=$('demo-toggle').checked;
  $('date-strip').innerHTML=enabled?Array.from({length:7},(_,i)=>{const iso=localInstant(clock,i,12*60);return `<button class="date-button" aria-pressed="${dayOffset===i}" data-day="${i}">${escape(dateText(iso,{weekday:'short'}))}<strong>${escape(dateText(iso,{day:'numeric'}))}</strong></button>`;}).join(''):'';
  $('times').innerHTML=enabled?Array.from({length:4},(_,i)=>{const iso=localInstant(clock,dayOffset,10*60+i*30);return `<button class="slot" aria-pressed="${chosenTime===iso}" data-time="${iso}">${dateText(iso,{hour:'2-digit',minute:'2-digit'})}</button>`;}).join(''):'';
  $('selected-time').textContent=enabled?(chosenTime?'Pasirinktas laiko valdiklio pavyzdys: '+dateText(chosenTime,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})+'. Registracija nevykdoma.':'Pasirinkite valdiklio pavyzdį. Tai nėra meistro laisvi laikai.'):'Demo datos ir laikai išjungti.';
  $('date-strip').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{dayOffset=Number(b.dataset.day);chosenTime=null;renderDateWidget();}));
  $('times').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{chosenTime=b.dataset.time;renderDateWidget();}));
  $('advance-clock').disabled=!enabled;
}
function openDialog(html){$('dialog-body').innerHTML=html;$('example-dialog').showModal();}
$('close-dialog').addEventListener('click',()=>$('example-dialog').close());$('accept-dialog').addEventListener('click',()=>$('example-dialog').close());
$('open-example').addEventListener('click',()=>openDialog('<p>Santrauka, uždarymas su Escape ir grįžtantis focus. Tai paruoštas dialogo komponentas, ne gyva rezervacija.</p>'));
$('save-example').addEventListener('click',()=>toast('Pavyzdinė būsena išsaugota tik peržiūrai.'));
$('loading-example').addEventListener('click',async()=>{const b=$('loading-example');b.disabled=true;b.setAttribute('aria-busy','true');b.textContent='Įkeliama…';await new Promise(resolve=>setTimeout(resolve,650));b.disabled=false;b.removeAttribute('aria-busy');b.textContent='Įkėlimo būsena';toast('Įkėlimo būsenos pavyzdys baigtas.');});
$('validation-example').addEventListener('submit',e=>{e.preventDefault();const bad=$('name-example').value.trim().length<2;$('name-example').setAttribute('aria-invalid',String(bad));$('name-error').hidden=!bad;if(bad)$('name-example').focus();else toast('Laukas tinkamas. Duomenys niekur nesiunčiami.');});
$('search-form').addEventListener('submit',e=>{e.preventDefault();renderCatalog();});
for(const id of ['scenario','city','service'])$(id).addEventListener('change',renderCatalog);
$('demo-toggle').addEventListener('change',()=>{favorites.clear();chosenTime=null;renderCatalog();});
$('reset').addEventListener('click',()=>{clock=makeClock(boot.now);$('scenario').value='happy';$('city').value='Vilnius';$('service').value='';favorites.clear();chosenTime=null;dayOffset=1;renderCatalog();toast('Atkurta pradinė demo būsena.');});
$('advance-clock').addEventListener('click',()=>{clock=makeClock(localInstant(clock,7,12*60));chosenTime=null;renderCatalog();});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('view-label').textContent=(b.dataset.view==='list'?'Sąrašo':'Dienotvarkės')+' valdiklis pasirinktas. Pilnas kalendorius kuriamas atskirai.';}));
const iconNames=['search','calendar','clock','location','person','heart','filter','list','map','arrow','chevron','close','check','warning','email','message','upload','edit','team','resource','settings','star','image','download','refresh','more'];
$('icon-board').innerHTML=iconNames.map(n=>`<span title="${n}">${icon(n)}</span>`).join('');
$('asset-gallery').innerHTML=assets.map(a=>`<figure>${photo(a.id,'(max-width:600px) calc((100vw - 54px)/2), (max-width:900px) calc((100vw - 88px)/3), (max-width:1320px) calc((100vw - 156px)/4), 276px','loading="lazy"')}<figcaption>${escape(a.alt)}</figcaption></figure>`).join('');
await renderCatalog();

// Autohide uses accumulated direction, never hides the focused header.
const header=document.querySelector('header');
let lastScroll=window.scrollY,direction=0,travel=0,scrollFrame=0;
function revealHeader(){header.dataset.hidden='false';travel=0;lastScroll=window.scrollY;}
function updateHeader(){
  scrollFrame=0;const y=Math.max(0,window.scrollY),delta=y-lastScroll;lastScroll=y;
  if(y<220||header.contains(document.activeElement)||document.querySelector('dialog[open]')){revealHeader();return;}
  if(Math.abs(delta)<2)return;
  const nextDirection=Math.sign(delta);if(nextDirection!==direction){direction=nextDirection;travel=0;}
  travel+=Math.abs(delta);
  if(direction<0&&travel>12)header.dataset.hidden='false';
  if(direction>0&&travel>64)header.dataset.hidden='true';
}
window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateHeader);},{passive:true});
header.addEventListener('focusin',revealHeader);
window.addEventListener('keydown',e=>{if(e.key==='Tab')revealHeader();});
header.querySelectorAll('a').forEach(a=>a.addEventListener('click',revealHeader));
