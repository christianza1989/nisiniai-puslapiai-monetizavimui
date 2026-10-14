import {readFile} from 'node:fs/promises';
import {recordTextProvenance,listTextProvenance,verifyTextProvenance} from '../src/text-provenance.mjs';
const [command,siteId,arg,pageId]=process.argv.slice(2);
try{
 if(!siteId)throw Error('Usage: text-provenance.mjs <record|list|verify> <siteId> [JSON-file] [pageId]; list file contains filters');
 const input=arg?JSON.parse(await readFile(arg,'utf8')):{};
 const result=command==='record'?await recordTextProvenance(siteId,pageId,input):command==='list'?await listTextProvenance(siteId,input):command==='verify'?await verifyTextProvenance(siteId):(()=>{throw Error('Unknown provenance command');})();
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
