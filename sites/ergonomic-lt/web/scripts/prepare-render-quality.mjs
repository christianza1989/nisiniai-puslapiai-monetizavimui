// Restore full base surfaces and source-resolution material maps from saved exports.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,meshopt} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
import {parts,compact,hash} from './configurator-geometry.mjs';
await MeshoptDecoder.ready;await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const source=path.resolve('../research/configurator/expanded-source'),folder=path.resolve('public/media/configurator/materials');
await fs.mkdir(folder,{recursive:true});
const data=JSON.parse(await fs.readFile('content/configurator-expanded.json','utf8'));
const library={schemaVersion:1,colors:{},groups:{}},report={bases:[],textures:[]};
const groupFor={CUPHBACKRESTCOLOR:'CBACKRESTUPHGROUP',CUPHSEATCOLOR:'CBACKRESTUPHGROUP',CSEBASIDEPROFILUPHCOLOR:'CSEBASIDEPROFILUPHGROUP',CHEADRESTUPHCHCOLOR:'CHEADRESTUPHCHGROUP',CHEADSIDEPROFUPHCHCOL:'CHEADSIDEPROFUPHCHGROUP',CUPHCOLOR:'CUPHGROUP',CUPHSIDECOLORSEAT:'CUPHGROUP',CMESHCOLOR:'CMESHGROUP'};
const values=s=>Object.fromEntries(Object.entries(s.properties).map(([k,v])=>[k.split('.').at(-1),v.value]));
function decode(input){const bytes=Buffer.from(input),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString()),binary=bytes.subarray(28+length);
 const image=index=>{const item=json.images[json.textures[index].source],view=json.bufferViews[item.bufferView];return {bytes:binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength),mime:item.mimeType};};
 const materials=json.materials.map(m=>({diffuse:m.pbrMetallicRoughness?.baseColorTexture?image(m.pbrMetallicRoughness.baseColorTexture.index):null,normal:m.normalTexture?image(m.normalTexture.index):null}));return {json,materials};}
async function raw(ref){const bytes=await fs.readFile(path.join(source,ref.file));if(hash(bytes)!==ref.sha256)throw Error('Source checksum mismatch');return bytes;}
async function storeMap(image,label,origin){const digest=hash(image.bytes),ext=image.mime==='image/png'?'png':'jpg',name=label+'-'+digest.slice(0,12)+'.'+ext,filename=path.join(folder,name);
 await fs.writeFile(filename,image.bytes);const size=await sharp(image.bytes).metadata();report.textures.push({file:'public/media/configurator/materials/'+name,sourceSha256:digest,sourceExportSha256:origin.sourceExportSha256,origin:origin.text});return {image:'/media/configurator/materials/'+name,width:size.width,height:size.height,sourceSha256:digest};}
async function addColor(code,group,material,ref){if(!material.diffuse||library.colors[code])return;
 const size=await sharp(material.diffuse.bytes).metadata();if((size.width||0)<128||(size.height||0)<128)return;
 const origin={sourceExportSha256:ref.sha256,text:'Nowy Styl public GLTF export; finish '+code+'; original embedded material image, without resizing.'};
 const color=await storeMap(material.diffuse,code.toLowerCase(),origin);if(material.normal)color.normalImage=(await storeMap(material.normal,'normal',origin)).image;
 color.group=group;library.colors[code]=color;
 if(group&&!library.groups[group]){const filename=group.toLowerCase()+'-neutral.png';await sharp(material.diffuse.bytes).greyscale().linear(.3,200).png().toFile(path.join(folder,filename));
  library.groups[group]={image:'/media/configurator/materials/'+filename,normalImage:color.normalImage,approximate:true};report.textures.push({file:'public/media/configurator/materials/'+filename,sourceSha256:hash(material.diffuse.bytes),sourceExportSha256:ref.sha256,origin:'Derived from Nowy Styl public GLTF '+group+' material; grayscale luminance*0.3+200 for neutral tinting. Approximate color preview.'});}
}
for(const family of data.families)for(const anchor of family.anchors){
 const capture=JSON.parse(await fs.readFile(path.join(source,family.id,anchor.id+'.json'),'utf8')),bytes=await raw(capture.geometry),decoded=decode(bytes),state=values(capture);
 const doc=compact(await io.readBinary(bytes)),original=parts(doc),triangles=doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
 for(const part of original){const field=anchor.roles[part.id];part.node.setName(part.id).setExtras({partId:part.id,finishField:field||null});
  if(field){for(const p of part.node.getMesh().listPrimitives()){const material=p.getMaterial()?.clone();if(material){p.setMaterial(material.setName(field));const base=material.getBaseColorTexture();if(base){await addColor(state[field],state[groupFor[field]],{diffuse:{bytes:base.getImage(),mime:base.getMimeType()},normal:material.getNormalTexture()?{bytes:material.getNormalTexture().getImage(),mime:material.getNormalTexture().getMimeType()}:null},capture.geometry);}}}}
 }
 const oldBytes=await fs.readFile(path.join('public',anchor.geometry.asset));const backup=path.resolve('../research/configurator/render-quality/baseline-before');await fs.mkdir(backup,{recursive:true});if(hash(oldBytes)===anchor.geometry.assetSha256)await fs.writeFile(path.join(backup,anchor.geometry.assetSha256+'.glb'),oldBytes,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
 // No simplification. Keep all source triangles and finer normal/UV precision.
 await doc.transform(prune(),meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:16,quantizeNormal:16,quantizeTexcoord:16}));
 const output=await io.writeBinary(doc),result=decode(output),actual=result.json.meshes.reduce((n,m)=>n+m.primitives.reduce((n,p)=>n+result.json.accessors[p.indices].count/3,0),0);
 if(actual!==triangles||output.length>8_000_000)throw Error('Full geometry constraint failed');
 await fs.writeFile(path.join('public',anchor.geometry.asset),output);anchor.geometry.assetSha256=hash(output);anchor.geometry.bytes=output.length;
 report.bases.push({family:family.id,anchor:anchor.id,sourceTriangles:triangles,outputTriangles:actual,bytes:output.length,sha256:hash(output),sourceSha256:capture.geometry.sha256});
 // Color probes change one finish only. Recover their actual large albedo map.
 const baseHashes=new Set(decoded.materials.filter(m=>m.diffuse).map(m=>hash(m.diffuse.bytes)));
 for(const [field,probe] of Object.entries(capture.roles)){const key=field.split('.').at(-1),v={...state,[key]:probe.value},probeBytes=await raw(probe.geometry),changed=decode(probeBytes).materials.filter(m=>m.diffuse&&!baseHashes.has(hash(m.diffuse.bytes)));
  if(changed.length)await addColor(v[key],v[groupFor[key]],changed[0],probe.geometry);
 }
 console.log(family.id,anchor.id,triangles,'source triangles preserved');
}
report.textures=[...new Map(report.textures.map(t=>[t.file,t])).values()];
await fs.writeFile('content/configurator-expanded.json',JSON.stringify(data));await fs.writeFile('content/render-materials.json',JSON.stringify(library));
await fs.mkdir('../research/configurator/render-quality',{recursive:true});await fs.writeFile('../research/configurator/render-quality/source-quality.json',JSON.stringify(report,null,2));
console.log('Restored',report.bases.length,'full bases;',Object.keys(library.colors).length,'source finishes.');
