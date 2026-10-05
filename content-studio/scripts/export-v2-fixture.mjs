import {v2Fixture} from '../test/fixtures/v2.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const directory=new URL('../../research/dovanos123-integration-2026-10-04/M1/',import.meta.url);
await mkdir(directory,{recursive:true});
await writeFile(new URL('content-package.v2.fixture.json',directory),JSON.stringify(v2Fixture(),null,2)+'\n');
console.log('Wrote deterministic private contract fixture; no public registry changes.');
