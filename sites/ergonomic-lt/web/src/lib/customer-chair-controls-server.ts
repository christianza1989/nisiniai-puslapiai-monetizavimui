import type {Product} from './types';
import type {ExpandedState,Asset,Patch} from './expanded-configurator';
import type {customerContext} from './customer-configuration-server';
import {legacyChairMaterialControls,chairFinishRoles,type LegacyChairRoleProof} from './chair-material-groups';
import {customerSourceGlbDocument} from './customer-assets-server';
type Node={name:string;visible:boolean;children:Node[];surface?:LegacyChairRoleProof['surfaces'][number]};
/** Same scene/patch visibility and original primitive addresses as the viewer.
 * Ambiguous source names fail closed instead of authorizing a colour change. */
export async function customerChairRoleProof(assembly:{base:Asset|null;patches:Patch[]}):Promise<LegacyChairRoleProof|undefined>{
 const assets:Asset[]=[],roots:Node[]=[];let unambiguous=true;
 async function add(asset:Asset){const doc=await customerSourceGlbDocument(asset);assets.push(asset);const names=new Set<string>();
  function node(index:number,path:Set<number>):Node{if(path.has(index))throw Error('Cyclic source scene');const source=doc.nodes?.[index];if(!source)throw Error('Missing source node');
   const name=source.name||'';names.add(name);
   const field=source.extras?.finishField,primitives=doc.meshes?.[source.mesh]?.primitives,material=primitives?.length===1?primitives[0]?.material:undefined;
   return {name,visible:true,children:(source.children||[]).map((n:number)=>node(n,new Set([...path,index]))),...(chairFinishRoles[field]&&Number.isSafeInteger(material)?{surface:{assetSha256:asset.assetSha256,node:index,primitive:0,material,field,partId:source.extras?.partId}}:{})};
  }
  for(const index of doc.scenes?.[doc.scene??0]?.nodes||[])roots.push(node(index,new Set()));
 }
 if(assembly.base)await add(assembly.base);
 function matches(name:string,nodes:Node[]):Node[]{return nodes.flatMap(n=>[...(n.name===name?[n]:[]),...matches(name,n.children)]);}
 for(const patch of assembly.patches){for(const id of patch.remove){const found=matches(id,roots);if(found.length>1)unambiguous=false;if(found[0])found[0].visible=false;}for(const ref of patch.geometries||(patch.geometry?[patch.geometry]:[]))await add(ref);}
 if(!unambiguous)return;
 const surfaces:LegacyChairRoleProof['surfaces']=[];function visit(nodes:Node[]){for(const node of nodes){if(!node.visible)continue;if(node.surface)surfaces.push(node.surface);visit(node.children);}}visit(roots);
 return {assets,surfaces};
}
export async function customerChairControls(product:Product,context:Awaited<ReturnType<typeof customerContext>>,state:ExpandedState){
 const catalog=context.engine.catalog.catalogForProduct(product);
 if(product.categorySlug!=='kedes'||['structure-only','desk-components'].includes(catalog?.collectionMode||''))return [];
 const selected=context.engine.expandedSelection(product,state),assets=[...(selected.assets.base?[selected.assets.base]:[]),...selected.assets.patches.flatMap(p=>p.geometries||(p.geometry?[p.geometry]:[]))];
 const proof=await customerChairRoleProof(selected.assets);
 return legacyChairMaterialControls({state,proof,assets,choices:s=>context.engine.stateChoices(s),values:s=>s.values,change:(s,field,value)=>context.engine.changeField(s,field,value)});
}
