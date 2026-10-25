import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {CatalogRuntime} from './catalog-configurator';

// Local technical QA only. Never enabled by a URL, production binding, or
// release manifest. Incomplete text candidates cannot become public this way.
export async function localChairQA(){
 if(process.env.NODE_ENV!=='development'||process.env.ERGONOMIC_CHAIR_LOCAL_QA!=='1')return;
 const file=process.env.ERGONOMIC_CHAIR_QA_MANIFEST;if(!file)return;
 const manifest=JSON.parse(await fs.readFile(file,'utf8')) as {models:Record<string,{directory:string}>};
 const models:Record<string,{directory:string;runtime:CatalogRuntime}>={};
 for(const [key,entry] of Object.entries(manifest.models)){
  const directory=path.resolve(entry.directory);
  const bytes=await fs.readFile(path.join(directory,'runtime.json'));
  const proof=JSON.parse(await fs.readFile(path.join(directory,'RUNTIME-PROOF.json'),'utf8'));
  if(proof.result!=='PASS'||proof.runtimeSha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('Local QA runtime proof changed');
  models[key]={directory,runtime:JSON.parse(bytes.toString('utf8'))};
 }
 return models;
}
