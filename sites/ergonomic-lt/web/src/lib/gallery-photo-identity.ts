import duplicateData from '../../content/duplicate-product-photographs.json';
const identities:Record<string,string>=duplicateData;
// Pure immutable-source metadata; publication and product edits are not cached.
const memo=new Map<string,string>();

/** Exact pixel identities verified at 400 and 800 px; never fuzzy matching. */
export function galleryPhotoIdentity(source:string):string{
 if(identities[source])return identities[source];
 if(memo.has(source))return memo.get(source)!;
 const identity=resolveIdentity(source);
 if(memo.size>=20000)memo.clear();memo.set(source,identity);return identity;
}
function resolveIdentity(source:string):string{
 if(source.startsWith('/'))return source;
 try{
  const url=new URL(source,'https://catalog.invalid');
  if(url.origin==='https://www.nowystyl.com'&&url.pathname.startsWith('/getmedia/')){
   for(const key of [...url.searchParams.keys()])if(['width','height','quality','mode','format'].includes(key.toLowerCase()))url.searchParams.delete(key);
   url.hash='';return identities[url.href]||url.href;
  }
 }catch{/* Unrecognized sources remain distinct. */}
 return source;
}
export function uniqueGalleryPhotos(sources:(string|null|undefined)[]):string[]{
 const seen=new Set<string>();
 return sources.filter((source):source is string=>{
  if(!source)return false;
  const identity=galleryPhotoIdentity(source);if(seen.has(identity))return false;
  seen.add(identity);return true;
 });
}
