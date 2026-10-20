// Optional finish-role inheritance for the measured Naudu height variants.
// Matches every local vertex attribute and triangle index exactly. World
// transforms are deliberately excluded from the role key and never changed.
import {hash} from './configurator-geometry.mjs';
const enabled=new Set(['KNAU015WW001','KNAU016WW001','KNAU017WW001','KNAU018WW001']);
export function localFinishShape(part){
 const mesh=part.node.getMesh(),result=[];
 for(const primitive of mesh.listPrimitives()){
  const attributes=primitive.listSemantics().sort().map(name=>{const accessor=primitive.getAttribute(name),a=accessor.getArray();return[name,accessor.getType(),accessor.getNormalized(),a.constructor.name,hash(Buffer.from(a.buffer,a.byteOffset,a.byteLength))];});
  const indices=primitive.getIndices(),a=indices?.getArray();
  result.push([primitive.getMode(),attributes,a?[a.constructor.name,hash(Buffer.from(a.buffer,a.byteOffset,a.byteLength))]:null]);
 }
 return hash(JSON.stringify(result));
}
export function nativeLocalFinishRoles(article,baseParts,roles){
 if(!enabled.has(article))return()=>undefined;
 const evidence=new Map();
 for(const part of baseParts){const shape=localFinishShape(part);if(!evidence.has(shape))evidence.set(shape,new Set());evidence.get(shape).add(roles[part.id]||null);}
 return part=>{const observed=evidence.get(localFinishShape(part));if(!observed)return;
  const attributed=[...observed].filter(Boolean);if(!attributed.length)return;
  if(observed.size!==1)throw Error('Ambiguous exact local Native finish surface: '+article+' '+part.id);
  return attributed[0];
 };
}
