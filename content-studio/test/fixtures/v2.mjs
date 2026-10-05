import {v2RevisionHash} from '../../src/content-package-v2.mjs';
export function v2Fixture(){
  const site={id:'v2-fixture',name:'Izoliuotas redakcinis bandymas',canonicalHost:'v2-fixture.example',locale:'lt-LT',timezone:'Europe/Vilnius',brand:{accent:'#246f74'},offer:'Tik izoliuotas migracijos bandymas',contact:{email:'info@pinet.lt',phone:''},renderer:'gift',operatorName:'MB Pinet'};
  const author={id:'test-redakcija',siteId:site.id,locale:site.locale,slug:'test-redakcija',name:'Bandomoji redakcija',role:'Testas',bio:'Tik fixture, ne tikro eksperto profilis.',kind:'organization',sameAs:[]};
  const editorial=()=>({category:'Testas',readingMinutes:2,authors:[author],sources:[{id:'test-source',title:'Bandomasis šaltinis',publisher:'Fixture',url:'https://example.org/source',accessedAt:'2026-10-01T00:00:00.000Z',public:true}],datePublished:null,dateModified:null,productRecommendation:false,featuredImageId:null,relatedPageIds:[],commerceTargets:[]});
  const body=[{type:'richParagraph',content:[{type:'text',text:'Ši pastraipa skirta izoliuotam turinio modelio bandymui. Nuorodos gali pasikartoti tiksliose teksto vietose. '},{type:'link',text:'gidas',target:{kind:'page',pageId:'gift-article-1'}},{type:'text',text:' ir antras '},{type:'link',text:'gidas',target:{kind:'page',pageId:'gift-article-1'}},{type:'text',text:'. Faktai nėra viešos svetainės turinys.'}]}];
  const page=(id,type,slug,publishAt)=>({id,siteId:site.id,contentVersion:2,type,slug,title:'Bandomasis turinys',description:'Izoliuotas v2 turinio kontrakto testas.',intent:'Migracijos patikra',body:structuredClone(body),publishAt,media:[],links:[],externalLinks:[],editorial:editorial(),siteSnapshot:structuredClone(site)});
  const pages=[page('gift-home','home','','2026-10-01T00:00:00.000Z'),page('gift-article-1','article','straipsniai/bandomasis-gidas','2026-10-23T04:30:00.000Z')];
  for(const p of pages){p.revisionHash=v2RevisionHash(p);p.approval={status:'approved',revisionHash:p.revisionHash,approvedAt:'2026-10-02T00:00:00.000Z',actorId:'fixture-editor'};}
  return {schemaVersion:2,siteId:site.id,canonicalHost:site.canonicalHost,locale:site.locale,site,pages,generatedAt:'2026-10-02T00:00:00.000Z'};
}
