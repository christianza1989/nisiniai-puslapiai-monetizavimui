import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueRoute,renderCataloguePage,cataloguePickerDestination} from '../prototype/catalogue-page.mjs';
import {TAXONOMY_NODES} from '../prototype/taxonomy.mjs';
import {CITIES} from '../prototype/cities.mjs';
const procedure='veido-kaukes-maitinamoji-veido-procedura';
const offer={id:'test-offer',taxonomyServiceId:procedure,organizationId:'provider_test',organizationName:'Testinis teikėjas',practitionerName:'Testinis meistras',city:'Vilnius',durationMin:45,priceMinor:3500,kind:'solo',active:true};

test('A direct procedure link opens its category and group with the procedure selected, without city or service wizard pages',()=>{
 const html=renderCataloguePage(catalogueRoute('/paslaugos/'+procedure));
 assert.match(html,/data-picker-branch="veidas" open/);
 assert.match(html,/data-picker-branch="veido-kaukes" open/);
 assert.match(html,new RegExp('data-catalogue-pick="'+procedure+'" aria-current="true"'));
 assert.match(html,/name="paslauga" value="veido-kaukes-maitinamoji-veido-procedura"/);
 assert.equal((html.match(/class="picker-category"/g)||[]).length,TAXONOMY_NODES.filter(n=>n.scope==='core'&&n.kind==='category').length);
 assert.equal((html.match(/<option value="/g)||[]).length,CITIES.length+1);
 assert.match(html,/<option value="">Visa Lietuva/);
 assert.doesNotMatch(html,/id="catalogue-city"|name="miestas" required/);
});

test('National results show published offers immediately; optional city filters cannot reveal demo, inactive or unrelated supply',()=>{
 const offers=[offer,{...offer,id:'kaunas',city:'Kaunas'},{...offer,id:'demo',isDemo:true},{...offer,id:'inactive',active:false},{...offer,id:'other',taxonomyServiceId:'kirpimai-moteru-kirpimas'}];
 const route=catalogueRoute('/paslaugos/veidas',offers);
 const all=renderCataloguePage(route);assert.equal((all.match(/class="picker-offer"/g)||[]).length,2);
 const local=renderCataloguePage(route,{selectedCityId:'vilnius'});assert.equal((local.match(/class="picker-offer"/g)||[]).length,1);assert.match(local,/href="\/meistrai\/provider_test"/);
 const empty=renderCataloguePage(route,{selectedCityId:'akmene'});assert.doesNotMatch(empty,/class="picker-offer"/);assert.match(empty,/Šiame mieste pasiūlymų dar nėra/);assert.match(empty,/miestas=vilnius/);assert.match(empty,/miestas=kaunas/);
 assert.equal(route.indexEligible,false);
});

test('An empty national catalogue stays truthful and does not manufacture offered cities or providers',()=>{
 const html=renderCataloguePage(catalogueRoute('/paslaugos/'+procedure),{selectedCityId:'akmene'});
 assert.match(html,/Šiai paslaugai pasiūlymų dar nėra/);
 assert.doesNotMatch(html,/class="picker-offer"|class="picker-city-alternatives"/);
 assert.match(html,/Maitinamoji veido procedūra · Akmenė/);
});

test('The one-page destination preserves explicit service/city, accepts all cities and rejects unknown or disabled selections',()=>{
 assert.equal(cataloguePickerDestination(procedure,'akmene'),'/paslaugos/'+procedure+'?rodyti=1&miestas=akmene#pasiulymai');
 assert.equal(cataloguePickerDestination(procedure),'/paslaugos/'+procedure+'?rodyti=1#pasiulymai');
 assert.match(cataloguePickerDestination('veido-prieziura'),/^\/paslaugos\/veidas\?/);
 for(const [id]of CITIES)assert.ok(cataloguePickerDestination(procedure,id),id);
 assert.equal(cataloguePickerDestination('unknown'),null);assert.equal(cataloguePickerDestination(procedure,'unknown'),null);
 assert.equal(cataloguePickerDestination(TAXONOMY_NODES.find(n=>n.scope==='extension').id),null);
});

test('Provider labels remain escaped and required extras never appear as an unconditional final price',()=>{
 const html=renderCataloguePage(catalogueRoute('/paslaugos/'+procedure,[{...offer,organizationName:'<script>alert(1)</script>',practitionerName:'<img onerror="bad">',label:'<b>Procedūra</b>',addonGroups:[{min:1}]}]));
 assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.match(html,/&lt;b&gt;/);assert.match(html,/Bazinė kaina/);
 assert.doesNotMatch(html,/<script>|<img onerror|<b>/);
});
