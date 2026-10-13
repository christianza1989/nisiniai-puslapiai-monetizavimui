import test from 'node:test';import assert from 'node:assert/strict';
import {publicModuleEntries,moduleDiscovery,moduleSchema,profilePath} from './public-modules.mjs';
test('Provider discovery uses public approval, shares exact canonical paths and invents no editorial dates',()=>{
 const profile={id:'provider_fixture',kind:'solo',approved:true,name:'Izoliuotas testas',city:'Kaunas',bio:'Viešas aprašymas',location:{publicAddress:''},services:[{label:'Manikiūras',durationMin:30,priceMinor:2000}]};
 const pages=[{slug:'apie'}],trust={'/apie':{title:'Apie',body:'Patvirtintas turinys'},'/privatumas':{title:'Privatumas',body:'<p>MB Pinet</p>'}};
 const entries=publicModuleEntries(pages,trust,[profile,{...profile,id:'private',approved:false}]);
 assert.deepEqual(entries.map(e=>e.path),['/privatumas',profilePath(profile)]);
 const content={pkg:{},pages,seo:{nicheSitemapXml:()=>'<urlset><url><loc>https://madbeauty.lt/apie</loc></url></urlset>',nicheLlmsIndex:()=> 'Vieši gidai',nicheLlmsFull:()=> 'Pilni gidai'}};
 for(const path of ['/sitemap.xml','/llms.txt','/llms-full.txt']){const result=moduleDiscovery(content,path,entries);assert.ok(result.includes('https://madbeauty.lt/meistrai/provider_fixture'));assert.ok(result.includes('https://madbeauty.lt/privatumas'));assert.ok(!result.includes('private'));assert.ok(!result.includes('lastmod'));assert.ok(!result.includes('Publikavimo data'));}
 assert.ok(!moduleDiscovery(content,'/sitemap.xml',publicModuleEntries(pages,trust,[])).includes('provider_fixture'));
 const graph=moduleSchema(profilePath(profile),profile.name,profile.bio,profile)['@graph'];
 assert.equal(graph[1].hasOfferCatalog.itemListElement[0].price,'20.00');assert.ok(!JSON.stringify(graph).includes('datePublished'));assert.ok(!JSON.stringify(graph).includes('aggregateRating'));
});
