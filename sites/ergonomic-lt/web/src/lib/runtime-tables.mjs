/** Exact JSON subtree tables. No fields, values, array order or IDs are omitted.
 * Only explicitly opted-in preview candidates may use this transport. The
 * existing single-file/v1 formats remain unchanged for every other model.
 */
export const RUNTIME_TABLE_FORMAT = 'ergonomic-runtime-tables-v1';
const MAX_NODES = 1_000_000;
const MAX_DEPTH = 128;
const MAX_REFS = 8_000_000;
const invalid = () => { throw Error('Invalid configurator runtime tables'); };

export function packRuntimeTables(value) {
 const nodes=[], ids=new Map();
 function visit(value,depth=0){
  if(depth>MAX_DEPTH)invalid();
  let node;
  if(Object.is(value,-0))node=[2];
  else if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))node=value;
  else if(Array.isArray(value))node=[0,...Array.from(value,v=>visit(v,depth+1))];
  else if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){
   node=[1];for(const [key,v]of Object.entries(value))node.push(visit(key,depth+1),visit(v,depth+1));
  }else invalid();
  const key=JSON.stringify(node),previous=ids.get(key);if(previous!==undefined)return previous;
  const id=nodes.length;if(id>=MAX_NODES)invalid();nodes.push(node);ids.set(key,id);return id;
 }
 const root=visit(value);
 return {format:RUNTIME_TABLE_FORMAT,nodes,root};
}

export function isRuntimeTables(value){return !!value&&typeof value==='object'&&value.format===RUNTIME_TABLE_FORMAT;}

/** Bottom-up references prevent cycles/forward links. Shared subtrees remain
 * immutable input to the engine, also reducing React transport duplication.
 */
export function unpackRuntimeTables(input){
 if(!isRuntimeTables(input)||Object.keys(input).sort().join(',')!=='format,nodes,root'||!Array.isArray(input.nodes)||!input.nodes.length||input.nodes.length>MAX_NODES||input.root!==input.nodes.length-1)invalid();
 const values=[],depths=[];let refs=0;
 for(const node of input.nodes){
  const index=values.length;
  function ref(id){if(!Number.isSafeInteger(id)||id<0||id>=index||++refs>MAX_REFS)invalid();return values[id];}
  let value,depth=0;
  if(node===null||typeof node==='string'||typeof node==='boolean'||typeof node==='number'&&Number.isFinite(node))value=node;
  else if(Array.isArray(node)&&node[0]===0){
   value=node.slice(1).map(ref);depth=1+Math.max(0,...node.slice(1).map(id=>depths[id]));
  }else if(Array.isArray(node)&&node[0]===2&&node.length===1)value=-0;
  else if(Array.isArray(node)&&node[0]===1&&node.length%2===1){
   const entries=[],keys=new Set();
   for(let i=1;i<node.length;i+=2){const key=ref(node[i]),v=ref(node[i+1]);if(typeof key!=='string'||keys.has(key))invalid();keys.add(key);entries.push([key,v]);depth=Math.max(depth,1+depths[node[i+1]]);}
   value=Object.fromEntries(entries);
  }else invalid();
  if(depth>MAX_DEPTH)invalid();values.push(value);depths.push(depth);
 }
 return values[input.root];
}
