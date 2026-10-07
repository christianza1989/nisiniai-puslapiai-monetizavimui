import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,realpath,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {installCoreSkills} from './install-core-skills.mjs';

test('portable core discovery is idempotent and preserves an existing independent copy',async()=>{
  const tmp=await mkdtemp(path.join(os.tmpdir(),'core-discovery-'));
  try{
    const root=path.join(tmp,'repo'),dest=path.join(tmp,'skills');
    await mkdir(path.join(root,'SKILLS','builder'),{recursive:true});await mkdir(path.join(dest,'auditor'),{recursive:true});
    await mkdir(path.join(root,'SKILLS','auditor'),{recursive:true});
    for(const id of ['builder','auditor'])await writeFile(path.join(root,'SKILLS',id,'SKILL.md'),`---\nname: ${id}\ndescription: Test fixture.\n---\n`);
    await writeFile(path.join(root,'SKILLS','catalog.json'),JSON.stringify({skills:['builder','auditor'].map(id=>({id,role:'core',discovery:'installed-junction',entry:id+'/SKILL.md'}))}));
    await writeFile(path.join(dest,'auditor','SKILL.md'),'Independent owner content');
    const first=await installCoreSkills(root,dest);assert.equal(first[0].status,'INSTALLED');assert.equal(first[1].status,'EXISTING_COPY_PRESERVED');
    assert.equal(await realpath(path.join(dest,'builder')),await realpath(path.join(root,'SKILLS','builder')));
    const second=await installCoreSkills(root,dest);assert.equal(second[0].status,'ALREADY_LINKED');assert.equal(await readFile(path.join(dest,'auditor','SKILL.md'),'utf8'),'Independent owner content');
  }finally{await rm(tmp,{recursive:true,force:true});}
});
