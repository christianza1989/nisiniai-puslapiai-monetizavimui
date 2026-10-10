import {profileMetadata,moduleSchema} from './profile-seo.mjs';
import {directorySchema,directoryDescription} from './provider-directory.mjs';
import {searchSelect,bindSearchSelects} from './search-select.mjs';
import {captureServerPage,serverPageFor,restoreServerMetadata} from './server-recovery.mjs';
import {loadJson} from './load-json.mjs';
import {catalogueCityDestination,cataloguePickerDestination,bindCataloguePicker,catalogueRoute} from '/catalogue-page.mjs';
import {syncSharing,syncCanonical} from './sharing.mjs';
import {submitReport} from './moderation-ui.mjs';
import {waitlistFields,waitlistAction} from './waitlist-ui.mjs';
import {locationDialog} from './search-results-ui.mjs';
import {filterProcedures} from './offer-editor.mjs';
import {createPlatformAdapter as createAdapter} from '/platform-adapter.mjs';
import {makeClock,localInstant,TAXONOMY} from '/demo-model.mjs';
import {SCENARIOS} from '/config.mjs';
import {DEMO_NAMESPACE} from '/platform-domain.mjs';
import {esc,icon,link,btn,photo,date,money,minute,select,field,textarea,empty,errorHTML,readSearch,searchHash,userError} from './ui.mjs';
import {saveDraft,restoreDrafts,suspendDraft,finishDraft,clearDrafts,validateForm,clearFieldError,discardDraft,syncConditionalFields} from './form-state.mjs';
import {publicView,profileURL} from './public-views.mjs';
import {bookingView,bookingAction,bookingForm,bookingChange} from './booking-ui.mjs';
import {workspaceView,workspaceAction,workspaceForm,manualServiceSummary} from './workspace-ui.mjs';
import {createHttpAdapter} from './http-adapter.mjs';
import {accountAction,accountForm} from './account-ui.mjs';
import {reconcileAccountState} from './account-state.mjs';
import {setContentData,setRetentionPolicy,trustPages} from './content.mjs';
import {activeNode,CATALOGUE_ORIGIN} from '/content-targets.mjs';
import {isCityId} from '/cities.mjs';
const $=s=>document.querySelector(s),boot=await loadJson('/boot.json');
const serverPage=captureServerPage(document,location.href,boot);
setRetentionPolicy(boot.retentionPolicy);

