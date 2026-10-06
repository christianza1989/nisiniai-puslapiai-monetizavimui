// Isolated acceptance data. Never imported by production runtime or seed.
import {v2RevisionHash} from '../../../../dovanos-memorycasting/scripts/content-package-v2.mjs';
import {planTarget} from '../prototype/content-targets.mjs';
export const FIXTURE_NOW=Date.parse('2026-10-06T10:00:00Z');
export function articleFixture(){
 const site={id:'madbeauty',name:'Madbeauty',canonicalHost:'madbeauty.lt',locale:'lt-LT',timezone:'Europe/Vilnius',brand:{accent:'#7040f4'},offer:'Izoliuota katalogo ir straipsnio sąsajos patikra.',contact:{email:'info@pinet.lt'},renderer:'niche',operatorName:'MB Pinet'};
 const target=planTarget({taxonomyNodeId:'lakavimas-gelinis-lakavimas',cityId:'vilnius'});
 const editorial=()=>({category:'Nagų priežiūra',readingMinutes:2,authors:[{id:'fixture-editor',siteId:'madbeauty',locale:'lt-LT',slug:'fixture-editor',name:'Izoliuoto testo redakcija',role:'Bandymas',bio:'Tik testinė sąsajos patikra.',kind:'organization',sameAs:[]}],sources:[],datePublished:'2026-10-06T08:00:00Z',dateModified:null,productRecommendation:false,featuredImageId:null,relatedPageIds:[],commerceTargets:[]});
 const page=(id,type,slug,title,body)=>({id,siteId:'madbeauty',contentVersion:2,type,slug,title,description:'Izoliuota procedūros, miesto ir straipsnio nuorodų patikra.',intent:'Sąsajos priėmimas',body,publishAt:'2026-10-06T08:00:00Z',media:[],links:[],editorial:editorial(),siteSnapshot:structuredClone(site)});
 const home=page('fixture-home','home','','Madbeauty testas',[{type:'paragraph',text:'Izoliuota turinio peržiūra.'}]);
 const article=page('fixture-guide','article','gidai/katalogo-nuorodos-testas','Pasirink manikiūrą pagal vizito apimtį',[{type:'richParagraph',content:[{type:'text',text:'Prieš pasirenkant paslaugą patikrink jos apimtį. '},{type:'link',text:'Gelinis lakavimas Vilniuje',target:{kind:'commerce',targetId:target.routeRegistryId}}]},{type:'richHeading',level:2,content:[{type:'text',text:'Ką aptarti su meistru?'}]},{type:'richList',ordered:true,items:[[{type:'text',text:'Pasitikrink kainą ir trukmę.'}],[{type:'text',text:'Aptark priedus prieš vizitą.'}]]}]);
 article.editorial.commerceTargets=[{id:target.routeRegistryId,url:target.canonicalUrl,label:target.label,relationship:'Platformos paslaugų katalogas',verified:true,checkedAt:'2026-10-06T09:00:00Z'}];
 const pkg={schemaVersion:2,siteId:'madbeauty',canonicalHost:'madbeauty.lt',locale:'lt-LT',site,pages:[home,article],generatedAt:'2026-10-06T09:00:00Z'};return signFixture(pkg);
}
export function signFixture(pkg){for(const p of pkg.pages){p.revisionHash=v2RevisionHash(p);p.approval={status:'approved',revisionHash:p.revisionHash,approvedAt:'2026-10-06T09:00:00Z',actorId:'isolated-fixture'};}return pkg;}
export function createApprovedOffer(store,api,auth){
 const session=auth.session(null),challenge=auth.start(session,'content-fixture@example.com','127.0.0.1');
 const owner=auth.verify(session,challenge.challengeId,store.capture(challenge.challengeId).code,'127.0.0.1').user;
 const org=api.createOrganization(owner,{name:'Izoliuoto testo meistrė',bio:'Tik testinė paslaugų pasiūla.',city:'Vilnius',kind:'solo'}),scope={role:'professional',organizationId:org.id},w=api.workspace(owner,scope);
 const service=api.createService(owner,{organizationId:org.id,practitionerId:w.practitioners[0].id,resourceId:w.resources[0].id,taxonomyServiceId:'gelinis-lakavimas',label:'Gelinis lakavimas',durationMin:60,priceMinor:2500,bufferBeforeMin:0,bufferAfterMin:0});
 const revision=api.submitRevision(owner,{scope,name:org.name,bio:org.bio});api.moderate({...owner,operator:true},{id:revision.id,state:'approved'});
 return {owner,org,service};
}
