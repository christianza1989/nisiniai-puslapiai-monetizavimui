import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {checkCommittedCoverage} from './core-upgrade-check.mjs';
test('committed coverage rejects missing scope and ignores uncommitted claims',()=>{
 const repo=mkdtempSync(join(tmpdir(),'pinet-coverage-')),entry='upgrade-11111111-1111-4111-8111-111111111111';
 const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',windowsHide:true});
 git('init','-q');git('config','user.name','Coverage fixture');git('config','user.email','coverage@example.test');
 writeFileSync(join(repo,'owned.mjs'),'old\n');git('add','.');git('commit','-qm','baseline');const base=git('rev-parse','HEAD').trim();
 const dir=join(repo,'core-improvements','entries',entry);mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,'record.json'),JSON.stringify({id:entry,paths:['owned.mjs']}));
 writeFileSync(join(repo,'owned.mjs'),'changed\n');git('add','.');git('commit','-qm','scoped fix');
 assert.equal(checkCommittedCoverage({repo,base,entry}).status,'PASS');
 writeFileSync(join(repo,'uncovered.mjs'),'new\n');git('add','.');git('commit','-qm','uncovered change');
 // Editing an uncommitted journal must never cover a committed change.
 writeFileSync(join(dir,'record.json'),JSON.stringify({id:entry,paths:['owned.mjs','uncovered.mjs']}));
 const failed=checkCommittedCoverage({repo,base,entry});assert.equal(failed.status,'FAIL_UNCOVERED');assert.deepEqual(failed.uncovered,['uncovered.mjs']);
 assert.throws(()=>checkCommittedCoverage({repo,base,entry:'../unsafe'}),/required/);
});
