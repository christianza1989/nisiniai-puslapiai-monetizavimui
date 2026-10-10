import {TAXONOMY_NODES,taxonomyNode,searchableTaxonomy,normalizeSearch,matchesTaxonomy} from './taxonomy.mjs';
import {SERVICES_MEDIA} from './services-media.mjs';
import {CITIES,cityName,isCityId} from './cities.mjs';
import {activeNode,catalogueOffers} from './content-targets.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const anchor=(path,label)=>`<a class="link" href="${esc(path)}">${esc(label)}</a>`;
export function catalogueCityDestination(path,cityId,offers=[]){
 const match=path.match(/^\/paslaugos\/([a-z0-9-]+)$/),node=match&&activeNode(match[1]);
 if(!node||!isCityId(cityId))return null;
 if(catalogueOffers(offers,node.id,cityId).length)return path+'/'+cityId;
 return '/paieska#'+new URLSearchParams({paslauga:node.id,miestas:cityId});
}
export function catalogueRoute(path,offers=[]){
 if(path==='/paslaugos')return {path,title:'Grožio paslaugos',kind:'index',offers:[],indexEligible:true};
 const m=path.match(/^\/paslaugos\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);if(!m)return null;
 const node=activeNode(m[1]),cityId=m[2]||null;if(!node||cityId&&!isCityId(cityId))return null;
 const rows=catalogueOffers(offers,node.id,cityId);if(cityId&&!rows.length)return null;
 return {path,node,cityId,kind:cityId?'local':'national',offers:rows,title:node.label+(cityId?' · '+cityName(cityId):''),indexEligible:!cityId&&node.kind==='category'};
}
const illustrationIds={veidas:'veido-prieziura',kunas:'kuno-prieziura',spa:'spa-ir-poilsis',verimas:'auskaru-verimas',estetika:'estetines-proceduros'};
const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function illustration(id,{hero=false,sizes='(max-width:600px) 42vw, (max-width:1100px) 28vw, 290px'}={}){
 const variants=SERVICES_MEDIA[id].variants,preferred=variants.find(v=>v.width===640)||variants[0];
 return `<img class="services-illustration" src="/${preferred.file}" srcset="${variants.map(v=>'/'+v.file+' '+v.width+'w').join(', ')}" sizes="${sizes}" width="${preferred.width}" height="${preferred.height}" alt="" ${hero?'fetchpriority="high" loading="eager"':'loading="lazy"'} decoding="async">`;
}
export function serviceDirectory(query=''){
 const q=String(query).trim().slice(0,80),matches=q?searchableTaxonomy(q,{scope:'core'}):[];
 const categoryIds=new Set(matches.map(n=>n.categoryId));
 return {query:q,matches,categories:TAXONOMY_NODES.filter(n=>n.kind==='category'&&n.scope==='core'&&(!q||categoryIds.has(n.id)))};
}
export function renderHomeServices(){
 const categories=serviceDirectory().categories;
 return `<section id="home-services" class="section container home-services" aria-labelledby="home-services-title"><div class="section-head"><div><h2 id="home-services-title">Ką norėtum šiandien?</h2><p>Visos grožio paslaugos. Rinkis tai, kas tinka tau.</p></div><a class="link" href="/paslaugos">Žiūrėti visas paslaugas ${arrow}</a></div><div class="home-services-grid">${categories.map(n=>`<a class="home-service" href="/paslaugos/${n.id}"><div class="home-service-art" aria-hidden="true">${illustration(illustrationIds[n.id]||n.id,{sizes:'(max-width:760px) 110px, (max-width:1100px) 160px, 190px'})}</div><div class="home-service-copy"><h3>${esc(n.label)}</h3><p>${esc(TAXONOMY_NODES.filter(g=>g.parentId===n.id).slice(0,3).map(g=>g.label).join(' · '))}</p><span class="home-service-arrow">${arrow}</span></div></a>`).join('')}<a class="home-service home-service-guide" href="/gidai"><div class="home-service-art" aria-hidden="true">${illustration('services-guide',{sizes:'(max-width:760px) 110px, 190px'})}</div><div class="home-service-copy"><h3>Nežinai, ką rinktis?</h3><p>Atrask procedūras ir pasiruošk savo vizitui.</p><span class="home-service-guide-link">Grožio gidai ${arrow}</span></div></a></div></section>`;
}
function serviceIndex(crumbs,query){
 const directory=serviceDirectory(query),q=directory.query;
 return `<div class="page container services-page">${crumbs}<section class="services-hero" aria-labelledby="services-title"><div class="services-hero-copy"><h1 id="services-title">Grožio paslaugos</h1><p>Rinkis savo grožio ritualą. Atrask paslaugą savo mieste.</p><form id="services-directory-search" class="services-search" action="/paslaugos" method="get" role="search" aria-label="Paslaugų katalogo paieška"><label class="services-query"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span class="services-sr-only">Kokios paslaugos ieškai?</span><input type="search" name="q" placeholder="Kokios paslaugos ieškai?" value="${esc(q)}" maxlength="80" autocomplete="off"></label><button class="button accent" type="submit">Ieškoti</button></form></div><div class="services-hero-art" aria-hidden="true">${illustration('services-hero',{hero:true,sizes:'(max-width:760px) 90vw, 480px'})}</div></section><section id="kategorijos" class="services-directory" aria-labelledby="services-categories-title"><div class="services-section-heading"><h2 id="services-categories-title">${q?'Paieškos rezultatai':'Atrask pagal kategoriją'}</h2><p>${q?'Paslaugos pagal „'+esc(q)+'“.':'Nuo kasdienės priežiūros iki ypatingos progos.'}</p>${q?'<a class="link" href="/paslaugos">Rodyti visas kategorijas</a>':''}</div>${directory.categories.length?`<div class="services-grid">${directory.categories.map(n=>`<a class="services-category" href="/paslaugos/${n.id}"><div class="services-category-art" aria-hidden="true">${illustration(illustrationIds[n.id]||n.id)}</div><div class="services-category-copy"><h3>${esc(n.label)}</h3><p>${esc(TAXONOMY_NODES.filter(g=>g.parentId===n.id).slice(0,3).map(g=>g.label).join(' · '))}</p><span class="services-card-arrow">${arrow}</span></div></a>`).join('')}</div>`:`<div class="services-empty" role="status"><h3>Tokios paslaugos neradome</h3><p>Pabandyk trumpesnį pavadinimą, pavyzdžiui, „manikiūras“, „kirpimas“ ar „masažas“.</p><a class="button outline" href="/paslaugos">Peržiūrėti visas kategorijas</a></div>`}${q&&directory.matches.some(n=>n.kind!=='category')?`<div class="services-matches"><h3>Susijusios procedūros</h3>${directory.matches.length>12?'<p>Rodomi pirmi 12 atitikmenų. Patikslink paiešką arba atidaryk kategoriją.</p>':''}<ul>${directory.matches.filter(n=>n.kind!=='category').slice(0,12).map(n=>`<li><a href="/paslaugos/${n.id}"><span><strong>${esc(n.label)}</strong><small>${esc(n.path.slice(0,-1).join(' · '))}</small></span>${arrow}</a></li>`).join('')}</ul></div>`:''}</section><aside class="services-guide"><div><h2>Dar nežinai, ką pasirinkti?</h2><p>Susipažink su procedūromis ir pasiruošk savo vizitui.</p></div><a class="link" href="/gidai">Skaityti grožio gidus ${arrow}</a><div class="services-guide-art" aria-hidden="true">${illustration('services-guide',{sizes:'180px'})}</div></aside></div>`;
}
export function renderCataloguePage(route,{selectedCityId=null,query=''}={}){
 const {node}=route;
 const trail=[anchor('/','Pradžia'),anchor('/paslaugos','Paslaugos')];
 if(node?.parentId){const parent=taxonomyNode(node.parentId);trail.push(anchor('/paslaugos/'+parent.id,parent.label));}
 const crumbs=`<nav class="breadcrumb" aria-label="Kelias">${trail.join(' <span aria-hidden="true">/</span> ')} <span aria-current="page">${esc(route.title)}</span></nav>`;
 if(route.kind==='index')return serviceIndex(`<nav class="breadcrumb" aria-label="Kelias">${anchor('/','Pradžia')} <span aria-hidden="true">/</span> <span aria-current="page">Paslaugos</span></nav>`,query);
 return renderServicePicker(route,{crumbs,selectedCityId});
}