const initial=()=>({enabled:boot.enabled,scenario:'happy',clock:boot.now,session:{role:'guest',organizationId:'demo-org-0',clientId:'demo-client-0'},search:{paslauga:'manikiuras',miestas:'vilnius',diena:1,nuo:'17:00',iki:'20:00',tipas:'',max:'',rikiuoti:'laikas',vaizdas:'sarasas',vardas:'',rezultatai:'paslaugos'},favorites:[],booking:null,calendarDay:0,calendarMode:'week',onboardingStep:0,onboarding:{},uploads:[]});
let state=initial(),restoredWorkspaceAccount=null;
try{const saved=JSON.parse(sessionStorage.getItem(DEMO_NAMESPACE+':ui'));if(saved?.version===1&&saved.boot===boot.now)state={...state,...saved.state};}catch{}
const ctx={privatePrototype:boot.privatePrototype,temporaryTest:boot.temporaryTest||null,searchSelect,state,media:new Map(),taxonomy:TAXONOMY,candidates:new Map(),minute,render,navigate,toast,openDialog,closeDialog,saveUI,selectRole,beginBooking,clearDrafts,
  dayLabel:i=>date(localInstant(ctx.renderClock||ctx.adapter.clock,Number(i),720)),
  dayInstant:i=>localInstant(ctx.renderClock||ctx.adapter.clock,Number(i),720),
  dayKey:i=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vilnius',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(localInstant(ctx.renderClock||ctx.adapter.clock,Number(i),720))),
};
const persistence={load:()=>JSON.parse(localStorage.getItem(DEMO_NAMESPACE)||'null'),save:d=>localStorage.setItem(DEMO_NAMESPACE,JSON.stringify(d)),clear:()=>localStorage.removeItem(DEMO_NAMESPACE)};
ctx.realAdapter=createHttpAdapter();
let mediaPromise=null;
ctx.ensureMedia=async()=>{if(!mediaPromise)mediaPromise=Promise.all(['/media.json','/app-media.json'].map(u=>loadJson(u))).then(data=>{for(const a of data.flatMap(d=>d.assets))ctx.media.set(a.id,a);}).catch(e=>{mediaPromise=null;throw e;});return mediaPromise;};
function adapter(){ctx.adapter=createAdapter({enabled:state.enabled,deployment:boot.deployment,clock:makeClock(state.clock),scenario:state.scenario,richFixtures:true,persistence,realAdapter:boot.apiAvailable?ctx.realAdapter:null});if(!state.enabled&&ctx.realAdapter.session){const s=ctx.realAdapter.session;state.session={role:s.user?'customer':'guest',clientId:s.user?.id||null,organizationId:s.organizations[0]?.id||null};}}
adapter();
function saveUI(){try{
  sessionStorage.setItem(DEMO_NAMESPACE+':ui',JSON.stringify({version:1,boot:boot.now,state}));
  const s=ctx.realAdapter.session;
  if(ctx.adapter.mode==='real'&&s?.user&&s.organizations.some(o=>o.id===state.session.organizationId))localStorage.setItem(DEMO_NAMESPACE+':real-workspace',JSON.stringify({accountId:s.user.id,organizationId:state.session.organizationId}));
}catch{toast('Vietinių pasirinkimų išsaugoti nepavyko.');}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(ctx.toastTimer);ctx.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
let dialogOpener=null;
function openDialog(title,html,{restore=true}={}){if(!$('#dialog').open)dialogOpener=ctx.actionOpener?.isConnected?ctx.actionOpener:document.activeElement;$('#dialog').innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>${btn('close-dialog',icon('close'),'aria-label="Uždaryti"','close')}</div><div class="dialog-body">${html}</div>`;if(restore)restoreDrafts(ctx,$('#dialog'));$('#header').classList.remove('is-hidden');if(!$('#dialog').open)$('#dialog').showModal();if(!$('#dialog').contains(document.activeElement))$('#dialog button')?.focus();}
function closeDialog(){if($('#dialog').open)$('#dialog').close();$('#dialog').innerHTML='';dialogOpener?.focus?.();}
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog'))closeDialog();});
$('#dialog').addEventListener('close',()=>{if(!$('#dialog').open){$('#dialog').innerHTML='';dialogOpener?.focus?.();}});
$('#dialog').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...$('#dialog').querySelectorAll('button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(x=>x.getClientRects().length),first=items[0],last=items.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
function viewKey(){return location.pathname+location.search+(location.hash.includes('=')?location.hash:'');}
function fragmentTarget(){if(!location.hash||location.hash.includes('='))return null;try{return document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return null;}}
async function navigate(url,{replace=false,preserve=false}={}){if($('#dialog').open)closeDialog();history[replace?'replaceState':'pushState']({},'',url);await render();if(!preserve){const target=fragmentTarget();if(target)target.scrollIntoView({behavior:'instant'});else window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});}}
function chrome(){
  $('#demo-bar').innerHTML=boot.privatePrototype?btn('demo-controls',icon('settings'),'aria-label="Peržiūros nustatymai"','preview-toggle'):'';
  $('#header').innerHTML=`<a class="brand" href="/" aria-label="Madbeauty pradžia">madbeauty<span>.</span></a><nav class="nav" aria-label="Pagrindinė navigacija"><a href="/paslaugos">Paslaugos</a><a href="/kaip-veikia">Kaip veikia</a><a href="/gidai">Grožio idėjos</a><a href="/meistrams">Meistrams</a></nav><div class="row"><a href="/paskyra" class="button outline header-account" aria-label="${state.session.role==='guest'?'Prisijungti':'Paskyra'}">${icon('person')}<span>${state.session.role==='guest'?'Prisijungti':'Paskyra'}</span></a>${btn('mobile-menu',icon('list'),'aria-label="Atidaryti meniu" aria-expanded="false"','close menu-button')}</div><nav class="mobile-menu" aria-label="Mobilioji navigacija"><a href="/paslaugos">Paslaugos</a><a href="/kaip-veikia">Kaip veikia</a><a href="/gidai">Grožio idėjos</a><a href="/meistrams">Meistrams</a><a href="/pagalba">Pagalba</a></nav>`;
  $('#footer').innerHTML=`<div class="container"><div class="footer-grid"><div><a class="brand" href="/" style="color:white">madbeauty<span>.</span></a><p>Grožio laikas. Tavo ritmu.</p><p>Atrask savo meistrą ir skirk laiko sau.</p></div><div><h2>Klientams</h2>${[['/paslaugos','Paslaugos'],['/salonai','Salonai'],['/meistrai','Meistrai'],['/kaip-veikia','Kaip veikia'],['/gidai','Grožio idėjos'],['/pagalba','Pagalba']].map(([u,l])=>link(u,l,'')).join('')}</div><div><h2>Meistrams</h2>${[['/meistrams','Kaip pradėti'],['/meistrui/kalendorius','Darbo vieta'],['/tikrinimas','Profilių tikrinimas'],['/redakcija','Redakcija']].map(([u,l])=>link(u,l,'')).join('')}</div><div><h2>Informacija</h2>${[['/apie','Apie mus'],['/privatumas','Privatumas'],['/slapukai','Slapukai'],['/taisykles','Taisyklės'],['/kontaktai','Kontaktai']].map(([u,l])=>link(u,l,'')).join('')}<p>${icon('email')} <a href="mailto:${esc(boot.contact.email)}">${esc(boot.contact.email)}</a><br>${esc(boot.contact.operatorName)}</p></div></div><div class="footer-bottom"><span>© 2026 Madbeauty</span><span>Mūsų verslas automatizuotas su verslomatika.lt</span></div></div>`;
}
let renderId=0,renderedViewKey='';
async function render(){
  renderedViewKey=viewKey();
  const id=++renderId;clearInterval(ctx.holdTimer);ctx.candidates.clear();ctx.currentProfile=null;ctx.directory=null;chrome();let path=decodeURIComponent(location.pathname).replace(/\/+$/,'')||'/';ctx.path=path;
  const cityForm=$('#catalogue-city'),chosenCity=cityForm?.querySelector('[name="miestas"]')?.value,chosenService=cityForm?.querySelector('[name="paslauga"]')?.value;
  if(activeNode(chosenService)&&isCityId(chosenCity))ctx.catalogueCityChoice={serviceId:activeNode(chosenService).id,cityId:chosenCity};
  $('#main').setAttribute('aria-busy','true');$('#main').innerHTML='<div class="container skeleton-page" role="status"><div class="skeleton" style="width:60%;height:36px" aria-hidden="true"></div><p style="margin-top:24px">Įkeliama…</p></div>';
  let html,recovered=null;
  try{
    if(ctx.startupError)throw ctx.startupError;
    const privatePath=/^\/(meistrui|operatorius|paskyra)(\/|$)/.test(path),jobs=[];
    if(ctx.adapter.mode==='real'){jobs.push(ctx.realAdapter.refreshSession());jobs.push(ctx.realAdapter.taxonomy().then(t=>{ctx.catalogueNodes=t.nodes;ctx.taxonomyVersion=t.version;}));}
    if(!privatePath||path==='/meistrui/galerija'||path==='/paskyra/issaugoti')jobs.push(ctx.ensureMedia());
    if(!privatePath||path==='/operatorius/turinys')jobs.push(loadJson('/content.json').then(data=>{ctx.content=data;setContentData(data);}));
    await Promise.all(jobs);
    if(ctx.adapter.mode==='real'){
      const s=ctx.realAdapter.session;
      if(reconcileAccountState(state,s.user)){clearDrafts();closeDialog();ctx.workspace=null;ctx.editing=null;ctx.rebooking=null;ctx.erasureCase=null;ctx.privacyChallenge=null;ctx.erasureReceiptToken=null;ctx.authChallenge=null;}
      if(restoredWorkspaceAccount!==(s.user?.id||null)){
        restoredWorkspaceAccount=s.user?.id||null;state.session.organizationId=null;
        if(s.user)try{const saved=JSON.parse(localStorage.getItem(DEMO_NAMESPACE+':real-workspace'));if(saved?.accountId===s.user.id&&s.organizations.some(o=>o.id===saved.organizationId))state.session.organizationId=saved.organizationId;}catch{}
      }
      state.favorites=s.favoriteIds||[];
      state.session={...state.session,role:s.user?(state.session.role==='guest'?'customer':state.session.role):'guest',clientId:s.user?.id||null,organizationId:s.organizations.some(o=>o.id===state.session.organizationId)?state.session.organizationId:s.organizations[0]?.id||null};
    }
    ctx.renderClock=ctx.adapter.clock;
    if(location.hash.startsWith('#paslauga=')||location.hash.includes('miestas=')){state.search={...state.search,...readSearch()};}
    if(/^\/paslaugos\/[^/]+\//.test(path)){state.search.paslauga=path.split('/')[2];state.search.miestas=path.split('/')[3];}
    if(ctx.adapter.mode==='off')html=`<div class="container off-state">${empty('Paslaugos laikinai nepasiekiamos','Pabandykite dar kartą po kelių minučių.',btn('reload-view','Bandyti dar kartą'))}</div>`;
    else if(path.startsWith('/registracija'))html=await bookingView(ctx,path);
    else if(path.startsWith('/paskyra')||path.startsWith('/meistrui')||path.startsWith('/operatorius'))html=await workspaceView(ctx,path);
    else html=await publicView(ctx,path);
    if(!html)html=`<div class="page container"><h1 class="page-title">Puslapis nerastas</h1><p>Nuoroda neteisinga, profilis nepatvirtintas arba turinys dar nepaskelbtas.</p>${link('/','Grįžti į pradžią')}</div>`;
  }catch(e){recovered=serverPageFor(serverPage,location.href);html=recovered?recovered.html+`<div class="container public-recovery" role="status"><p>Interaktyvios funkcijos laikinai nepasiekiamos. Turinį gali skaityti.</p>${btn('reload-view','Bandyti dar kartą','','button outline small')}</div>`:`<div class="page container"><h1>Šio vaizdo atidaryti nepavyko</h1>${errorHTML(e)}${link('/paskyra','Atidaryti paskyrą','button accent')} ${btn('reload-view','Bandyti dar kartą','','button outline')}</div>`;}
  if(id!==renderId)return;chrome();$('#main').innerHTML=html;$('#main').setAttribute('aria-busy','false');restoreDrafts(ctx,$('#main'));bindSearchSelects($('#main'));bindCataloguePicker($('#main'));
  document.querySelectorAll('#header a[href]').forEach(a=>{if(a.pathname===path)a.setAttribute('aria-current','page');});
  const expiry=$('#hold-expiry');if(expiry){const started=Date.now(),serverNow=Date.parse(ctx.adapter.clock.now),end=Date.parse(expiry.dataset.expires);const tick=()=>{const seconds=Math.max(0,Math.ceil((end-serverNow-(Date.now()-started))/1000));expiry.textContent=seconds?'Laikas tau laikomas '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+'.':'Laiko palaikymas baigėsi. Pasirink laiką iš naujo.';if(!seconds){clearInterval(ctx.holdTimer);expiry.setAttribute('role','alert');const confirm=$('[data-action="confirm-booking"]');if(confirm)confirm.disabled=true;$('#hold-recovery')?.removeAttribute('hidden');}};tick();ctx.holdTimer=setInterval(tick,1000);}
  const contents=$('#main .article-aside details');if(contents)contents.open=matchMedia('(min-width:761px)').matches;
  const bookingSummary=$('#main .booking-summary details');if(bookingSummary)bookingSummary.open=matchMedia('(min-width:761px)').matches;
  alignWorkspaceNavigation();
  const onboardingSteps=$('#main nav[aria-label="Pradžios etapai"],#main nav[aria-label="Vizito žingsniai"]'),currentStep=onboardingSteps?.querySelector('.accent,.active');if(onboardingSteps&&currentStep&&matchMedia('(max-width:760px)').matches)onboardingSteps.scrollLeft=Math.max(0,currentStep.offsetLeft-onboardingSteps.offsetLeft-(onboardingSteps.clientWidth-currentStep.offsetWidth)/2);
  const conversationList=$('#main .conversation-list'),selectedConversation=conversationList?.querySelector('.active');if(conversationList&&selectedConversation)conversationList.scrollTop=Math.max(0,selectedConversation.offsetTop-conversationList.offsetTop-(conversationList.clientHeight-selectedConversation.offsetHeight)/2);
  document.body.classList.toggle('workspace-page',/^\/(meistrui|operatorius|paskyra)/.test(path));
  if(recovered){restoreServerMetadata(document,recovered);saveUI();return;}
  const h1=$('#main h1')?.textContent||'Madbeauty',profileMeta=ctx.currentProfile?profileMetadata(ctx.currentProfile):null;document.title=(profileMeta?.title||h1)+' · Madbeauty';
  const contentPage=ctx.content?.pages.find(p=>'/'+p.slug===path||!p.slug&&path==='/');
  syncSharing(document,contentPage?.sharing);
  const description=profileMeta?.description||(ctx.directory?directoryDescription(ctx.directory.route,ctx.directory.rows):contentPage?.description)||h1+' · Grožio paslaugos, meistrai ir tavo vizitų laikas.';
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>s.remove());
  const schema=!ctx.temporaryTest&&!boot.privatePrototype?(ctx.currentProfile?.approved?moduleSchema(path,profileMeta.title,description,ctx.currentProfile):ctx.directory&&!location.search?directorySchema(ctx.directory.route,ctx.directory.rows):contentPage?.schema&&!path.startsWith('/paslaugos')?contentPage.schema:path.startsWith('/paslaugos')&&catalogueRoute(path)?.indexEligible?moduleSchema(path,h1,description):null):null;
  if(schema){const script=document.createElement('script');script.type='application/ld+json';script.textContent=JSON.stringify(schema).replace(/</g,'\\u003c');document.head.append(script);}
  $('meta[name="description"]').content=description;
  if(ctx.temporaryTest)document.querySelectorAll('link[rel="canonical"]').forEach(el=>el.remove());else syncCanonical(document,contentPage?.url||CATALOGUE_ORIGIN+location.pathname);
  const publicIndexable=ctx.directory?(!ctx.directory.route.cityId||ctx.directory.rows.length>0):path.startsWith('/paslaugos')?catalogueRoute(path)?.indexEligible:!!(contentPage||ctx.currentProfile?.approved||trustPages[path]);
  $('meta[name="robots"]').content=ctx.temporaryTest?'noindex,nofollow':!boot.privatePrototype&&!location.search&&publicIndexable?'index,follow':'noindex,follow';saveUI();
}
async function selectRole(role,organizationId='demo-org-0',clientId='demo-client-0',target=null){if(state.booking?.hold)await ctx.adapter.releaseHold(state.booking.hold.id);state.session={role,organizationId,clientId};state.booking=null;saveUI();await navigate(target||({customer:'/paskyra/vizitai',professional:'/meistrui',operator:'/operatorius'})[role]||'/');}
async function beginBooking(id,candidate=null,practitionerId=null){
  if(state.booking?.hold)await ctx.adapter.releaseHold(state.booking.hold.id);
  const rows=await ctx.adapter.catalog(),s=rows.find(s=>s.id===id);if(!s)throw Object.assign(Error('Ši paslauga šiuo metu nepasiekiama. Atnaujink profilį arba pasirink kitą paslaugą.'),{code:'SERVICE_UNAVAILABLE'});
  if(s.bookingMode&&s.bookingMode!=='instant'){state.booking=null;saveUI();await commonAction('inquiry',{dataset:{id}});return;}
  const user=ctx.realAdapter.session?.user;state.booking={serviceId:id,practitionerId:candidate?.practitionerId||practitionerId||s.practitionerId,addons:[],candidate,contact:{name:ctx.adapter.mode==='real'?(user?.name||''):'Pavyzdžio klientė',email:ctx.adapter.mode==='real'?(user?.email||''):'demo-guest@example.com'},idempotencyKey:'confirm-'+crypto.randomUUID(),result:null};saveUI();await navigate('/registracija/paslauga');
}
async function commonAction(action,b){
  if(await waitlistAction(ctx,action,b))return true;
  if(!boot.privatePrototype&&['demo-controls','reset-demo','enable-demo'].includes(action))return true;
  const id=b.dataset.id;
  if(action==='discard-form-draft'){const form=b.closest('form');discardDraft(ctx,form);if(form.id==='service-editor')await workspaceAction(ctx,'edit-service',{dataset:{id:ctx.editing.entity.id}});toast('Neįrašytas juodraštis atmestas.');return true;}
  if(action==='close-dialog'){closeDialog();return true;}
  if(await accountAction(ctx,action))return true;
  if(action==='mobile-menu'){const header=$('#header');header.classList.toggle('menu-open');b.setAttribute('aria-expanded',header.classList.contains('menu-open'));return true;}
  if(action==='reload-view'){if(ctx.startupError){try{await ctx.realAdapter.refreshSession();ctx.startupError=null;adapter();}catch(e){ctx.startupError=e;}}await render();$('#main').focus({preventScroll:true});return true;}
  if(action==='demo-controls'){
    openDialog('Privačios demonstracijos valdikliai',`<p>Visi veiksmai vietiniai. Scenarijus taikomas bendram adapteriui, o laikrodis perduodamas visiems ekranams.</p><form id="demo-settings">${select('režimas','enabled',[['on','Įjungtas'],['off','Išjungtas']],state.enabled?'on':'off')}${select('Scenarijus','scenario',SCENARIOS.map(s=>[s,s]),state.scenario)}${field('Vienas UTC laikrodis','clock',state.clock,'text','required')}${select('Testinių įrašų paskyra','fixtureRole',[['guest','Svečias'],['customer','Klientas'],['professional','Meistras'],['operator','Operatorius']],state.session.role)}${field('Testinės organizacijos ID','fixtureOrg',state.session.organizationId||'demo-org-0')}${field('Testinio kliento ID','fixtureClient',state.session.clientId||'demo-client-0')}<button class="button accent">Taikyti</button></form><div class="divider"></div>${btn('reset-demo','Išvalyti  ir pradėti iš naujo','','button outline')}<p class="hint">Tai nėra tikras prisijungimas, production būsena ar duomenų migracija.</p>`);return true;
  }
  if(action==='reset-demo'){localStorage.removeItem(DEMO_NAMESPACE);localStorage.removeItem(DEMO_NAMESPACE+':ui');sessionStorage.removeItem(DEMO_NAMESPACE+':ui');state=initial();ctx.state=state;adapter();closeDialog();await navigate('/');toast('Madbeauty vietiniai  duomenys išvalyti.');return true;}
  if(action==='enable-demo'){state.enabled=true;adapter();await render();return true;}
  if(action==='favorite'){
    const host=b.closest('.service-card')||b.parentElement;host.querySelectorAll('.favorite-error').forEach(x=>x.remove());
    if(ctx.adapter.mode==='real'){
      if(!ctx.realAdapter.session?.user){state.afterAuth=ctx.path;await navigate('/paskyra');return true;}
      const saved=b.getAttribute('aria-pressed')!=='true';
      try{state.favorites=await ctx.adapter.favorite({organizationId:id,saved});}
      catch(err){b.insertAdjacentHTML('beforebegin',`<div class="favorite-error" style="flex-basis:100%">${errorHTML(err)}</div>`);const alert=b.previousElementSibling.querySelector('.error-box');alert.setAttribute('tabindex','-1');alert.focus();return true;}
    }else state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];
    saveUI();for(const control of document.querySelectorAll('[data-action="favorite"]'))if(control.dataset.id===id){const saved=state.favorites.includes(id);control.setAttribute('aria-pressed',String(saved));if(control.classList.contains('favorite'))control.setAttribute('aria-label',saved?'Pašalinti iš išsaugotų':'Išsaugoti profilį');else control.innerHTML=icon('heart')+' '+(saved?'Pašalinti iš išsaugotų':'Išsaugoti');}
    toast(state.favorites.includes(id)?'Profilis išsaugotas.':'Profilis pašalintas iš išsaugotų.');if(ctx.path==='/paskyra/issaugoti'){await render();$('#main').focus({preventScroll:true});}return true;
  }
  if(action==='home-day'){state.search.diena=Number(id);saveUI();await render();return true;}
  if(action==='search-results'){state.search.rezultatai=id;await navigate(ctx.path+searchHash(state.search),{preserve:true});return true;}
  if(action==='map-location'){ctx.mapLocationId=id;await render();return true;}
  if(action==='search-location'){openDialog('Vieta atstumui',locationDialog(ctx),{restore:false});return true;}
  if(action==='clear-search-location'){delete ctx.searchPoint;if(state.search.rikiuoti==='atstumas')state.search.rikiuoti='laikas';closeDialog();await navigate(ctx.path+searchHash(state.search),{preserve:true});return true;}
  if(action==='search-geolocation'){
    if(!navigator.geolocation){toast('Vietos nustatymas nepasiekiamas. Įvesk koordinates.');return true;}
    b.disabled=true;b.textContent='Nustatoma vieta…';
    try{const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:60000,timeout:10000}));ctx.searchPoint={latitude:position.coords.latitude,longitude:position.coords.longitude};state.search.rikiuoti='atstumas';closeDialog();await navigate(ctx.path+searchHash(state.search),{preserve:true});}
    catch{b.disabled=false;b.textContent='Naudoti mano vietą';toast('Vietos nustatyti nepavyko. Gali įvesti koordinates pats.');}return true;
  }
  if(action==='professional-service'){await beginBooking(id,null,b.dataset.practitioner);return true;}
  if(action==='search-view'){state.search.vaizdas=id;await navigate(ctx.path+searchHash(state.search),{preserve:true});return true;}
  if(action==='clear-filters'){state.search={...state.search,tipas:'',max:'',vardas:'',rikiuoti:'laikas'};await navigate(ctx.path+searchHash(state.search),{preserve:true});return true;}
  if(action==='map-area'){toast('Pasirinkta sritis pritaikyta.');return true;}
  if(action==='map-profile'){const rows=await ctx.adapter.catalog();const r=rows.find(s=>s.organizationId===id);await navigate(profileURL(r));return true;}
  if(['begin-booking','quick-slot'].includes(action)){const c=action==='quick-slot'?ctx.candidates.get(id):null;await beginBooking(c?.providerServiceId||id,c);return true;}
  if(action==='service-option'){const s=ctx.currentProfile?.services.find(s=>s.id===id)||(await ctx.adapter.catalog()).find(s=>s.id===id);if(s?.bookingMode&&s.bookingMode!=='instant')return commonAction('inquiry',{dataset:{id}});openDialog('Paslauga ir priedai',`<h3>${esc(s.label)}</h3><p>${s.addonGroups?.some(g=>g.min>0)?"Bazinė paslauga: ":""}${s.durationMin} min. · ${money(s.priceMinor)}</p>${s.addonGroups?.some(g=>g.min>0)?"<p>Būtina pasirinkti priedus. Jie keičia galutinę kainą ir trukmę.</p>":""}${s.addons.map(a=>`<p>${esc(a.label)}: +${a.durationMin} min. · +${money(a.priceMinor)}</p>`).join('')}<p>Grafike papildomai tikrinamas ${s.bufferBeforeMin} min. paruošimas ir ${s.bufferAfterMin} min. sutvarkymas.</p>${btn('begin-booking','Pasirinkti šį variantą',`data-id="${id}"`,'button accent')}`);return true;}
  if(action==='choose-staff'){const s=ctx.currentProfile.services.find(s=>s.practitionerId===id||s.staffOptions?.some(p=>p.practitionerId===id));if(s)await beginBooking(s.id,null,id);else toast('Šio meistro paslaugos dar nepateiktos.');return true;}
  if(action==='gallery'){const source=ctx.currentProfile?.gallery||[],images=source.includes(id)?source:[id];ctx.gallery={images,index:Math.max(0,images.indexOf(id))};galleryDialog();return true;}
  if(action==='gallery-next'){ctx.gallery.index=(ctx.gallery.index+Number(id)+ctx.gallery.images.length)%ctx.gallery.images.length;galleryDialog();return true;}
  if(action==='inquiry'||action==='waitlist'){if(ctx.adapter.mode==='real'&&!ctx.realAdapter.session?.user){ctx.state.afterAuth=ctx.path;await navigate('/paskyra');return true;}const s=(await ctx.adapter.catalog()).find(s=>s.id===id)||ctx.currentProfile?.services.find(s=>s.id===id);if(!s)return true;ctx.waitlistKey='waitlist-'+crypto.randomUUID();const structured=action==='waitlist'&&ctx.adapter.mode==='real';openDialog(action==='waitlist'?'Laukiančiųjų sąrašas':s.bookingMode==='consultation'?'Konsultacijos užklausa':'Užklausa',`<p><strong>${esc(s.label)}</strong><br>${esc(s.organizationName||ctx.currentProfile?.name||'Paslaugos teikėjas')} · ${s.durationMin} min. · ${money(s.priceMinor)}</p><p>${s.bookingMode==='consultation'?'Pirmiausia aptarsi konsultacijos apimtį su teikėju.':'Tai pageidavimas.'} Laikas patvirtinamas atskirai.</p><form id="inquiry-form"><input type="hidden" name="organizationId" value="${s.organizationId}"><input type="hidden" name="providerServiceId" value="${s.id}"><input type="hidden" name="waitlist" value="${action==='waitlist'}">${structured?waitlistFields(ctx,s):''}${textarea(structured?'Papildoma pastaba':'Pageidaujamas laikas','note','',`${structured?'':'required '}maxlength="500"`)}<button class="button accent">Išsaugoti ${action==='waitlist'?'pageidavimą':'užklausą'}</button></form>`);return true;}
  if(action==='report'){if(ctx.adapter.mode==='real'&&!ctx.realAdapter.session?.user){state.afterAuth=ctx.path;await navigate('/paskyra');return true;}delete ctx.reportIntent;openDialog('Pranešti neatitikimą',`<p>Nurodyk konkrečią problemą. Pranešimą peržiūrės platformos operatorius.</p><form id="report-form"><input type="hidden" name="target" value="${esc(id)}">${textarea('Problemos aprašymas','note','','required maxlength="500"')}<button class="button accent">Išsaugoti  pranešimą</button></form>`);return true;}
  return false;
}
function galleryDialog(){const g=ctx.gallery;openDialog('Galerija · '+(g.index+1)+' / '+g.images.length,`${photo(ctx,g.images[g.index],'','(max-width:760px) 90vw, 650px')}<div class="toolbar">${btn('gallery-next','Ankstesnė','data-id="-1"','button outline')}${btn('gallery-next','Kita','data-id="1"','button outline')}</div>${ctx.adapter.mode==='real'?btn('report','Pranešti apie šį vaizdą',`data-id="${esc(g.images[g.index])}"`,'button outline small'):''}`);}
async function commonForm(form,fd){
  if(form.id==='provider-directory'){const params=new URLSearchParams();for(const [key,value]of fd)if(String(value).trim())params.set(key,String(value).trim());await navigate(ctx.path+'?'+params);return true;}
  if(form.id==='services-directory-search'){const q=String(fd.get('q')||'').trim().slice(0,80);await navigate('/paslaugos'+(q?'?'+new URLSearchParams({q}):'')+'#kategorijos');return true;}
  if(form.id==='catalogue-picker'){const destination=cataloguePickerDestination(fd.get('paslauga'),fd.get('miestas')||'');if(!destination)throw userError('Pasirink paslaugą ir miestą iš sąrašo.');await navigate(destination,{preserve:true});return true;}
  if(form.id==='catalogue-city'){const node=activeNode(fd.get('paslauga')),city=fd.get('miestas');if(!node||!isCityId(city))throw userError('Pasirink paslaugą ir miestą.');const destination=catalogueCityDestination('/paslaugos/'+node.id,city,await ctx.adapter.catalog({}));await navigate(destination);return true;}
  if(await accountForm(ctx,form,fd))return true;
  if(['home-search','results-search'].includes(form.id)){const t=[{id:'all',label:'Visos paslaugos'},...(ctx.catalogueNodes||ctx.taxonomy)].find(t=>t.id===fd.get('paslauga')||t.label.toLocaleLowerCase('lt')===String(fd.get('paslauga')).toLocaleLowerCase('lt'));if(!t||!isCityId(fd.get('miestas')))throw userError('Pasirinkite paslaugą ir miestą iš sąrašo.');const [nuo,iki]=String(fd.get('intervalas')).split(',');state.search={...state.search,paslauga:t.id,miestas:fd.get('miestas'),diena:Number(fd.get('diena')),nuo,iki};await navigate('/paieska'+searchHash(state.search));return true;}
  if(form.id==='filters'){state.search={...state.search,...Object.fromEntries(fd)};await navigate(ctx.path+searchHash(state.search));return true;}
  if(form.id==='search-location'){const latitude=Number(fd.get('latitude')),longitude=Number(fd.get('longitude'));if(!String(fd.get('latitude')).trim()||!String(fd.get('longitude')).trim()||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw userError('Įvesk galiojančią platumą ir ilgumą.');ctx.searchPoint={latitude,longitude};state.search.rikiuoti='atstumas';closeDialog();await navigate(ctx.path+searchHash(state.search),{preserve:true});return true;}
  if(form.id==='guide-cta'){const node=activeNode(fd.get('paslauga')),city=fd.get('miestas');if(!node||city&&!isCityId(city))throw userError('Pasirink paslaugą ir miestą iš sąrašo.');state.search.paslauga=node.id;if(city)state.search.miestas=city;await navigate(city?'/paieska'+searchHash(state.search):'/paslaugos/'+node.id);return true;}
  if(form.id==='demo-settings'){makeClock(fd.get('clock'));if(state.booking?.hold)await ctx.adapter.releaseHold(state.booking.hold.id);state.enabled=fd.get('enabled')==='on';state.scenario=fd.get('scenario');if(state.clock!==fd.get('clock'))localStorage.removeItem(DEMO_NAMESPACE);state.clock=fd.get('clock');state.booking=null;state.favorites=[];state.session={role:fd.get('fixtureRole')||'guest',organizationId:fd.get('fixtureOrg')||'demo-org-0',clientId:fd.get('fixtureClient')||'demo-client-0'};adapter();closeDialog();const target=state.enabled?({customer:'/paskyra/vizitai',professional:'/meistrui/kalendorius',operator:'/operatorius'})[state.session.role]:null;if(target)await navigate(target);else await render();return true;}
  if(form.id==='inquiry-form'){if(fd.get('waitlist')==='true'&&ctx.adapter.mode==='real'){await ctx.adapter.createWaitlist({...Object.fromEntries(fd),from:minute(fd.get('from')),to:minute(fd.get('to')),addons:fd.getAll('addon'),idempotencyKey:ctx.waitlistKey});}else await ctx.adapter.createInquiry({...Object.fromEntries(fd),waitlist:fd.get('waitlist')==='true'});closeDialog();await navigate('/paskyra/vizitai#būsena=pageidavimai');toast('Pageidavimas išsaugotas. Laikas dar nepatvirtintas.');return true;}
  if(form.id==='report-form'){if(ctx.adapter.mode==='real'&&!ctx.realAdapter.session?.user){state.afterAuth=ctx.path;ctx.toast('Pranešimui prisijunk el. paštu, tada grįžk į šį puslapį.');await navigate('/paskyra');return true;}await submitReport(ctx,Object.fromEntries(fd));closeDialog();toast('Pranešimas išsaugotas operatoriaus eilėje.');form.reset();form.querySelector('.draft-recovery')?.remove();return true;}
  return false;
}
document.addEventListener('click',async e=>{
  const a=e.target.closest('a');if(a&&a.origin===location.origin&&!a.hasAttribute('download')&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&a.target!=='_blank'){
    if(ctx.temporaryTest&&a.pathname==='/bandymo-paskyros')return;
    if(a.getAttribute('href').startsWith('#')&&!a.getAttribute('href').startsWith('#paslauga=')){const target=document.getElementById(decodeURIComponent(a.hash.slice(1)));if(target)return;}
    e.preventDefault();await navigate(a.pathname+a.search+a.hash);return;
  }
  const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();if(b.disabled)return;const hadFocus=b.contains(document.activeElement);ctx.actionOpener=b;b.disabled=true;
  try{if(!await commonAction(b.dataset.action,b)&&!await bookingAction(ctx,b.dataset.action,b))await workspaceAction(ctx,b.dataset.action,b);}
  catch(err){if($('#dialog').open){const body=$('#dialog .dialog-body');body.querySelectorAll('.error-box').forEach(x=>x.remove());body.insertAdjacentHTML('afterbegin',errorHTML(err));const alert=body.querySelector('.error-box');alert.setAttribute('tabindex','-1');alert.focus();}else toast(err.message);}
  finally{if(b.isConnected){b.disabled=false;if(hadFocus&&document.activeElement===document.body)b.focus({preventScroll:true});}if(ctx.actionOpener===b)ctx.actionOpener=null;}
});
document.addEventListener('change',async e=>{if(e.target.form?.id==='manual-options'&&e.target.name==='serviceId'){$('#manual-service-summary').innerHTML=manualServiceSummary(ctx,e.target.value);return;}if(!['booking-services','booking-staff','visit-sequence-services'].includes(e.target.form?.id))return;try{await bookingChange(ctx,e.target);}catch(err){toast(err.message);}});
document.addEventListener('input',e=>{if(e.target.hasAttribute('data-procedure-query'))filterProcedures(e.target);const f=e.target.form;if(f){clearFieldError(e.target);saveDraft(ctx,f);}});
document.addEventListener('change',e=>{const f=e.target.form;if(f){syncConditionalFields(f);saveDraft(ctx,f);}});
document.addEventListener('submit',async e=>{const f=e.target;if(!(f instanceof HTMLFormElement))return;e.preventDefault();if(f.getAttribute('aria-busy')==='true'||!validateForm(f))return;const b=e.submitter||f.querySelector('button[type=submit],button:not([type])');if(b?.disabled)return;const label=b?.innerHTML,key=suspendDraft(ctx,f);let success=false;if(b){b.disabled=true;b.textContent='Vykdoma…';}f.setAttribute('aria-busy','true');f.querySelectorAll('.error-box').forEach(x=>x.remove());
  try{const fd=new FormData(f);if(!await commonForm(f,fd)&&!await bookingForm(ctx,f,fd))await workspaceForm(ctx,f,fd);success=true;}
  catch(err){f.insertAdjacentHTML('afterbegin',errorHTML(err));f.querySelector('.error-box').setAttribute('tabindex','-1');f.querySelector('.error-box').focus();}
  finally{finishDraft(key,success&&f.dataset.operationPending!=='true');if(f.dataset.operationPending==='true')saveDraft(ctx,f);if(b?.isConnected){b.disabled=false;b.innerHTML=label;}f.removeAttribute('aria-busy');saveUI();}
});
window.addEventListener('popstate',async()=>{if(viewKey()!==renderedViewKey){await render();fragmentTarget()?.scrollIntoView({behavior:'instant'});}});
window.addEventListener('hashchange',()=>{if(location.hash.includes('=')&&viewKey()!==renderedViewKey)render();});
function alignWorkspaceNavigation(){
 const nav=$('#main .sidebar nav'),active=nav?.querySelector('.active');if(!active)return;
 if(matchMedia('(max-width:760px)').matches)nav.scrollLeft=Math.max(0,active.offsetLeft-nav.offsetLeft-(nav.clientWidth-active.offsetWidth)/2);
 else {const sidebar=$('#main .sidebar');sidebar.scrollTop=Math.max(0,active.offsetTop-(sidebar.clientHeight-active.offsetHeight)/2);}
}
let navResizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(navResizeFrame);navResizeFrame=requestAnimationFrame(alignWorkspaceNavigation);},{passive:true});
let previousScroll=window.scrollY,distance=0,direction=0;
window.addEventListener('scroll',()=>{const y=window.scrollY,delta=y-previousScroll,next=Math.sign(delta);if(next!==direction){direction=next;distance=0;}distance+=Math.abs(delta);previousScroll=y;const h=$('#header');if(document.body.classList.contains('workspace-page')||y<220||h.contains(document.activeElement)||$('#dialog').open||h.classList.contains('menu-open'))h.classList.remove('is-hidden');else if(delta>0&&distance>64)h.classList.add('is-hidden');else if(delta<0&&distance>12)h.classList.remove('is-hidden');},{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Tab')$('#header').classList.remove('is-hidden');if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='d'){e.preventDefault();commonAction('demo-controls',{dataset:{}});}});
await render();
fragmentTarget()?.scrollIntoView({behavior:'instant'});
