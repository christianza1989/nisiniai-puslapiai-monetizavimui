// Isolated contract tests for the future shared-core integration. Not a public publishing engine.
export const FILTER_KEYS=new Set(['paslauga','miestas','diena','nuo','iki','tipas','max','rikiuoti','vaizdas','vardas']);
export function boundedFilters(hash){
  if(hash.length>1500)throw Error('INVALID_INPUT');const p=new URLSearchParams(hash.replace(/^#/,'')),out={};
  for(const [k,v] of p){if(!FILTER_KEYS.has(k))continue;if(v.length>100)throw Error('INVALID_INPUT');out[k]=v;}
  if(out.diena!==undefined&&(!/^\d{1,2}$/.test(out.diena)||Number(out.diena)>30))throw Error('INVALID_INPUT');
  if(out.max!==undefined&&(!/^\d{0,4}(?:\.\d{1,2})?$/.test(out.max)||Number(out.max)>1000))throw Error('INVALID_INPUT');
  for(const key of ['nuo','iki'])if(out[key]&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(out[key]))throw Error('INVALID_INPUT');
  return out;
}
export function catalogTarget({serviceId,cityId=null,registry=[],now,privatePreview=false}){
  const eligible=entry=>entry.serviceId===serviceId&&entry.cityId===(cityId||null)&&entry.approved&&entry.deployed&&entry.unchanged&&Date.parse(entry.publishAt)<=Date.parse(now)&&!entry.revoked&&(!entry.isDemo||privatePreview);
  const exact=registry.find(eligible);if(exact)return exact.path;
  if(cityId)return catalogTarget({serviceId,registry,now,privatePreview});return null;
}
export function publicProjection(entities){return entities.filter(e=>!e.isDemo&&!e.revoked&&e.approved&&e.unchanged&&e.deployed);}
export function previewMetadata(path,origin){return{title:'Madbeauty private demo',robots:'noindex,nofollow,noarchive',canonical:new URL(path,origin).href,sitemap:false,llm:false,jsonLd:[]};}
