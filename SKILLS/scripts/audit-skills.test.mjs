import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditSkills} from './audit-skills.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('maintained imported archives retain their exact catalogued original bytes',async()=>{
 const catalog=JSON.parse(await fs.readFile(new URL('../catalog.json',import.meta.url),'utf8'));
 const entries=catalog.skills.flatMap(skill=>skill.archives);
 assert.ok(entries.length>0);
 for(const entry of entries){
  const bytes=await fs.readFile(new URL('../'+entry.file,import.meta.url));
  assert.equal(sha(bytes),entry.sha256,'Original archive byte drift: '+entry.file);
 }
});

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pinet-skill-audit-'));
 t.after(async()=>{
  const target=path.resolve(root);
  assert.equal(path.dirname(target),path.resolve(os.tmpdir()));
  assert(path.basename(target).startsWith('pinet-skill-audit-'));
  await fs.rm(target,{recursive:true,force:true});
 });
 const write=async(file,bytes)=>{
  await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});
  await fs.writeFile(path.join(root,file),bytes);
 };
 const skills=[];
 for(const id of ['pinet-audit-fixture-one','pinet-audit-fixture-two']){
  const entry=`${id}/SKILL.md`,archive=`${id}/SOURCE_SKILL.md`;
  const text=`---\nname: ${id}\ndescription: Fixture for an isolated audit regression.\n---\nFixture instructions.\n`;
  await write(`SKILLS/${entry}`,text);
  await write(`SKILLS/${archive}`,'original archive\r\n');
  skills.push({id,entry,entrySha256:sha(text),role:'utility',discovery:'project-library',originalOrigin:'fixture',archives:[{file:archive,sha256:sha('original archive\r\n')}]});
 }
 await write('SKILLS/catalog.json',JSON.stringify({skills}));
 await write('SKILLS/README.md','Fixture README.\n');
 await write('SKILLS/PROJECT_CONTRACT.md','Fixture contract.\n');
 return {root,write,skills};
}

function unavailable(message,code){
 const error=new Error(message);
 error.status=code?null:1;
 error.stderr=code?'':message;
 if(code)error.code=code;
 return error;
}

test('a missing provider dependency reports once and independent audit checks continue',async t=>{
 const f=await fixture(t),calls=[];
 await f.write(`SKILLS/${f.skills[0].archives[0].file}`,'altered archive\n');
 await f.write(`SKILLS/${f.skills[1].entry}`,'---\nname: changed-name\n---\nChanged entry.\n');
 await f.write('SKILLS/README.md','[Missing local target](missing.md)\n');
 const report=await auditSkills(f.root,{executeValidator:(...args)=>{
  calls.push(args);throw unavailable("ModuleNotFoundError: No module named 'yaml'");
 }});
 assert.equal(calls.length,1,'an unavailable provider must not be rerun for each skill');
 assert.equal(calls[0][1][2],'-c');
 assert.match(calls[0][1][3],/runpy\.run_path/,'preflight imports the actual provider');
 assert.equal(report.status,'FAIL');
 assert.equal(report.structuralValidator.status,'UNAVAILABLE');
 assert.match(report.structuralValidator.output,/No module named 'yaml'/);
 assert.equal(report.issues.filter(issue=>issue.startsWith('validator_unavailable:')).length,1);
 assert(report.issues.some(issue=>/PyYAML/.test(issue)));
 assert(!report.issues.some(issue=>/Skill structural validation failed/.test(issue)));
 assert(report.records.every(record=>record.validator.status==='NOT_RUN'));
 assert(report.issues.some(issue=>/Original source modified/.test(issue)));
 assert(report.issues.some(issue=>/Entry changed since catalog review/.test(issue)));
 assert(report.issues.some(issue=>/Frontmatter name\/folder mismatch/.test(issue)));
 assert(report.issues.some(issue=>/Broken local link/.test(issue)));
 assert.equal(report.archivesVerified,1);
 assert.equal(report.totalSkills,2);
});

test('an unavailable Python executable is one actionable provider failure',async t=>{
 const f=await fixture(t);
 const report=await auditSkills(f.root,{validatorPython:'missing-python',validatorScript:'C:/configured provider/quick_validate.py',executeValidator:()=>{
  throw unavailable('spawn missing-python ENOENT','ENOENT');
 }});
 assert.equal(report.status,'FAIL');
 assert.equal(report.structuralValidator.python,'missing-python');
 assert.equal(report.structuralValidator.script,'C:/configured provider/quick_validate.py');
 assert.equal(report.structuralValidator.exitCode,null);
 assert.match(report.structuralValidator.output,/ENOENT/);
 assert.equal(report.issues.length,1);
 assert.equal(report.archivesVerified,2);
});

test('a configured available provider keeps invalid skill results distinct',async t=>{
 const f=await fixture(t),calls=[];
 const python='C:/configured Python/python.exe',script='C:/configured provider/quick_validate.py';
 const report=await auditSkills(f.root,{validatorPython:python,validatorScript:script,executeValidator:(executable,args,options)=>{
  calls.push({executable,args,options});
  if(args[2]==='-c')return '';
  if(path.basename(args[3])===f.skills[1].id){
   const error=unavailable('');error.stdout='Invalid YAML in frontmatter: fixture provider rejection\n';throw error;
  }
  return 'Skill is valid!\n';
 }});
 assert.equal(calls.length,3);
 assert(calls.every(call=>call.executable===python));
 assert.equal(calls[0].args[4],script);
 assert(calls.slice(1).every(call=>call.args[2]===script));
 assert(calls.every(call=>call.options.windowsHide===true&&call.options.timeout===30000));
 assert.equal(report.structuralValidator.status,'AVAILABLE');
 assert.equal(report.status,'FAIL');
 assert(!report.issues.some(issue=>issue.startsWith('validator_unavailable:')));
 assert.equal(report.issues.filter(issue=>/Skill structural validation failed/.test(issue)).length,1);
 assert.equal(report.records[0].validator.status,'PASS');
 assert.equal(report.records[1].validator.status,'FAIL');
 assert.equal(report.records[1].validator.exitCode,1);
 assert.match(report.records[1].validator.output,/Invalid YAML/);
 assert.equal(report.archivesVerified,2);
});

test('valid skills still pass only after provider preflight and every validation',async t=>{
 const f=await fixture(t),calls=[];
 const report=await auditSkills(f.root,{executeValidator:(_executable,args)=>{
  calls.push(args);return args[2]==='-c'?'':'Skill is valid!\n';
 }});
 assert.equal(report.status,'PASS_STRUCTURE_AND_CONFIGURATION');
 assert.equal(report.structuralValidator.status,'AVAILABLE');
 assert.equal(calls.length,3);
 assert.equal(report.issues.length,0);
 assert(report.records.every(record=>record.validator.status==='PASS'));
});
