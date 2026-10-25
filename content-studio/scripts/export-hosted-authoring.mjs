// Export only the canonical pure domain; no DATA, jobs, credentials or filesystem store.
import fs from 'node:fs/promises';import path from 'node:path';import{createRequire}from'node:module';import{createHash}from'node:crypto';
const publicRoot=process.env.STUDIO_PUBLIC_CORE_DIR;if(!publicRoot)throw Error('STUDIO_PUBLIC_CORE_DIR is required');
const core=path.resolve(import.meta.dirname,'../..'),{build}=createRequire(path.join(publicRoot,'package.json'))('esbuild');
const result=await build({entryPoints:[path.join(core,'content-studio/src/hosted-authoring.mjs')],bundle:true,format:'esm',platform:'node',write:false,metafile:true,absWorkingDir:core,legalComments:'none'});
if(Object.keys(result.metafile.inputs).some(p=>/model\.mjs|server\.mjs|image-pipeline/.test(p)))throw Error('Hosted SDK contains local runtime');
const target=path.join(publicRoot,'vendor/content-studio');await fs.mkdir(target,{recursive:true});const bytes=result.outputFiles[0].contents;
await fs.writeFile(path.join(target,'authoring.mjs'),bytes);
const sha=b=>createHash('sha256').update(b).digest('hex');const files=[];for(const rel of Object.keys(result.metafile.inputs))files.push({path:rel,sha256:sha(await fs.readFile(path.join(core,rel)))});
await fs.writeFile(path.join(target,'source.json'),JSON.stringify({kind:'canonical-studio-pure-authoring',artifactSha256:sha(bytes),files},null,2)+'\n');console.log('HOSTED_AUTHORING_EXPORTED',files.length,bytes.length);
