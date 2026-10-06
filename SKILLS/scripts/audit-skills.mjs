// Validate the actual project catalog, source preservation and instruction wiring.
// This is not a website/visual-quality scorer and performs no deployment or mail.
import {readFile,writeFile,stat,readdir,realpath,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function auditSkills(root){
 const base=path.join(root,'SKILLS'),catalog=JSON.parse(await readFile(path.join(base,'catalog.json'),'utf8'));
 const entries=(await readdir(base,{withFileTypes:true})).filter(e=>e.isDirectory());
 const actual=[];
 for(const e of entries){try{await access(path.join(base,e.name,'SKILL.md'));actual.push(e.name);}catch(error){if(error.code!=='ENOENT')throw error;}}
 const issues=[],records=[],links=[],fingerprints={};
 const allowedRoles=new Set(['core','phase1-support','business-operations','utility']);
 const ids=catalog.skills.map(s=>s.id);
 if(ids.length!==new Set(ids).size)issues.push('Duplicate catalog IDs');
 for(const id of actual)if(!ids.includes(id))issues.push(`Unregistered skill: ${id}`);
 for(const id of ids)if(!actual.includes(id))issues.push(`Missing skill: ${id}`);
 const markdown=new Set(['PROJECT_CONTRACT.md','README.md']);
 async function addMarkdown(directory){
  for(const entry of await readdir(path.join(base,directory),{withFileTypes:true})){
   const relative=path.posix.join(directory,entry.name);
   if(entry.isDirectory())await addMarkdown(relative);
   else if(entry.name.endsWith('.md')&&!entry.name.startsWith('SOURCE_'))markdown.add(relative);
  }
 }
 for(const skill of catalog.skills){
  const record={id:skill.id,role:skill.role,issues:[],sourceArchivesVerified:0,validator:null,discovery:null};
  if(!allowedRoles.has(skill.role))record.issues.push('Unknown role');
  const file=path.join(base,skill.entry),bytes=await readFile(file),text=bytes.toString('utf8');
  fingerprints[skill.entry]=sha(bytes);
  if(sha(bytes)!==skill.entrySha256)record.issues.push('Entry changed since catalog review; inspect and update its reviewed hash');
  if(text.match(/^name:\s*([^\r\n]+)$/m)?.[1]!==skill.id)record.issues.push('Frontmatter name/folder mismatch');
  try{record.validator={exitCode:0,output:execFileSync('python',['-X','utf8','C:/Users/lenovo/.codex/skills/.system/skill-creator/scripts/quick_validate.py',path.dirname(file)],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()};}
  catch(error){record.validator={exitCode:error.status,output:String(error.stdout||error.message).slice(0,1800)};record.issues.push('Skill structural validation failed');}
  for(const archive of skill.archives){
   if(sha(await readFile(path.join(base,archive.file)))!==archive.sha256)record.issues.push(`Original source modified: ${archive.file}`);
   else record.sourceArchivesVerified++;
  }
  for(const name of new Set([skill.id,skill.legacyName].filter(Boolean))){
   const installed=`C:/Users/lenovo/.codex/skills/${name}`;
   try{
    await access(installed);const resolved=await realpath(installed),expected=await realpath(path.dirname(file));
    if(resolved.toLowerCase()!==expected.toLowerCase()){
     if(skill.discovery==='project-synchronized'){
      async function checkMirror(relative=''){
       for(const entry of await readdir(path.join(path.dirname(file),relative),{withFileTypes:true})){
        if(entry.name==='__pycache__'||entry.name.endsWith('.pyc'))continue;
        const next=path.join(relative,entry.name);
        if(entry.isDirectory())await checkMirror(next);
        else if(entry.isFile()){
         try{if(sha(await readFile(path.join(path.dirname(file),next)))!==sha(await readFile(path.join(installed,next))))record.issues.push(`Installed mirror differs: ${next}`);}
         catch(error){if(error.code==='ENOENT')record.issues.push(`Installed mirror missing: ${next}`);else throw error;}
        }
       }
      }
      await checkMirror();
     }else record.issues.push(`Different installed copy/alias: ${name}`);
    }
    record.discovery={installed,resolved};
   }catch(error){if(error.code!=='ENOENT')throw error;}
  }
  if(skill.discovery==='installed-junction'&&!record.discovery)record.issues.push('Core discovery junction missing');
  if(skill.discovery==='project-library'&&record.discovery)record.issues.push('Library skill unexpectedly globally installed; reconcile intended discovery before claiming separation');
  await addMarkdown(skill.id);records.push(record);
 }
 for(const file of markdown){
  const bytes=await readFile(path.join(base,file));fingerprints[file]=sha(bytes);
  const content=bytes.toString('utf8');
  if((content.match(/^```/gm)||[]).length%2)issues.push(`Unclosed Markdown fence: ${file}`);
  const prose=content.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm,'');
  for(const match of prose.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)){
   const href=match[1].replace(/^<|>$/g,'');
   if(/^(?:https?:|mailto:|app:|codex:|#)/.test(href))continue;
   // Named templates/globs are documented variables, not real file assertions.
   if(/[<>*${}]/.test(href)){links.push({file,href,status:'TEMPLATE'});continue;}
   const target=path.resolve(path.dirname(path.join(base,file)),href.split('#')[0].replace(/:\d+$/,''));
   try{await stat(target);links.push({file,href,status:'EXISTS'});}
   catch(error){issues.push(`Broken local link: ${file} → ${href}`);links.push({file,href,status:'MISSING'});}
  }
 }
 const origins=Object.fromEntries([...new Set(catalog.skills.map(s=>s.originalOrigin))].map(o=>[o,catalog.skills.filter(s=>s.originalOrigin===o).length]));
 const roles=Object.fromEntries([...allowedRoles].map(role=>[role,records.filter(r=>r.role===role).length]));
 const allIssues=[...issues,...records.flatMap(r=>r.issues.map(i=>`${r.id}: ${i}`))];
 return {checkedAt:new Date().toISOString(),scope:`${records.length} project skills, current entry/prompts/references and exact imported source archives`,
  status:allIssues.length?'FAIL':'PASS_STRUCTURE_AND_CONFIGURATION',totalSkills:records.length,roles,origins,
  archivesVerified:records.reduce((n,r)=>n+r.sourceArchivesVerified,0),markdownFilesChecked:markdown.size,
  localLinksVerified:links.filter(l=>l.status==='EXISTS').length,templateLinksNotAsserted:links.filter(l=>l.status==='TEMPLATE'),
  records,issues:allIssues,links,instructionFingerprints:fingerprints,
  limitations:['Structural/source/link checks do not prove a model follows every instruction.','No new website result, Lighthouse or real UI enlargement was tested in this skills task.','Business messaging/voice/commerce remain outside automatic phase-one activation.','Historical site/first-result evidence is preserved, not retroactively upgraded.']};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const root=process.cwd(),report=await auditSkills(root),out=path.join(root,'research/skills-audit-2026-10-01');
 await mkdir(out,{recursive:true});await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,totalSkills:report.totalSkills,roles:report.roles,origins:report.origins,archivesVerified:report.archivesVerified,markdownFilesChecked:report.markdownFilesChecked,localLinksVerified:report.localLinksVerified,issues:report.issues},null,2));
 if(report.issues.length)process.exitCode=1;
}
