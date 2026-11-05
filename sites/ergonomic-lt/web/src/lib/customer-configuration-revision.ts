/** A catalogue display can remap the example ID without changing its captured configuration. */
export function customerConfigurationRevisionSource(source:unknown):unknown{
 const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value;
 if(!source||typeof source!=='object'||Array.isArray(source))return canonical(source);
 const family=source as Record<string,unknown>;
 const withoutSample=(value:unknown)=>value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='sample')):value;
 // Product + selected example are separately authenticated in the sealed token.
 // Keep every captured choice, dependency, class, source asset and checksum here.
 return canonical({...withoutSample(family) as object,
  ...(Array.isArray(family.articles)?{articles:family.articles.map(withoutSample)}:{}),
  ...(Array.isArray(family.anchors)?{anchors:family.anchors.map(withoutSample)}:{}),
 });
}
