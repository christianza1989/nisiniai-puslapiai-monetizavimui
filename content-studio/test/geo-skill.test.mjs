import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {loadEditorialSkill,SEO_SKILL_DIR} from '../src/editorial-skill.mjs';

test('both writer modes receive versioned GEO rules; old snapshot survives and missing module fails closed',async()=>{
  const tmp=await mkdtemp(path.join(os.tmpdir(),'geo-instruction-'));
  try{
    const source=path.join(tmp,'seo');await mkdir(path.join(source,'references'),{recursive:true});
    const files=['SKILL.md','references/studio-integration.md','references/evidence-contract.md','references/geo-publishing.md','references/treg-playbook.md','references/intent-quality.md','references/geo-measurement.md'];
    for(const file of files)await writeFile(path.join(source,file),await readFile(path.join(SEO_SKILL_DIR,file)));
    const snapshots=await Promise.all(['plan','draft'].map(mode=>loadEditorialSkill(mode,undefined,source)));
    for(const snapshot of snapshots){assert.ok(snapshot.metadata.files.includes('../niche-seo-geo-core/references/geo-publishing.md'));assert.ok(snapshot.instructions.includes('The active site\'s approved package/revision'));}
    await writeFile(path.join(source,'references/geo-publishing.md'),'A changed controlled GEO fixture instruction.');
    for(const [i,mode] of ['plan','draft'].entries()){
      const fresh=await loadEditorialSkill(mode,undefined,source);assert.notEqual(fresh.metadata.fingerprint,snapshots[i].metadata.fingerprint);
      assert.ok(!snapshots[i].instructions.includes('A changed controlled GEO fixture instruction.'));assert.ok(fresh.instructions.includes('A changed controlled GEO fixture instruction.'));
    }
    await rm(path.join(source,'references/geo-publishing.md'));
    for(const mode of ['plan','draft'])await assert.rejects(loadEditorialSkill(mode,undefined,source),/geo-publishing.md/);
  }finally{await rm(tmp,{recursive:true,force:true});}
});
