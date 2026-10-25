import assert from 'node:assert/strict';

// Explicit opt-in after independent Native graph replay. Other products retain
// their existing constructor identity and destination rules.
const enabledArticles=new Set(['KWI2002WW001']);
const values=state=>Object.fromEntries(Object.entries(state.properties).filter(([k])=>/_OPTIONS\.|_FINISHES\./.test(k)).map(([k,p])=>[k.split('.').at(-1),p.value]));
export function bindNativeComponentAxes(anchor,component,input){
 if(!enabledArticles.has(anchor.article))return component;
 const measured=new Map(input.map(row=>{assert.equal(row.state.baseArticle,anchor.article);return [row.key,values(row.state)];}));
 assert.equal(measured.size,input.length,'Every source component state has a unique measured key');
 const axes=anchor.axes.filter(k=>[...measured.values()].some(v=>v[k]!==anchor.defaults[k]));
 if(!axes.length)return component;
 assert.equal(component.variants.length,input.length);
 for(const variant of component.variants){
  const source=measured.get(variant.key);assert(source,'Variant has no exact Native snapshot');
  assert(!variant.destinationAnchor,'Measured dependent axes must retain their source capture context');
  for(const axis of axes){assert.equal(typeof source[axis],'string');variant.values[axis]=source[axis];}
 }
 component.nativeMeasuredAxes=axes;
 return component;
}
