import {TAXONOMY_NODES,taxonomyNode} from './taxonomy.mjs';
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
export function renderCataloguePage(route,{selectedCityId=null}={}){
 const {node,cityId,offers}=route;
 const trail=[anchor('/','Pradžia'),anchor('/paslaugos','Paslaugos')];
 if(node?.parentId){const parent=taxonomyNode(node.parentId);trail.push(anchor('/paslaugos/'+parent.id,parent.label));}
 const crumbs=`<nav class="breadcrumb" aria-label="Kelias">${trail.join(' <span aria-hidden="true">/</span> ')} <span aria-current="page">${esc(route.title)}</span></nav>`;
 if(route.kind==='index')return `<div class="page container">${crumbs}<h1 class="page-title">Grožio paslaugos</h1><p>Rinkis sritį, susipažink su procedūromis ir rask paslaugą savo mieste.</p><div class="grid-2 section">${TAXONOMY_NODES.filter(n=>n.kind==='category'&&n.scope==='core').map(n=>`<section class="panel"><h2>${anchor('/paslaugos/'+n.id,n.label)}</h2><p>${TAXONOMY_NODES.filter(g=>g.parentId===n.id).map(g=>anchor('/paslaugos/'+g.id,g.label)).join(' · ')}</p></section>`).join('')}</div></div>`;
 const children=TAXONOMY_NODES.filter(n=>n.parentId===node.id&&n.scope==='core');
 const selectedCity=cityId||(isCityId(selectedCityId)?selectedCityId:null);
 const cityOptions=CITIES.map(([id,label])=>`<option value="${id}" ${id===selectedCity?'selected':''}>${esc(label)}</option>`).join('');
 const selector=`<form id="catalogue-city" action="/paslaugos/${node.id}" method="get" class="panel row wrap"><input type="hidden" name="paslauga" value="${node.id}"><div class="field"><label for="catalogue-city-select">Miestas</label><select class="input" id="catalogue-city-select" name="miestas" required><option value="">Pasirink miestą</option>${cityOptions}</select></div><button class="button accent" type="submit">Rasti paslaugas</button></form>`;
 const cities=CITIES.filter(([id])=>catalogueOffers(offers,node.id,id).length);
 const supply=cityId?`<section class="section"><h2>Paslaugas teikiantys meistrai ir salonai</h2><div class="cards">${offers.map(s=>`<article class="panel"><h3>${anchor('/'+(s.kind==='salon'?'salonai':'meistrai')+'/'+s.organizationId,s.organizationName)}</h3><p>${esc(s.label)} · ${esc(s.practitionerName)}</p><p>${esc(s.durationMin)} min. · ${(s.priceMinor/100).toFixed(2)} €</p>${anchor('/'+(s.kind==='salon'?'salonai':'meistrai')+'/'+s.organizationId,'Peržiūrėti paslaugą ir laikus')}</article>`).join('')}</div></section>`:cities.length?`<section class="section"><h2>Kur yra pasiūlymų?</h2><div class="tabs">${cities.map(([id,label])=>anchor('/paslaugos/'+node.id+'/'+id,label)).join('')}</div></section>`:'<p class="hint">Šiai paslaugai paskelbtų pasiūlymų šiuo metu nėra. Gali peržiūrėti susijusias procedūras arba pasirinkti kitą paslaugų sritį.</p>';
 return `<div class="page container">${crumbs}<h1 class="page-title">${esc(route.title)}</h1><p>${esc(node.path.join(' → '))}</p><p>Konkretaus meistro pasiūlyme patikrink paslaugos apimtį, trukmę, kainą ir priedus. Procedūros pavadinimas savaime neapibrėžia viso vizito.</p>${children.length?`<section class="section"><h2>Pasirink procedūrą</h2><div class="grid-2">${children.map(n=>`<div class="list-row">${anchor('/paslaugos/'+n.id,n.label)}</div>`).join('')}</div></section>`:''}<section class="section"><h2>Kur norėtum apsilankyti?</h2>${selector}${supply}</section>${anchor('/gidai','Grožio idėjos prieš vizitą')}</div>`;
}