const chevron='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
const check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const coreCategories=TAXONOMY_NODES.filter(n=>n.kind==='category'&&n.scope==='core');
const childrenOf=id=>TAXONOMY_NODES.filter(n=>n.parentId===id&&n.scope==='core');
const artId=node=>illustrationIds[node.categoryId]||node.categoryId;
export function cataloguePickerDestination(serviceId,cityId=''){
 const node=activeNode(serviceId);if(!node||cityId&&!isCityId(cityId))return null;
 const query=new URLSearchParams({rodyti:'1'});if(cityId)query.set('miestas',cityId);
 return '/paslaugos/'+node.id+'?'+query+'#pasiulymai';
}
function pickerChoice(node,selected,{broad=false}={}){
 return `<a href="/paslaugos/${node.id}" class="picker-choice${selected.id===node.id?' is-selected':''}${broad?' picker-broad':''}" data-catalogue-pick="${node.id}" ${selected.id===node.id?'aria-current="true"':''}><span>${broad?'Visos šios srities paslaugos':esc(node.label)}</span><span class="picker-check">${check}</span></a>`;
}
function pickerTree(selected){
 const categories=[taxonomyNode(selected.categoryId),...coreCategories.filter(n=>n.id!==selected.categoryId)];
 return categories.map(category=>`<details class="picker-category" name="catalogue-categories" data-picker-branch="${category.id}" ${category.id===selected.categoryId?'open':''}><summary><span class="picker-thumb" aria-hidden="true">${illustration(artId(category),{sizes:'44px'})}</span><span>${esc(category.label)}</span>${chevron}</summary><div class="picker-branch-body">${pickerChoice(category,selected,{broad:true})}${childrenOf(category.id).map(group=>`<details class="picker-group" data-picker-branch="${group.id}" ${matchesTaxonomy(selected.id,group.id)?'open':''}><summary><span>${esc(group.label)}</span>${chevron}</summary><div class="picker-procedures">${pickerChoice(group,selected,{broad:true})}${childrenOf(group.id).map(n=>pickerChoice(n,selected)).join('')}</div></details>`).join('')}</div></details>`).join('');
}
function renderServicePicker(route,{crumbs,selectedCityId}){
 const {node,cityId,offers}=route,category=taxonomyNode(node.categoryId);
 const selectedCity=cityId||(isCityId(selectedCityId)?selectedCityId:'');
 const rows=catalogueOffers(offers,node.id,selectedCity||null);
 const cityOptions=CITIES.map(([id,label])=>`<option value="${id}" ${id===selectedCity?'selected':''}>${esc(label)}</option>`).join('');
 const choicePath=esc(node.path.join(' / '));
 const availableCities=CITIES.filter(([,label])=>offers.some(s=>s.city===label));
 const resultRows=rows.map(s=>{
  const profile='/'+(s.kind==='salon'?'salonai':'meistrai')+'/'+encodeURIComponent(s.organizationId);
  const price=s.addonGroups?.some(g=>g.min>0)?'Bazinė kaina':s.priceToMinor>s.priceMinor?'Nuo':'Kaina';
  return `<article class="picker-offer"><div class="picker-provider-mark" aria-hidden="true">${esc(String(s.organizationName||'').slice(0,1))}</div><div class="picker-offer-copy"><h3>${anchor(profile,s.organizationName)}</h3><p>${esc(s.label)}</p><span>${esc(s.city)}${s.practitionerName?' · '+esc(s.practitionerName):''}</span></div><div class="picker-offer-price"><small>${price}</small><strong>${(s.priceMinor/100).toFixed(2)} €</strong><span>${esc(s.durationMin)} min.</span></div><a class="button outline small" href="${esc(profile)}">Peržiūrėti ${arrow}</a></article>`;
 }).join('');
 const results=rows.length?`<div class="picker-offers">${resultRows}</div><p class="picker-note">Meistro profilyje patikrink paslaugos apimtį, priedus ir laisvus laikus.</p>`:`<div class="picker-empty"><div class="picker-empty-art" aria-hidden="true">${illustration(artId(category),{sizes:'170px'})}</div><h3>${selectedCity&&offers.length?'Šiame mieste pasiūlymų dar nėra':'Šiai paslaugai pasiūlymų dar nėra'}</h3><p>${selectedCity&&offers.length?'Paslauga teikiama kituose miestuose. Pasirink vieną iš jų arba visą Lietuvą.':'Gali rinktis kitą procedūrą iš sąrašo arba susipažinti su paslaugomis grožio giduose.'}</p>${selectedCity&&offers.length?`<div class="picker-city-alternatives">${availableCities.map(([id,label])=>`<a class="button outline small" href="${esc(cataloguePickerDestination(node.id,id))}">${esc(label)}</a>`).join('')}<a class="link" href="${esc(cataloguePickerDestination(node.id))}">Visa Lietuva</a></div>`:anchor('/gidai','Peržiūrėti grožio gidus '+ '')}</div>`;
 return `<div class="page container services-page picker-page" data-service-picker>${crumbs}<header class="picker-intro"><div><h1>${esc(category.label)}</h1><p>Rinkis tai, ko reikia tau. Paslauga, miestas ir meistrai – vienoje vietoje.</p></div><div class="picker-intro-art" aria-hidden="true">${illustration(artId(category),{sizes:'180px'})}</div></header><div class="picker-layout"><aside class="picker-sidebar" aria-labelledby="picker-tree-title"><div class="picker-tree-heading"><h2 id="picker-tree-title">Pasirink paslaugą</h2><a class="link" href="/paslaugos">Visos kategorijos ${arrow}</a></div><button type="button" class="picker-tree-toggle" data-picker-tree-toggle aria-expanded="true" aria-controls="picker-tree-body">Kategorijos ir procedūros ${chevron}</button><div id="picker-tree-body"><label class="picker-tree-search">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>'}<span class="services-sr-only">Ieškoti paslaugos ar procedūros</span><input type="search" data-picker-query placeholder="Ieškoti paslaugos ar procedūros" maxlength="80" autocomplete="off"></label><p class="picker-tree-status" data-picker-search-status role="status" hidden></p><nav class="picker-tree" aria-label="Paslaugų kategorijos ir procedūros">${pickerTree(node)}</nav></div></aside><div class="picker-content"><form id="catalogue-picker" class="picker-selection" action="/paslaugos/${node.id}" method="get"><input type="hidden" name="rodyti" value="1"><input type="hidden" name="paslauga" value="${node.id}"><div class="picker-selected"><span class="picker-selected-icon" aria-hidden="true">${check}</span><div><span class="picker-field-label">Tavo pasirinkimas</span><strong data-picker-selected-label>${esc(node.label)}</strong><small data-picker-selected-path>${choicePath}</small></div></div><div class="picker-location"><label for="picker-city">Kur ieškome?</label><select class="input" id="picker-city" name="miestas"><option value="">Visa Lietuva</option>${cityOptions}</select></div><button type="submit" class="button accent picker-submit">Rasti meistrą ${arrow}</button></form><p class="picker-pending" data-picker-pending role="status" hidden>Pasirinkimas pakeistas. Spausk „Rasti meistrą“, kad pamatytum pasiūlymus.</p><section id="pasiulymai" class="picker-results" aria-labelledby="picker-results-title"><div class="picker-results-heading"><div><h2 id="picker-results-title">Paslaugų pasiūlymai</h2><p data-picker-result-description>${esc(node.label)} · ${selectedCity?esc(cityName(selectedCity)):'Visa Lietuva'}</p></div><span class="picker-result-count">${rows.length} ${rows.length===1?'pasiūlymas':'pasiūlymų'}</span></div>${results}</section><aside class="picker-guide"><div><h2>Rinkis užtikrintai</h2><p>Sužinok, kuo skiriasi procedūros ir kaip pasiruošti vizitui.</p></div><a href="/gidai">Grožio gidai ${arrow}</a></aside></div></div></div>`;
}

