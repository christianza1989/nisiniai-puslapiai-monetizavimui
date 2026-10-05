import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {getSite,editPage,approvePage,saveResponsiveAsset,exportPackage} from '../../../content-studio/src/model.mjs';
const base=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const {prompts}=JSON.parse(await fs.readFile(path.join(base,'ASSET-PROMPTS.json'),'utf8'));
const filenames={hero:'exec-d752c01e-e754-492b-ad61-885ce961127c.png',materials:'exec-7b2597c0-6295-4cbd-909c-1677a3b88777.png',budget:'exec-40c43dda-eded-4798-a887-214e02f6af71.png',measure:'exec-e32bb3f6-f932-40c1-af62-6678630a3e59.png'};
const sourceRoot='C:/Users/lenovo/.codex/generated_images/01a0ec4c-c381-7c53-ac6e-8fc4e2755dc5';
const journal=[],media={};
await fs.mkdir(path.join(base,'assets'),{recursive:true});
for(const p of prompts){const source=path.join(sourceRoot,filenames[p.key]);const destination=path.join(base,'assets',`${p.key}-v2-original.png`);await fs.copyFile(source,destination);const bytes=await fs.readFile(destination);const a=await saveResponsiveAsset('laiptucentras',{mime:'image/png',alt:p.alt,rights:'Originalus šiam projektui ImageGen sukurtas vaizdas, 2026-10-01. Iliustracija nėra atliktų klientų darbų įrodymas.',prompt:p.prompt,credit:''},bytes);media[p.key]=a; journal.push({...p,source,destination,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),tool:'built-in image_gen',review:'Actual generated file visually reviewed before import; no logos/text, material relationships plausible; not build-ready engineering evidence.',variants:a.variants.map(({id,src,width,height,bytes,sha256})=>({id,src,width,height,bytes,sha256})),optimization:a.optimization});}
const assignments={'':['hero','materials'],'gidai':['budget','materials','measure'],'vidaus-laiptu-irengimas':['hero'],'laiptu-kaina':['budget'],'laiptu-konstrukcijos':['materials'],'laiptu-matavimas':['measure']};
const before=await getSite('laiptucentras');
const changes=[];
for(const [slug,keys] of Object.entries(assignments)){const p=before.pages.find(p=>p.slug===slug);if(!p?.publishedRevision)throw new Error(`Missing approved ${slug}`);await editPage('laiptucentras',p.id,{media:keys.map(k=>({id:media[k].id}))});await approvePage('laiptucentras',p.id,'root-source-and-media-review-20261001');changes.push({id:p.id,slug,mediaKeys:keys,bodySha256:crypto.createHash('sha256').update(JSON.stringify(p.body)).digest('hex'),bodyChanged:false,publishAtChanged:false});}
const result=await exportPackage('laiptucentras');
await fs.writeFile(path.join(base,'MEDIA.json'),JSON.stringify(journal,null,2)+'\n');
await fs.writeFile(path.join(base,'EDITORIAL-MEDIA-REVIEW.json'),JSON.stringify({reviewedAt:new Date().toISOString(),actor:'root AI agent; not owner or engineer approval',changes,package:result,historicalAssetsUnchanged:true,originalsPrivateOrLocalOnly:true},null,2)+'\n');
console.log(JSON.stringify({families:journal.length,variants:journal.reduce((n,j)=>n+j.variants.length,0),changedPages:changes.length,...result}));
