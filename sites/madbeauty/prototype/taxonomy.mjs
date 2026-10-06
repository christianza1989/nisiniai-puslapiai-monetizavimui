import {CATEGORY_TREE} from './taxonomy-data.mjs';
export {CATEGORY_TREE};
export const TAXONOMY_VERSION='2026-10-06-v1';
export const normalizeSearch=s=>String(s??'').toLocaleLowerCase('lt').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const images={plaukai:'hair',nagai:'nails-neutral',antakiai:'brows',blakstienos:'lashes',veidas:'skincare',masazas:'massage'};
export const TAXONOMY_NODES=CATEGORY_TREE.flatMap(c=>[{id:c.id,label:c.label,kind:'category',categoryId:c.id,parentId:null,scope:c.scope,reviewRequired:c.reviewRequired,path:[c.label],imageId:images[c.id]||null},...c.groups.flatMap(g=>[{id:g.id,label:g.label,kind:'group',parentId:c.id,categoryId:c.id,scope:c.scope,reviewRequired:c.reviewRequired,path:[c.label,g.label],imageId:images[c.id]||null},...g.treatments.map(t=>({...t,kind:'treatment',parentId:g.id,categoryId:c.id,scope:c.scope,path:[c.label,g.label,t.label],imageId:images[c.id]||null}))])]);
export const LEGACY_TARGETS={manikiuras:'manikiuras','gelinis-lakavimas':'lakavimas-gelinis-lakavimas','nagu-dizainas':'nagu-dizainas',pedikiuras:'pedikiuras',kirpimas:'kirpimai','plauku-dazymas':'plauku-dazymas',antakiai:'antakiai',blakstienos:'blakstienos',masazas:'masazas','veido-prieziura':'veidas'};
const nodesById=new Map(TAXONOMY_NODES.map(n=>[n.id,n]));
const canonicalId=id=>Object.hasOwn(LEGACY_TARGETS,id)?LEGACY_TARGETS[id]:id;
export const taxonomyNode=(id,nodes=TAXONOMY_NODES)=>(nodes===TAXONOMY_NODES?nodesById.get(canonicalId(id)):nodes.find(n=>n.id===canonicalId(id)))||null;
export function matchesTaxonomy(actualId,filterId,nodes=TAXONOMY_NODES){if(!filterId||filterId==='all')return true;const target=canonicalId(filterId);let node=taxonomyNode(actualId,nodes);const seen=new Set();while(node&&!seen.has(node.id)){if(node.id===target)return true;seen.add(node.id);node=taxonomyNode(node.parentId,nodes);}return false;}
export function searchableTaxonomy(query,{scope='all',nodes=TAXONOMY_NODES}={}){const terms=normalizeSearch(query).split(' ').filter(Boolean);return nodes.filter(n=>(scope==='all'||n.scope===scope)&&terms.every(t=>normalizeSearch([...n.path,...(n.aliases||[])].join(' ')).includes(t)));}
export const procedureById=id=>TAXONOMY_NODES.find(n=>n.id===id&&n.kind==='treatment');
