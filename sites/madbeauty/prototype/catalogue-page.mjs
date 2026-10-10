import {TAXONOMY_NODES,taxonomyNode,searchableTaxonomy} from './taxonomy.mjs';
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
 if(path==='/paslaugos')return {path,title:'Grožio paslaugos',kind:'index',offers:[],indexEligible:false};
 const m=path.match(/^\/paslaugos\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);if(!m)return null;
 const node=activeNode(m[1]),cityId=m[2]||null;if(!node||cityId&&!isCityId(cityId))return null;
 const rows=catalogueOffers(offers,node.id,cityId);if(cityId&&!rows.length)return null;
 return {path,node,cityId,kind:cityId?'local':'national',offers:rows,title:node.label+(cityId?' · '+cityName(cityId):''),indexEligible:false};
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
function serviceIndex(crumbs,query){
 const directory=serviceDirectory(query),q=directory.query;
 return `<div class="page container services-page">${crumbs}<section class="services-hero" aria-labelledby="services-title"><div class="services-hero-copy"><h1 id="services-title">Grožio paslaugos</h1><p>Rinkis savo grožio ritualą. Atrask paslaugą savo mieste.</p><form id="services-directory-search" class="services-search" action="/paslaugos" method="get" role="search" aria-label="Paslaugų katalogo paieška"><label class="services-query"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span class="services-sr-only">Kokios paslaugos ieškai?</span><input type="search" name="q" placeholder="Kokios paslaugos ieškai?" value="${esc(q)}" maxlength="80" autocomplete="off"></label><button class="button accent" type="submit">Ieškoti</button></form></div><div class="services-hero-art" aria-hidden="true">${illustration('services-hero',{hero:true,sizes:'(max-width:760px) 90vw, 480px'})}</div></section><section id="kategorijos" class="services-directory" aria-labelledby="services-categories-title"><div class="services-section-heading"><h2 id="services-categories-title">${q?'Paieškos rezultatai':'Atrask pagal kategoriją'}</h2><p>${q?'Paslaugos pagal „'+esc(q)+'“.':'Nuo kasdienės priežiūros iki ypatingos progos.'}</p>${q?'<a class="link" href="/paslaugos">Rodyti visas kategorijas</a>':''}</div>${directory.categories.length?`<div class="services-grid">${directory.categories.map(n=>`<a class="services-category" href="/paslaugos/${n.id}"><div class="services-category-art" aria-hidden="true">${illustration(illustrationIds[n.id]||n.id)}</div><div class="services-category-copy"><h3>${esc(n.label)}</h3><p>${esc(TAXONOMY_NODES.filter(g=>g.parentId===n.id).slice(0,3).map(g=>g.label).join(' · '))}</p><span class="services-card-arrow">${arrow}</span></div></a>`).join('')}</div>`:`<div class="services-empty" role="status"><h3>Tokios paslaugos neradome</h3><p>Pabandyk trumpesnį pavadinimą, pavyzdžiui, „manikiūras“, „kirpimas“ ar „masažas“.</p><a class="button outline" href="/paslaugos">Peržiūrėti visas kategorijas</a></div>`}${q&&directory.matches.some(n=>n.kind!=='category')?`<div class="services-matches"><h3>Susijusios procedūros</h3>${directory.matches.length>12?'<p>Rodomi pirmi 12 atitikmenų. Patikslink paiešką arba atidaryk kategoriją.</p>':''}<ul>${directory.matches.filter(n=>n.kind!=='category').slice(0,12).map(n=>`<li><a href="/paslaugos/${n.id}"><span><strong>${esc(n.label)}</strong><small>${esc(n.path.slice(0,-1).join(' · '))}</small></span>${arrow}</a></li>`).join('')}</ul></div>`:''}</section><aside class="services-guide"><div><h2>Dar nežinai, ką pasirinkti?</h2><p>Susipažink su procedūromis ir pasiruošk savo vizitui.</p></div><a class="link" href="/gidai">Skaityti grožio gidus ${arrow}</a><div class="services-guide-art" aria-hidden="true">${illustration('services-guide',{sizes:'180px'})}</div></aside></div>`;
}
export function renderCataloguePage(route,{selectedCityId=null,query=''}={}){
 const {node,cityId,offers}=route;
 const trail=[anchor('/','Pradžia'),anchor('/paslaugos','Paslaugos')];
 if(node?.parentId){const parent=taxonomyNode(node.parentId);trail.push(anchor('/paslaugos/'+parent.id,parent.label));}
 const crumbs=`<nav class="breadcrumb" aria-label="Kelias">${trail.join(' <span aria-hidden="true">/</span> ')} <span aria-current="page">${esc(route.title)}</span></nav>`;
 if(route.kind==='index')return serviceIndex(`<nav class="breadcrumb" aria-label="Kelias">${anchor('/','Pradžia')} <span aria-hidden="true">/</span> <span aria-current="page">Paslaugos</span></nav>`,query);
 const children=TAXONOMY_NODES.filter(n=>n.parentId===node.id&&n.scope==='core');
 const selectedCity=cityId||(isCityId(selectedCityId)?selectedCityId:null);
 const cityOptions=CITIES.map(([id,label])=>`<option value="${id}" ${id===selectedCity?'selected':''}>${esc(label)}</option>`).join('');
 const selector=`<form id="catalogue-city" action="/paslaugos/${node.id}" method="get" class="panel row wrap"><input type="hidden" name="paslauga" value="${node.id}"><div class="field"><label for="catalogue-city-select">Miestas</label><select class="input" id="catalogue-city-select" name="miestas" required><option value="">Pasirink miestą</option>${cityOptions}</select></div><button class="button accent" type="submit">Rasti paslaugas</button></form>`;
 const cities=CITIES.filter(([id])=>catalogueOffers(offers,node.id,id).length);
 const supply=cityId?`<section class="section"><h2>Paslaugas teikiantys meistrai ir salonai</h2><div class="cards">${offers.map(s=>`<article class="panel"><h3>${anchor('/'+(s.kind==='salon'?'salonai':'meistrai')+'/'+s.organizationId,s.organizationName)}</h3><p>${esc(s.label)} · ${esc(s.practitionerName)}</p><p>${esc(s.durationMin)} min. · ${(s.priceMinor/100).toFixed(2)} €</p>${anchor('/'+(s.kind==='salon'?'salonai':'meistrai')+'/'+s.organizationId,'Peržiūrėti paslaugą ir laikus')}</article>`).join('')}</div></section>`:cities.length?`<section class="section"><h2>Kur yra pasiūlymų?</h2><div class="tabs">${cities.map(([id,label])=>anchor('/paslaugos/'+node.id+'/'+id,label)).join('')}</div></section>`:'<p class="hint">Šiai paslaugai paskelbtų pasiūlymų šiuo metu nėra. Gali peržiūrėti susijusias procedūras arba pasirinkti kitą paslaugų sritį.</p>';
 return `<div class="page container">${crumbs}<h1 class="page-title">${esc(route.title)}</h1><p>${esc(node.path.join(' → '))}</p><p>Konkretaus meistro pasiūlyme patikrink paslaugos apimtį, trukmę, kainą ir priedus. Procedūros pavadinimas savaime neapibrėžia viso vizito.</p>${children.length?`<section class="section"><h2>Pasirink procedūrą</h2><div class="grid-2">${children.map(n=>`<div class="list-row">${anchor('/paslaugos/'+n.id,n.label)}</div>`).join('')}</div></section>`:''}<section class="section"><h2>Kur norėtum apsilankyti?</h2>${selector}${supply}</section>${anchor('/gidai','Grožio idėjos prieš vizitą')}</div>`;
}
