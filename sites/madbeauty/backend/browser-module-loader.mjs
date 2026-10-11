// Test the maintained browser renderer, mapping its single site-root import to
// the real module. No copied renderer or substituted booking implementation.
export async function resolve(specifier,context,nextResolve){
  if(specifier==='/seo-contract.mjs')return nextResolve(new URL('../prototype/seo-contract.mjs',import.meta.url).href,context);
  return nextResolve(specifier,context);
}
