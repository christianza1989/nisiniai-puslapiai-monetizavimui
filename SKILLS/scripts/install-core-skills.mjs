// Install maintained core entrypoints without overwriting existing skill copies.
import {readFile,lstat,realpath,symlink,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
export async function installCoreSkills(root,destination){
  const base=path.join(root,'SKILLS'),catalog=JSON.parse(await readFile(path.join(base,'catalog.json'),'utf8')),results=[];
  await mkdir(destination,{recursive:true});
  for(const skill of catalog.skills.filter(s=>s.role==='core'&&s.discovery==='installed-junction')){
    const source=await realpath(path.join(base,path.dirname(skill.entry))),target=path.join(destination,skill.id);
    const text=await readFile(path.join(source,'SKILL.md'),'utf8');
    if(text.match(/^name:\s*([^\r\n]+)$/m)?.[1]!==skill.id)throw Error('Source skill identity mismatch: '+skill.id);
    try{
      await lstat(target);
      const existing=await realpath(target);
      const equal=process.platform==='win32'?existing.toLowerCase()===source.toLowerCase():existing===source;
      if(!equal){results.push({id:skill.id,status:'EXISTING_COPY_PRESERVED',source,target});continue;}
      results.push({id:skill.id,status:'ALREADY_LINKED',source,target});
    }catch(error){
      if(error.code!=='ENOENT')throw error;
      // A broken symlink is still somebody's existing entry, never unlink it.
      try{await lstat(target);results.push({id:skill.id,status:'BROKEN_ENTRY_PRESERVED',source,target});continue;}catch(e){if(e.code!=='ENOENT')throw e;}
      await symlink(source,target,process.platform==='win32'?'junction':'dir');
      results.push({id:skill.id,status:'INSTALLED',source,target});
    }
  }
  return results;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const root=path.resolve(import.meta.dirname,'../..'),destination=process.argv[2]||path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills');
  try{const results=await installCoreSkills(root,path.resolve(destination));console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status.endsWith('_PRESERVED')))process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}
}
