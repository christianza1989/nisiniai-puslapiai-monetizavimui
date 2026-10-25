import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {catalogAssets} from '../src/lib/catalog-configurator';
import {parts,compact} from './configurator-geometry.mjs';
async function main(){
 await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}),root=path.resolve('../research/configurator/batch-10-colour-source'),manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')),report=[];
 for(const proof of manifest){
  const roles=new Map(),assembly=catalogAssets(proof.state);
  async function add(asset:string){const doc=await io.read(path.join('public',asset));for(const node of doc.getRoot().listNodes().filter(n=>n.getMesh()))roles.set(node.getName(),node.getExtras().finishField);}
  assert(assembly.base);await add(assembly.base.asset);for(const patch of assembly.patches){for(const id of patch.remove)roles.delete(id);for(const asset of [...(patch.geometry?[patch.geometry]:[]),...(patch.geometries||[])])await add(asset.asset);}
  async function source(name:string):Promise<{id:string;material:string}[]>{const receipt=JSON.parse(await fs.readFile(path.join(root,proof.article,name+'.json'),'utf8'));return parts(compact(await io.read(path.join(root,receipt.geometry.file))));}
  const baseline=new Map((await source('base')).map(part=>[part.id,part.material]));
  for(const field of proof.fields){const changed=(await source(field)).filter(part=>baseline.get(part.id)!==part.material);assert(changed.length>0,proof.article+' source does not preview '+field);for(const part of changed)assert.equal(roles.get(part.id),field,proof.article+' '+part.id+' finish ownership');report.push({article:proof.article,field,changedParts:changed.length,passed:true});}
 }
 await fs.writeFile('../research/configurator/batch-10/colour-role-verification.json',JSON.stringify(report,null,2));console.log(report.length,'supplier-confirmed independent finish roles');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