export function bindCataloguePicker(root){
 const picker=root.querySelector('[data-service-picker]');if(!picker)return;
 const form=picker.querySelector('#catalogue-picker'),choices=[...picker.querySelectorAll('[data-catalogue-pick]')],branches=[...picker.querySelectorAll('[data-picker-branch]')];
 const pending=()=>{picker.querySelector('[data-picker-pending]').hidden=false;picker.querySelector('.picker-results').hidden=true;};
 const treeToggle=picker.querySelector('[data-picker-tree-toggle]');
 const setCollapsed=collapsed=>{picker.querySelector('.picker-sidebar').classList.toggle('is-collapsed',collapsed);treeToggle.setAttribute('aria-expanded',String(!collapsed));};
 treeToggle.addEventListener('click',()=>setCollapsed(treeToggle.getAttribute('aria-expanded')==='true'));
 if(window.matchMedia('(max-width:760px)').matches&&(activeNode(form.elements.paslauga.value)?.kind==='treatment'||new URLSearchParams(location.search).get('rodyti')==='1'))setCollapsed(true);
 picker.addEventListener('click',e=>{
  const choice=e.target.closest('[data-catalogue-pick]');if(!choice||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
  const node=activeNode(choice.dataset.cataloguePick);if(!node)return;
  e.preventDefault();e.stopPropagation();form.elements.paslauga.value=node.id;form.action='/paslaugos/'+node.id;
  choices.forEach(a=>{const selected=a.dataset.cataloguePick===node.id;a.classList.toggle('is-selected',selected);if(selected)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
  picker.querySelector('[data-picker-selected-label]').textContent=node.label;picker.querySelector('[data-picker-selected-path]').textContent=node.path.join(' / ');pending();
  if(window.matchMedia('(max-width:760px)').matches){setCollapsed(true);form.elements.miestas.focus({preventScroll:true});form.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
 },true);
 form.elements.miestas.addEventListener('change',pending);
 const input=picker.querySelector('[data-picker-query]'),status=picker.querySelector('[data-picker-search-status]');let savedOpen=null;
 input.addEventListener('input',()=>{
  const query=normalizeSearch(input.value);if(query&&!savedOpen)savedOpen=new Set(branches.filter(b=>b.open).map(b=>b.dataset.pickerBranch));
  const matches=query?searchableTaxonomy(query,{scope:'core'}):[];
  const visible=node=>!query||matches.some(m=>matchesTaxonomy(node.id,m.id)||matchesTaxonomy(m.id,node.id));
  choices.forEach(a=>a.hidden=!visible(activeNode(a.dataset.cataloguePick)));
  branches.filter(b=>b.classList.contains('picker-category')).forEach(b=>{if(query)b.removeAttribute('name');else b.setAttribute('name','catalogue-categories');});
  branches.forEach(b=>{b.hidden=!visible(activeNode(b.dataset.pickerBranch));if(query)b.open=!b.hidden;else if(savedOpen)b.open=savedOpen.has(b.dataset.pickerBranch);});
  status.hidden=!query;status.textContent=matches.length?'Rinkis iš paiešką atitinkančių paslaugų.':'Tokios paslaugos neradome. Pabandyk kitą pavadinimą.';
  if(!query)savedOpen=null;
 });
}
