import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {archiveClient} from '../../domain-history/history.mjs';
const dir=import.meta.dirname+'/history/',audit=JSON.parse(await readFile(dir+'audit.json','utf8'));
let cooldown;try{cooldown=JSON.parse(await readFile(new URL('../../domain-history/data/cooldown.json',import.meta.url),'utf8'))}catch{}
if(Date.parse(cooldown?.until)>Date.now())throw Error('Archive cooldown; existing evidence retained');
const client=archiveClient(),rows=[];await mkdir(dir+'samples',{recursive:true});
for(const s of audit.snapshots){try{const r=await client.read(s.resolvedUrl,'semantic-replay');await writeFile(dir+'samples/'+s.timestamp+'.html',r.body);const text=r.body.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();rows.push({date:s.capturedAt,timestamp:s.timestamp,url:s.replayUrl,extractedText:text});console.log(s.timestamp,text)}catch(e){rows.push({url:s.replayUrl,error:String(e)});console.log(s.timestamp,String(e))}}
await writeFile(dir+'semantic-read.json',JSON.stringify({checkedAt:new Date().toISOString(),requests:client.requests,rows},null,2)+'\n');
if(client.limited)await writeFile(new URL('../../domain-history/data/cooldown.json',import.meta.url),JSON.stringify({until:new Date(Date.now()+900000).toISOString(),reason:'archive_http_429'})+'\n');
