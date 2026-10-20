import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sources=Object.fromEntries(Object.entries({index:'additional-index',catalog:'catalog',expanded:'expanded',pilot:'pilot'}).map(([key,name])=>[key,read(`content/configurator-${name}.json`)]));
const hash=createHash('sha256').update(JSON.stringify(sources)).digest('hex');
if(read('content/admin-source-status.json').technicalSourceHash!==hash)throw Error('Admin acceptance inventory is stale. Verify the technical release before rebuilding.');
console.log('Exact admin/technical release binding PASS');
