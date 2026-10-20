import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Vector3,Matrix4,BufferGeometry,BufferAttribute} from 'three';
import assimpFactory from 'assimpjs';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,simplify,prune,meshopt,getBounds} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';

const web=process.cwd(),source=path.resolve(web,'../research/configurator/pilot-source');
const file=path.join(web,'content/configurator-pilot.json');
const pilot=JSON.parse(await fs.readFile(file,'utf8'));
await fs.mkdir(path.join(web,'public/models/configurator'),{recursive:true});
await MeshoptEncoder.ready;await MeshoptDecoder.ready;await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const assimp=await assimpFactory();
const reports=[];
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
async function materialColor(sample,fallback){
  if(!sample)return fallback;
  const {channels}=await sharp(path.join(web,'public',sample.image)).stats();
  return channels.slice(0,3).map(c=>linear(c.mean/255));
}
// Semantic prefixes come from the supplier's CAD object names. Unknown pieces
// remain neutral; no optional part is silently synthesized or removed.
function role(name,variant){
  const n=name.toUpperCase();
  if(n==='TAPICERKA0'||n==='MESH006')return 'backrest';
  if(n==='CSEATSIDES'||n==='SHAPE011')return 'side';
  if(n==='HEADREST_A')return 'plastic';
  if(n==='HEADREST_0')return 'headrest';
  if(['23664986','23664987'].includes(variant.id)&&n==='BACKREST_A')return 'plastic';
  if(['23664986','23664987'].includes(variant.id)&&n==='BACKREST_0')return 'backrest';
  if(/CHEAD|HEADREST/.test(n)&&!/PLAST|METAL|CONNECT/.test(n))return 'headrest';
  if(/CSIDEPROF|SIDEPROFILE|SIDPROF/.test(n))return 'side';
  if(/CSEAT_A|CSITUPH|CSEATUPH|SEAT_A|CBACKSEATC/.test(n))return 'seat';
  if(/CBACKFRONT|CBACKUPH|CBACKMESH|BACKREST_A|CBODY_A/.test(n))return 'backrest';
  if(/CBASE/.test(n))return variant.metalBase?'metal':'plastic';
  if(/GASLIFT|METAL|ARM.*POL|FMETAL/.test(n))return 'metal';
  if(/CASTOR|CASTER|CARMPAD|ARMRESTS_0|CROLL_/.test(n))return 'rubber';
  return 'plastic';
}

for(const model of pilot.models)for(const variant of model.variants){
  const raw=await fs.readFile(path.join(source,variant.sourceCad));
  if(createHash('sha256').update(raw).digest('hex')!==variant.sourceCadSha256)throw Error('Source CAD checksum changed');
  // Assimp resolves 3DS node pivots and keyframe transforms. TDSLoader omits
  // those and leaves several supplier backrests/armrests displaced.
  const files=new assimp.FileList();files.AddFile(variant.sourceCad,raw);
  const converted=assimp.ConvertFileList(files,'glb2');
  if(!converted.IsSuccess()||converted.FileCount()!==1)throw Error('3DS conversion failed');
  const sourceDoc=await io.readBinary(converted.GetFile(0).GetContent());
  converted.delete();files.delete();
  const bounds=getBounds(sourceDoc.getRoot().listScenes()[0]);
  const size=new Vector3(...bounds.max).sub(new Vector3(...bounds.min)),center=new Vector3(...bounds.max).add(new Vector3(...bounds.min)).multiplyScalar(.5);
  if(!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid model dimensions');
  const factor=2/size.y;
  const normalize=new Matrix4().makeScale(factor,factor,factor).multiply(new Matrix4().makeTranslation(-center.x,-bounds.min[1],-center.z));
  const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(model.name);
  const plastic=variant.plastic==='white'?[.82,.84,.81]:variant.plastic==='grey'?[.47,.49,.47]:[.025,.028,.027];
  const palette={plastic,metal:[.42,.44,.43],rubber:[.008,.009,.009],
    seat:await materialColor(variant.samples.seat,[.10,.11,.10]),
    backrest:await materialColor(variant.samples.backrest,[.06,.07,.06]),
    headrest:await materialColor(variant.samples.headrest,[.10,.11,.10]),
    side:await materialColor(variant.samples.side,[.10,.11,.10])};
  const materials=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,doc.createMaterial(key)
    .setBaseColorFactor([...color,1]).setMetallicFactor(key==='metal'?.85:0).setRoughnessFactor(key==='metal'?.24:.82).setDoubleSided(true)]));
  const objects=[];let originalTriangles=0;
  for(const node of sourceDoc.getRoot().listNodes())for(const src of node.getMesh()?.listPrimitives()||[]){
    const pos=src.getAttribute('POSITION');if(!pos?.getCount())continue;
    const geometry=new BufferGeometry().setAttribute('position',new BufferAttribute(new Float32Array(pos.getArray()),3));
    const normal=src.getAttribute('NORMAL');if(normal)geometry.setAttribute('normal',new BufferAttribute(new Float32Array(normal.getArray()),3));
    if(src.getIndices())geometry.setIndex(new BufferAttribute(new Uint32Array(src.getIndices().getArray()),1));
    geometry.applyMatrix4(new Matrix4().fromArray(node.getWorldMatrix())).applyMatrix4(normalize);
    if(!normal)geometry.computeVertexNormals();
    const positions=new Float32Array(geometry.getAttribute('position').array);
    const normals=new Float32Array(geometry.getAttribute('normal').array);
    if(!positions.every(Number.isFinite)||!normals.every(Number.isFinite))throw Error('Nonfinite geometry');
    const name=node.getName(),partRole=role(name,variant);originalTriangles+=(geometry.index?.count||positions.length/3)/3;
    const primitive=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer))
      .setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer)).setMaterial(materials[partRole]);
    if(geometry.index)primitive.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(geometry.index.array)).setBuffer(buffer));
    const mesh=doc.createMesh(name).addPrimitive(primitive);
    scene.addChild(doc.createNode(name).setMesh(mesh).setExtras({supplierObjectName:name,visualizationRole:partRole}));
    objects.push({name,role:partRole});geometry.dispose();
  }
  if(!objects.length)throw Error('Empty model');
  doc.getRoot().setExtras({source:variant.sourceCadUrl,sourceSha256:variant.sourceCadSha256,presetId:variant.id,
    supplierCode:variant.supplierCode,notice:variant.visualizationNote});
  await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.22,error:.0015}),dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
  const dest=path.join(web,'public',variant.asset);await io.write(dest,doc);
  const bytes=await fs.readFile(dest);variant.assetSha256=createHash('sha256').update(bytes).digest('hex');variant.bytes=bytes.length;
  const saved=await io.read(dest);
  const triangleCount=saved.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
  const report={product:model.name,id:variant.id,bytes:bytes.length,originalTriangles,triangleCount,sourceDimensions:size.toArray(),objects,sha256:variant.assetSha256};
  reports.push(report);console.log(JSON.stringify({product:model.name,id:variant.id,bytes:bytes.length,triangleCount,objects:objects.length}));
}
await fs.writeFile(file,JSON.stringify(pilot,null,2));
await fs.writeFile(path.resolve(web,'../research/configurator/pilot-conversion-report.json'),JSON.stringify(reports,null,2));
