import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleSchema,profileMetadata,renderPublicProfile,reviewSummary} from '../prototype/public/profile-seo.mjs';
import {directoryRoute,directoryRows,directorySchema,renderDirectory} from '../prototype/public/provider-directory.mjs';
import {publicModuleEntries} from '../cloudflare/public-modules.mjs';
const profile={id:'provider_local-test',approved:true,name:'Tik vietinis bandymas',kind:'salon',city:'Vilnius',bio:'Bandymas <script>',location:{id:'place1',city:'Vilnius',publicAddress:'Testinė vieta',latitude:54.7,longitude:25.3},services:[{label:'Manikiūras',priceMinor:2500,durationMin:60}],gallery:['image1'],media:[{id:'image1',variants:[{file:'api/madbeauty/media/image1/640.webp',width:640}]}],reviews:[{rating:5,text:'Pirmas <script>'},{rating:4,text:'Antras'},{rating:1,text:'Nepaskelbtas',approved:false}]};
test('Profile schema, visible rating, gallery and city title use the same public projection; unrated or dummy profiles do not claim ratings',()=>{
 const schema=moduleSchema('/salonai/'+profile.id,'Testas','Aprašas',profile),business=schema['@graph'].find(x=>x['@type']==='LocalBusiness');
 assert.deepEqual(reviewSummary(profile),{count:2,rating:4.5});assert.equal(business.aggregateRating.ratingValue,4.5);assert.equal(business.aggregateRating.reviewCount,2);assert.equal(business.image,'https://madbeauty.lt/api/madbeauty/media/image1/640.webp');
 const html=renderPublicProfile(profile);assert.ok(html.includes('4,5 / 5 · 2 atsiliepimai'));assert.ok(html.includes('Darbų galerija'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('Nepaskelbtas'));assert.ok(profileMetadata(profile).title.includes('Grožio salonas, Vilnius'));
 assert.ok(!moduleSchema('/salonai/x','x','x',{...profile,reviews:[]})['@graph'].find(x=>x['@type']==='LocalBusiness').aggregateRating);
 for(const p of [{...profile,approved:false},{...profile,isDemo:true},{...profile,id:'demo-org-0'}])assert.ok(!moduleSchema('/x','x','x',p)['@graph'].some(x=>x['@type']==='LocalBusiness'));
});
test('City directory shows only public matching locations; transparent rating sort, filters and map use actual public values',()=>{
 const route=directoryRoute('/salonai/miestas/vilnius');assert.equal(directoryRoute('/salonai/miestas/not-a-city'),null);assert.equal(directoryRoute('/salonai/provider_abc'),null);
 const rows=directoryRows(route,[profile,{...profile,id:'provider_second',name:'Antras',reviews:[{rating:5,text:'Tikras'}]},{...profile,id:'provider_kaunas',city:'Kaunas',location:{city:'Kaunas'}},{...profile,id:'demo-org-0'},{...profile,id:'private',approved:false},{...profile,id:'provider_solo',kind:'solo'}]);assert.equal(rows.length,2);
 const html=renderDirectory(route,rows,new URLSearchParams({vaizdas:'zemelapis'}));assert.ok(html.indexOf('href="/salonai/provider_second"')<html.indexOf('href="/salonai/provider_local-test"'));assert.ok(html.includes('www.openstreetmap.org/export/embed.html'));assert.ok(!html.includes('provider_kaunas'));assert.ok(!html.includes('demo-org-0'));assert.ok(html.includes('103')===false);assert.ok(html.includes('/salonai/miestas/akmene'));
 assert.ok(renderDirectory(route,rows,new URLSearchParams({max:'10'})).includes('Atitikmenų neradome'));assert.ok(renderDirectory(route,rows,new URLSearchParams({q:'manikiuras'})).includes('2 veiklos vietos'));
 assert.equal(directorySchema(route,rows)['@graph'].find(x=>x['@type']==='ItemList').itemListElement.length,2);
});
test('Discovery includes real approved profile and its populated city, excludes demo and private profiles',()=>{
 const entries=publicModuleEntries([],{},[profile,{...profile,id:'demo-org-0',city:'Kaunas'},{...profile,id:'private',approved:false,city:'Akmenė'}]);const paths=entries.map(e=>e.path);
 assert.ok(paths.includes('/salonai/miestas/vilnius'));assert.ok(paths.includes('/salonai/provider_local-test'));assert.ok(!paths.includes('/salonai/miestas/kaunas'));assert.ok(!paths.some(p=>p.includes('demo-org')||p.includes('private')));
});
