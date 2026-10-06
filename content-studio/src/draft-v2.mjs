import {createHash} from 'node:crypto';
import {stableV2,normalizeV2Blocks,validateV2Draft,inlineNodes,v2RevisionHash} from './content-package-v2.mjs';

// Private drafting envelope; the public V2 schema/renderer stays unchanged.
export const draftSnapshotHash=site=>createHash('sha256').update(stableV2(site)).digest('hex');
// CLI Structured Outputs supports anyOf, while the public validator retains
// stricter oneOf. Each branch is disjoint by its type/kind literal.
export function v2CliSchema(value){
  if(Array.isArray(value))return value.map(v2CliSchema);
  if(!value||typeof value!=='object')return value;
  const out=Object.fromEntries(Object.entries(value).map(([key,item])=>[key==='oneOf'?'anyOf':key,v2CliSchema(item)]));
  if('const'in out){out.enum=[out.const];out.type=typeof out.const;delete out.const;}
  if(out.enum&&!out.type)out.type=typeof out.enum[0]==='number'?'integer':typeof out.enum[0];
  // URL format is validated by the unchanged native validator after generation.
  if(out.format==='uri')delete out.format;
  return out;
}
export function assertV2Draftable(site,page,{revisionHash}={}){
  if(site.schemaVersion!==2||!page||page.contentVersion!==2||page.status==='revoked')throw Error('V2 generavimo tikslas nerastas arba atšauktas.');
  if(revisionHash){
    if(!page.body.length||v2RevisionHash(page)!==revisionHash)throw Error('V2 revision requires the exact current written revision hash.');
  }else if(page.body.length||page.approval||page.publishedRevision)throw Error('V2 generavimo kelias neperrašo parašyto ar patvirtinto puslapio.');
  const brief=page.planningBrief;
  if(!brief?.data||!(brief.data.article?.intent||brief.data.intent)||!/^[a-f0-9]{64}$/.test(brief.sourcePlanSha256||'')||!/^[a-f0-9]{64}$/.test(brief.skillFingerprint||''))throw Error('V2 generavimo kelias reikalauja pilno sutikrinto planningBrief su šaltinio ir instrukcijų SHA.');
}
export function v2DraftContext(site,page,options){
  assertV2Draftable(site,page,options);
  return {contentVersion:2,authorSnapshots:page.editorial.authors,
    // These are previously retrieved document snapshots, not candidate URLs.
    sourceSnapshots:page.editorial.sources,reviewedSourceClaims:(page.externalLinks||[]).filter(s=>s.verified),commerceSnapshots:page.editorial.commerceTargets,
    attachedMedia:page.media,existingEditorial:page.editorial,
    suggestionTargets:(page.linkSuggestions||[]).map(l=>({targetPageId:l.targetPageId,label:l.label,reason:l.reason})),
    inlinePageTargets:site.pages.filter(p=>p.id!==page.id&&p.publishedRevision&&p.status!=='revoked').map(p=>({id:p.id,title:p.title,slug:p.slug}))};
}
const error=message=>{throw Error('V2 draft result: '+message);};
const text=(value,label,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)error(label+' invalid');return value;};
export function acceptV2DraftResult(site,page,result,options){
  assertV2Draftable(site,page,options);
  const keys=['title','description','body','factChecks','internalLinks','sourceIds','mediaBrief'];
  if(!result||Object.keys(result).length!==keys.length||keys.some(k=>!(k in result))||Object.keys(result).some(k=>!keys.includes(k)))error('unknown/missing fields');
  text(result.title,'title',1000);text(result.description,'description',1000);text(result.mediaBrief,'mediaBrief',4000);
  const body=normalizeV2Blocks(result.body);if(!body.length)error('empty body');
  if(!Array.isArray(result.factChecks)||result.factChecks.length>40)error('factChecks invalid');
  result.factChecks.forEach(x=>text(x,'fact check',600));
  if(!Array.isArray(result.internalLinks)||result.internalLinks.length>30)error('internalLinks invalid');
  const pages=new Set(site.pages.filter(p=>p.status!=='revoked'&&p.id!==page.id).map(p=>p.id));
  const seen=new Set();for(const link of result.internalLinks){
    if(!link||Object.keys(link).sort().join(',')!=='label,reason,targetPageId'||!pages.has(link.targetPageId)||seen.has(link.targetPageId))error('unknown/duplicate internal target '+String(link?.targetPageId).slice(0,100));
    text(link.label,'link label',160);text(link.reason,'link reason',500);seen.add(link.targetPageId);
  }
  if(!Array.isArray(result.sourceIds)||new Set(result.sourceIds).size!==result.sourceIds.length||result.sourceIds.some(id=>!page.editorial.sources.some(s=>s.id===id)))error('unknown source snapshot');
  const candidate={...structuredClone(page),title:result.title,description:result.description,body};
  validateV2Draft(candidate,page.siteSnapshot);
  const readyPages=new Set(site.pages.filter(p=>p.publishedRevision&&p.status!=='revoked').map(p=>p.id));
  const allowedExternal=new Set((page.externalLinks||[]).filter(s=>s.verified).map(s=>s.url));
  for(const node of inlineNodes(candidate).filter(n=>n.type==='link')){
    if(node.target.kind==='page'&&!readyPages.has(node.target.pageId))error('inline page must have an approved snapshot; keep future targets in suggestions');
    if(node.target.kind==='external'&&!allowedExternal.has(node.target.url))error('inline external URL has no separately verified source');
    if(node.target.kind==='network')error('network links require a separate network verification workflow');
    if(node.target.kind==='commerce'&&!page.editorial.commerceTargets.some(t=>t.id===node.target.targetId&&t.verified&&t.checkedAt))error('commerce target has no verified snapshot');
  }
  return {title:result.title,description:result.description,body,factChecks:result.factChecks};
}

export const V2_DRAFT_INSTRUCTION=`Write the original useful draft for this exact researched intent in the site locale. Return draft-result.v2.schema.json only. This native V2 runtime envelope supersedes the legacy blocks envelope: body uses supported plain/rich blocks, real typed inline links and attached image IDs. Do not emit HTML, raw Markdown links, JSON-LD, invented tables, inventory, sources, expert credentials or asset IDs. H1 comes from title. Preserve stable page identity, publishAt, author/source/commerce/media snapshots; never claim approval or deployment. Select sourceIds only from retrieved sourceSnapshots supplied in v2Context; source candidates and keyword/crawl observations are not claim evidence. Exclude unresolved consequential assertions and identify precise verification in factChecks. Only inline approved same-site page IDs, separately verified source URLs or supplied verified commerce IDs; all future article targets go in internalLinks suggestions. For internalLinks copy exact unique targetPageId values from v2Context.suggestionTargets or real existingPages.id. Editorial map IDs such as B-gidas, route IDs such as mb:catalog, labels and slugs are NOT page UUIDs. Existing suggestions already remain in the private map; return an empty internalLinks array when no new useful suggestion is needed, never repeat a target ID. Unverified or expired catalogue targets remain plain text. Explain national procedure/group then explicit city selection; never invent local supply or promise search rankings. Provide a topic-specific mediaBrief for separate actual ImageGen generation/import/pixel review. No raster generation happens in this CLI. Meet the full planningBrief deliverables with useful original decision aids and natural titles/H2; do not add filler to meet a word or publication quota. Empty factChecks does not clear source/media/review/publication gates.`;
