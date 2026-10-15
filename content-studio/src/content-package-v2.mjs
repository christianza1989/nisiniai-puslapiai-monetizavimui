// Identical source in both repositories. V1 hash/reader remains untouched.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const schema=JSON.parse(readFileSync(new URL('../schemas/content-package.v2.schema.json',import.meta.url),'utf8'));
const fail=message=>{throw new Error('Invalid content v2: '+message);};
export const stableV2=value=>Array.isArray(value)?`[${value.map(stableV2).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableV2(value[k])}`).join(',')}}`:JSON.stringify(value);
function assertSchema(value,rule,label='package') {
  if(rule.$ref)return assertSchema(value,rule.$ref.split('/').slice(1).reduce((s,k)=>s[k],schema),label);
  for(const key of ['oneOf','anyOf'])if(rule[key]){
    const matches=rule[key].filter(r=>{try{assertSchema(value,r,label);return true;}catch{return false;}}).length;
    if(!matches||key==='oneOf'&&matches!==1)fail(label+' does not match '+key);
  }
  if('const'in rule&&value!==rule.const)fail(label+' const');
  if(rule.enum&&!rule.enum.includes(value))fail(label+' enum');
  if(rule.type){
    const valid=rule.type==='null'?value===null:rule.type==='array'?Array.isArray(value):rule.type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):rule.type==='integer'?Number.isInteger(value):typeof value===rule.type;
    if(!valid)fail(label+' type '+rule.type);
  }
  if(typeof value==='string'){
    if(rule.minLength!==undefined&&value.length<rule.minLength||rule.maxLength!==undefined&&value.length>rule.maxLength)fail(label+' length');
    if(rule.pattern&&!new RegExp(rule.pattern).test(value))fail(label+' pattern');
    if(rule.format==='date-time'){
      const time=Date.parse(value);if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,19)!==value.slice(0,19))fail(label+' invalid UTC date');
    }
    if(rule.format==='uri'){
      let u;try{u=new URL(value);}catch{fail(label+' URL');}
      if(u.protocol!=='https:'||u.username||u.password||u.port||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname))fail(label+' public HTTPS URL');
    }
    if(rule.format==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))fail(label+' email');
  }
  if(typeof value==='number'&&(rule.minimum!==undefined&&value<rule.minimum||rule.maximum!==undefined&&value>rule.maximum))fail(label+' range');
  if(Array.isArray(value)){
    if(rule.minItems!==undefined&&value.length<rule.minItems||rule.maxItems!==undefined&&value.length>rule.maxItems)fail(label+' items');
    if(rule.items)value.forEach((item,i)=>assertSchema(item,rule.items,`${label}[${i}]`));
  }
  if(value&&typeof value==='object'&&!Array.isArray(value)&&rule.properties){
    for(const key of rule.required||[])if(!(key in value))fail(label+' missing '+key);
    for(const[key,item]of Object.entries(value)){
      if(!(key in rule.properties)){if(rule.additionalProperties===false)fail(label+' unknown '+key);}
      else assertSchema(item,rule.properties[key],label+'.'+key);
    }
  }
}
export function validateV2Editorial(editorial) {
  assertSchema(editorial, schema.$defs.editorial, 'editorial');
  return structuredClone(editorial);
}
export function v2RevisionPayload(page){
  const {id,siteId,contentVersion,type,slug,title,description,intent,body,publishAt,media,links,editorial,siteSnapshot}=page;
  return {id,siteId,contentVersion,type,slug,title,description,intent,body,publishAt,media,links,externalLinks:(page.externalLinks||[]).map(({url,label,reason})=>({url,label,reason})),editorial,siteSnapshot};
}
export const v2RevisionHash=page=>createHash('sha256').update(stableV2(v2RevisionPayload(page)),'utf8').digest('hex');
export function inlineNodes(page){return page.body.flatMap(b=>b.content||((b.type==='richList')?b.items.flat():[]));}
export function bodyPlainText(body){return body.map(b=>b.text??(b.content?b.content.map(n=>n.text).join(''):b.type==='richList'?b.items.map(row=>row.map(n=>n.text).join('')).join('\n'):b.items?.join('\n')||'')).join('\n');}
export function normalizeV2Blocks(body){
  assertSchema(body,{type:'array',maxItems:1000,items:{$ref:'#/$defs/block'}},'body');
  for(const b of body){
    if(['paragraph','heading'].includes(b.type)&&!b.text.trim())fail('empty block');
    if(b.type==='list'&&(!b.items.length||b.items.some(t=>!t.trim())))fail('empty list');
    if(b.content&&!b.content.map(n=>n.text).join('').trim())fail('empty rich block');
  }
  return structuredClone(body);
}
export function validateV2Draft(page,site){
  // Only approval metadata is synthesized for structural validation, never persisted.
  const candidate={...v2RevisionPayload(page),revisionHash:'0'.repeat(64),approval:{status:'approved',revisionHash:'0'.repeat(64),approvedAt:'2000-01-01T00:00:00.000Z',actorId:'structural-validator'}};
  assertSchema(candidate,schema.$defs.page,'page');
  normalizeV2Blocks(page.body);
  if(page.contentVersion!==2)fail('contentVersion must be 2');
  if(!/^(?:[a-z0-9]+(?:[-/][a-z0-9]+)*)?$/.test(page.slug)||/^(niche|api)(\/|$)/.test(page.slug))fail('unsafe slug');
  if((page.type==='home')!==(page.slug===''))fail('home slug mismatch');
  if(site&&stableV2(page.siteSnapshot)!==stableV2(site))fail('siteSnapshot mismatch: reapprove after site fact changes');
  const media=new Set(page.media.map(m=>m.id));if(media.size!==page.media.length)fail('duplicate media ID');
  for(const m of page.media)if(!new RegExp(`^/content-assets/${page.siteId}/[a-zA-Z0-9._-]+\\.(webp|avif)$`).test(m.src))fail('media site/path mismatch');
  for(const b of page.body)if(b.type==='image'&&!media.has(b.assetId))fail('missing image');
  if(page.editorial.featuredImageId&&!media.has(page.editorial.featuredImageId))fail('missing featured image');
  for(const a of page.editorial.authors)if(a.siteId!==page.siteId||a.locale!==page.siteSnapshot.locale)fail('author scope mismatch');
  for(const key of ['authors','sources','commerceTargets']){const ids=page.editorial[key].map(x=>x.id);if(new Set(ids).size!==ids.length)fail('duplicate editorial '+key);}
  const commerce=new Set(page.editorial.commerceTargets.map(t=>t.id));
  for(const node of inlineNodes(page))if(node.type==='link'&&node.target.kind==='commerce'&&!commerce.has(node.target.targetId))fail('unknown commerce snapshot');
  for(const t of page.editorial.commerceTargets)if(t.verified&&!t.checkedAt)fail('verified commerce needs checkedAt');
  if(page.editorial.datePublished&&page.editorial.dateModified&&Date.parse(page.editorial.dateModified)<Date.parse(page.editorial.datePublished))fail('dateModified before datePublished');
  return page;
}
export function validateV2Package(pkg){
  assertSchema(pkg,schema);
  if(pkg.site.id!==pkg.siteId||pkg.site.canonicalHost!==pkg.canonicalHost||pkg.site.locale!==pkg.locale)fail('site identity mismatch');
  if(!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(pkg.canonicalHost))fail('canonicalHost invalid');
  const ids=new Set(),slugs=new Set();let home=0;
  for(const p of pkg.pages){
    if(p.siteId!==pkg.siteId)fail('page site mismatch');
    if(ids.has(p.id)||slugs.has(p.slug))fail('duplicate page identity');ids.add(p.id);slugs.add(p.slug);
    if(p.type==='home')home++;
    validateV2Draft(p,pkg.site);
    if(p.approval.revisionHash!==p.revisionHash||v2RevisionHash(p)!==p.revisionHash)fail('approval/hash mismatch '+p.id);
  }
  if(home!==1)fail('exactly one home required');
  for(const p of pkg.pages){
    for(const link of p.links)if(!ids.has(link.targetPageId))fail('unknown page link');
    for(const id of p.editorial.relatedPageIds)if(!ids.has(id))fail('unknown related page');
    for(const n of inlineNodes(p))if(n.type==='link'&&n.target.kind==='page'&&!ids.has(n.target.pageId))fail('unknown inline page');
  }
  return pkg;
}
