import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

// Owner-selected article workload. Chat UI and user config cannot override it.
export const ARTICLE_GENERATION_POLICY=Object.freeze({model:'gpt-6-luna',reasoningEffort:'xhigh',policyVersion:'article-luna-xhigh-20261007',fallback:false});
export function editorialCliArgs({schemaPath,resultFile,mode='draft'}){
 if(!['draft','plan'].includes(mode))throw Error('Unknown editorial CLI mode');
 return ['--ask-for-approval','never','exec','--ephemeral','--ignore-user-config','--skip-git-repo-check','--sandbox','read-only',
  ...(mode==='draft'?['--model',ARTICLE_GENERATION_POLICY.model,'-c',`model_reasoning_effort="${ARTICLE_GENERATION_POLICY.reasoningEffort}"`]:[]),
  '--output-schema',schemaPath,'--output-last-message',resultFile,'-'];
}
export function verifyArticleCliHeader(header){
 const model=header.match(/^model:\s*(\S+)/m)?.[1];
 const reasoningEffort=header.match(/^reasoning effort:\s*(\S+)/m)?.[1];
 if(model!==ARTICLE_GENERATION_POLICY.model||reasoningEffort!==ARTICLE_GENERATION_POLICY.reasoningEffort)throw Error('Straipsnio CLI nepatvirtino privalomo gpt-6-luna / xhigh. Rezultatas nepriimtas; automatinio fallback nėra.');
 return {model,reasoningEffort};
}
export async function generateEditorialJson(prompt,schemaPath,{root,dataDir,mode='draft',timeoutMs=600000}={}){
 if(!root||!dataDir)throw Error('Explicit studio root and private data directory required');
 const temp=path.join(dataDir,'tmp');await mkdir(temp,{recursive:true});
 const resultFile=path.join(temp,`${randomUUID()}.json`);
 const args=editorialCliArgs({schemaPath,resultFile,mode});
 const codexJs=process.env.CODEX_JS||path.join(process.env.APPDATA||'','npm','node_modules','@openai','codex','bin','codex.js');
 const command=process.platform==='win32'&&existsSync(codexJs)?process.execPath:(process.env.CODEX_BIN||'codex');
 const startedAt=new Date().toISOString();
 try{
  const header=await new Promise((resolve,reject)=>{
   const child=spawn(command,command===process.execPath?[codexJs,...args]:args,{cwd:root,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
   let firstStderr='',tail='',settled=false;
   const finish=async(error)=>{
    if(settled)return;settled=true;clearTimeout(timer);
    if(error){
     const diagnostic=resultFile.replace(/\.json$/,'.failed.json');
     try{await writeFile(diagnostic,JSON.stringify({startedAt,mode,firstStderr,tail,error:String(error.message)},null,2));}catch{}
     reject(Error(`Redakcinis CLI nepavyko. Privati diagnostika: ${diagnostic}`));
    }else resolve(firstStderr);
   };
   const timer=setTimeout(()=>{child.kill();finish(Error('Redakcinis CLI viršijo darbo laiko ribą.'));},timeoutMs);
   child.stderr.on('data',b=>{if(firstStderr.length<8000)firstStderr=(firstStderr+b).slice(0,8000);tail=(tail+b).slice(-64000);});
   child.stdout.on('data',()=>{});
   child.on('error',finish);child.on('close',code=>finish(code===0?null:Error(`Redakcinis CLI grąžino ${code}: ${tail}`)));
   child.stdin.on('error',()=>{});child.stdin.end(prompt);
  });
  const observed=mode==='draft'?verifyArticleCliHeader(header):null;
  const raw=await readFile(resultFile,'utf8');
  const result=JSON.parse(raw);
  const resultArtifact=resultFile.replace(/\.json$/,'.result.json');
  await writeFile(resultArtifact,raw,{flag:'wx'});
  return {result,receipt:{...(mode==='draft'?ARTICLE_GENERATION_POLICY:{}),observed,startedAt,finishedAt:new Date().toISOString(),promptSha256:createHash('sha256').update(prompt).digest('hex'),resultSha256:createHash('sha256').update(raw).digest('hex'),resultArtifact:path.relative(dataDir,resultArtifact).replaceAll('\\','/'),execution:'CODEX_CLI',mode}};
 }finally{await rm(resultFile,{force:true});}
}
