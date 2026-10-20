// Project verified supplier snapshots onto the fields the catalog runtime reads.
// Full captured states/fixtures stay in research; geometry references stay exact.
export function compactCatalogRuntime(input){
 const output=structuredClone(input);
 for(const family of output.families)for(const anchor of family.anchors)for(const component of anchor.components){
  for(const variant of component.variants){
   variant.defaults=Object.fromEntries(Object.entries(variant.defaults).filter(([key,value])=>anchor.defaults[key]!==value));
   variant.choices=Object.fromEntries(component.fields.filter(key=>variant.choices[key]).map(key=>[key,variant.choices[key]]));
   // Catalog geometry loading uses remove/addIds/geometries, never patch choices.
   variant.patch.choices={};
  }
 }
 return output;
}
