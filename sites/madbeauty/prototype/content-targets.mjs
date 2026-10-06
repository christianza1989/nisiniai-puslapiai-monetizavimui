import {TAXONOMY_VERSION,TAXONOMY_NODES,taxonomyNode,matchesTaxonomy} from './taxonomy.mjs';
import {CITIES,isCityId,cityName} from './cities.mjs';
export const CONTENT_TARGET_VERSION='madbeauty-catalogue-v1';
export const CATALOGUE_ORIGIN='https://madbeauty.lt';
export const REGISTRY_TTL_MS=3600000;
export const activeNode=id=>{const n=taxonomyNode(id);return n?.scope==='core'?n:null;};
export function planTarget({taxonomyNodeId,cityId=null}={}){
 const node=taxonomyNode(taxonomyNodeId);
 if(!node||cityId!==null&&!isCityId(cityId))return null;
 const canonicalPath=`/paslaugos/${node.id}${cityId?'/'+cityId:''}`;
 return {taxonomyNodeId:node.id,cityId,routeRegistryId:`mb:catalog:${node.id}${cityId?':'+cityId:''}`,canonicalPath,canonicalUrl:CATALOGUE_ORIGIN+canonicalPath,label:node.label+(cityId?' · '+cityName(cityId):''),status:'planned',deployed:false,reachable:false,indexEligible:false};
}
// offers must come from the platform's public approved projection, never raw state.
export function catalogueOffers(offers,nodeId,cityId=null){
 if(!activeNode(nodeId)||cityId!==null&&!isCityId(cityId))return [];
 return offers.filter(s=>s.active!==false&&!s.isDemo&&!s.revoked&&matchesTaxonomy(s.taxonomyServiceId,nodeId)&&(!cityId||s.city===cityName(cityId)));
}
export function createContentTargetRegistry({offers=[],deployed=false,now=Date.now()}={}){
 const verifiedAt=new Date(now).toISOString(),expiresAt=new Date(now+REGISTRY_TTL_MS).toISOString();
 const routes=[],offeredCities=CITIES.filter(([,label])=>offers.some(s=>s.city===label&&!s.isDemo&&!s.revoked&&s.active!==false));
 for(const node of TAXONOMY_NODES){
  const national=planTarget({taxonomyNodeId:node.id}),active=node.scope==='core';
  routes.push({...national,status:deployed&&active?'ready':'planned',deployed:deployed&&active,reachable:deployed&&active,indexEligible:false});
  if(active)for(const [cityId]of offeredCities){if(!catalogueOffers(offers,node.id,cityId).length)continue;const local=planTarget({taxonomyNodeId:node.id,cityId});routes.push({...local,status:deployed?'ready':'planned',deployed,reachable:deployed,indexEligible:false});}
 }
 return {schemaVersion:1,siteId:'madbeauty',version:CONTENT_TARGET_VERSION,taxonomyVersion:TAXONOMY_VERSION,generatedAt:verifiedAt,expiresAt,deployed,routes,targets:routes.filter(r=>r.status==='ready').map(r=>({id:r.routeRegistryId,status:'ready',canonicalUrl:r.canonicalUrl,allowedQueryParams:[],verifiedAt,expiresAt,purpose:'information'}))};
}
export function resolveContentTarget(input,registry,{now=Date.now(),fallbackNational=false}={}){
 const plan=planTarget(input);if(!plan)return null;
 if(registry?.siteId!=='madbeauty'||registry.version!==CONTENT_TARGET_VERSION||!Array.isArray(registry.routes)||!Number.isFinite(Date.parse(registry.generatedAt))||Date.parse(registry.generatedAt)>now||!Number.isFinite(Date.parse(registry.expiresAt))||Date.parse(registry.expiresAt)<=now)return {...plan,status:'planned'};
 const route=registry.routes.find(r=>r.routeRegistryId===plan.routeRegistryId);
 if(route?.status==='ready'&&route.deployed&&route.reachable&&route.canonicalUrl===plan.canonicalUrl)return route;
 if(fallbackNational&&plan.cityId)return resolveContentTarget({taxonomyNodeId:plan.taxonomyNodeId},registry,{now});
 return {...plan,status:route?'planned':'unavailable'};
}
