// Apply independently captured main/side upholstery roles to eight seat parts.
import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,meshopt} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
import {compact,parts,hash} from './configurator-geometry.mjs';
await MeshoptDecoder.ready;await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const file='content/configurator-expanded.json',data=JSON.parse(await fs.readFile(file,'utf8')),report=[];
async function sourceParts(ref){const bytes=await fs.readFile(path.resolve('../research/configurator/expanded-source',ref.file));if(hash(bytes)!==ref.sha256)throw Error('Source SHA mismatch');return parts(compact(await io.readBinary(bytes)));}
for(const anchor of data.families.find(f=>f.id==='souly').anchors){
 const raw=JSON.parse(await fs.readFile(path.resolve('../research/configurator/expanded-source/souly',anchor.id+'.json'),'utf8'));
 for(const seat of ['UPHCPLASTICSPROFILES','UPHSIDEPROFILESSP']){
  const patch=anchor.patches['CSEAT='+seat],capture=raw.patches['KSOU001WW003_OPTIONS.CSEAT='+seat];
  const original=new Map((await sourceParts(capture.geometry)).map(p=>[p.id,p])),roles=new Map();
  for(const [field,probe] of Object.entries(capture.roles))for(const part of await sourceParts(probe.geometry))if(original.has(part.id)&&original.get(part.id).material!==part.material){
   const key=field.split('.').at(-1);if(roles.has(part.id)&&roles.get(part.id)!==key)throw Error('Ambiguous source finish role');roles.set(part.id,key);
  }
  const target=path.join('public',patch.geometry.asset),doc=await io.read(target),counts={};
  for(const node of doc.getRoot().listNodes().filter(n=>n.getMesh())){const role=roles.get(node.getName());if(!role)continue;
   node.setExtras({...node.getExtras(),finishField:role});counts[role]=(counts[role]||0)+1;
   for(const primitive of node.getMesh().listPrimitives()){const material=primitive.getMaterial()?.clone();if(material){material.setName(role);primitive.setMaterial(material);}}
  }
  if(!counts.CUPHCOLOR||!counts.CUPHSIDECOLORSEAT)throw Error('Incomplete real seat finish coverage');
  await doc.transform(prune(),meshopt({encoder:MeshoptEncoder}));const bytes=await io.writeBinary(doc);await fs.writeFile(target,bytes);patch.geometry.assetSha256=hash(bytes);patch.geometry.bytes=bytes.length;
  report.push({anchor:anchor.id,seat,roles:counts,asset:patch.geometry.asset,sha256:patch.geometry.assetSha256});
 }
}
await fs.writeFile(file,JSON.stringify(data));await fs.writeFile('../research/configurator/souly-seat-finish-verification.json',JSON.stringify(report,null,2));console.log('Verified and tagged '+report.length+' real seat geometries.');
