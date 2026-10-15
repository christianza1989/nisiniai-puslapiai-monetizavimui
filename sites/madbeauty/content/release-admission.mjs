// Production release policy after shared immutable/hash/domain validation.
// Does not grant editorial approval or change approved bytes.
import {planTarget} from '../prototype/content-targets.mjs';
import {IMAGE_POLICY} from '../../../content-studio/src/image-policy.mjs';
function catalogueUrl(value){try{const u=new URL(value);return ['madbeauty.lt','www.madbeauty.lt'].includes(u.hostname)&&/^\/paslaugos(?:\/|$)/.test(u.pathname);}catch{return false;}}
export function admitPublicationRelease(pkg){
 if(pkg.schemaVersion!==2)return pkg; // Frozen V1 edition stays byte-for-byte intact.
 for(const p of pkg.pages){
  for(const snapshot of p.editorial.commerceTargets){
   const parts=snapshot.id.split(':'),target=parts.length>=3&&parts.length<=4&&parts[0]==='mb'&&parts[1]==='catalog'?planTarget({taxonomyNodeId:parts[2],cityId:parts[3]||null}):null;
   if(!target||target.routeRegistryId!==snapshot.id||target.canonicalUrl!==snapshot.url)throw Error('Unknown or non-canonical Madbeauty catalogue target: '+snapshot.id);
  }
  const inline=p.body.flatMap(b=>b.content||((b.type==='richList')?b.items.flat():[]));
  if(p.editorial.sources.some(s=>catalogueUrl(s.url))||(p.externalLinks||[]).some(l=>catalogueUrl(l.url))||inline.some(n=>n.type==='link'&&n.target.kind==='external'&&catalogueUrl(n.target.url)))throw Error('Catalogue destinations must be typed commerce links, not external sources');
  if(!['article','guide'].includes(p.type))continue;
  const featured=p.media.find(m=>m.id===p.editorial.featuredImageId);
  if(!featured)throw Error('Reviewed guide featured image required: '+p.slug);
  const family=p.media.filter(m=>m.alt===featured.alt&&m.rights===featured.rights&&/\.webp$/.test(m.src)&&Math.abs(m.width/m.height-featured.width/featured.height)<0.01);
  const largest=Math.max(0,...family.map(m=>m.width));
  if(largest<=1200||largest>IMAGE_POLICY.maxOutputEdge||!IMAGE_POLICY.widths.every(w=>family.some(m=>m.width===Math.min(w,largest))))throw Error('Reviewed guide requires its five responsive WebP variants: '+p.slug);
 }
 return pkg;
}
