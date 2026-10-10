import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
export const repo=path.resolve(import.meta.dirname,'../../..'),core=path.resolve(repo,'../madbeauty-platform-core-20261010'),coreSource='5661d5d6907d6f5d11514ae69c0decc6130d65e2';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:core,encoding:'utf8'}).trim(),coreSource);assert.equal(execFileSync('git',['diff','--name-only','HEAD'],{cwd:core,encoding:'utf8'}).trim(),'');
export const pinCore={name:'pin-accepted-public-core',setup(b){b.onResolve({filter:/dovanos-memorycasting/},a=>{const original=path.resolve(repo,'../dovanos-memorycasting'),resolved=path.resolve(a.resolveDir,a.path),relative=path.relative(original,resolved);assert.ok(!relative.startsWith('..')&&!path.isAbsolute(relative),'Unexpected core import');return {path:path.join(core,relative)};});}};
