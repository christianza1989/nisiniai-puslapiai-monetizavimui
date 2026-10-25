import fs from 'node:fs/promises';
import path from 'node:path';
const folder=path.resolve('public/models/configurator/catalog'),data=JSON.parse(await fs.readFile('content/configurator-catalog.json','utf8'));
if(data.families.length!==10)throw Error('Complete verified catalog required');
const keep=new Set();
function record(asset){const file=path.resolve('public',asset.asset.replace(/^\//,''));if(path.dirname(file)!==folder)throw Error('Unexpected model path');keep.add(file);}
for(const family of data.families)for(const anchor of family.anchors){record(anchor.geometry);for(const component of anchor.components)for(const variant of component.variants){if(variant.patch.geometry)record(variant.patch.geometry);for(const asset of variant.patch.geometries||[])record(asset);}}
let removed=0,bytes=0;
for(const name of await fs.readdir(folder)){if(!name.endsWith('.glb'))continue;const file=path.resolve(folder,name);if(path.dirname(file)!==folder)throw Error('Out of scope model');if(!keep.has(file)){await fs.unlink(file);removed++;}else bytes+=(await fs.stat(file)).size;}
console.log(JSON.stringify({kept:keep.size,removedUnreferencedPreparationFiles:removed,bytes}));
