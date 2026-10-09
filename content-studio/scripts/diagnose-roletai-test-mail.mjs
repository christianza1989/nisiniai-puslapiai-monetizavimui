// Read-only exact self-test header search in observed standard mail folders.
// Never reads bodies, moves mail, sends a second message or changes settings.
import {readFile,writeFile} from 'node:fs/promises';
import {connect} from 'node:tls';
const base=new URL('../../sites/roletaiklaipedoje/',import.meta.url),core=new URL('../../../dovanos-memorycasting/',import.meta.url);
const proof=JSON.parse(await readFile(new URL('MAIL_VERIFICATION.json',base),'utf8'));
if(!/^[a-f0-9-]{36}$/.test(proof.leadId)||proof.recipient!=='info@pinet.lt')throw Error('Require the one known marked self-test.');
const raw=await readFile(new URL('.dev.vars.hostinger',core),'utf8');
const config=Object.fromEntries(raw.trim().split('\n').map(line=>{const i=line.indexOf('=');return[line.slice(0,i),JSON.parse(line.slice(i+1))];}));
const quote=v=>'"'+v.replaceAll('\\','\\\\').replaceAll('"','\\"')+'"';
const socket=connect({host:'imap.hostinger.com',port:993,servername:'imap.hostinger.com',rejectUnauthorized:true});socket.on('error',()=>{});socket.setTimeout(12000,()=>socket.destroy());
let buffer='',waiting,tag=0;socket.on('data',b=>{buffer+=b.toString('utf8');if(buffer.length>65536)socket.destroy();waiting?.();});
const wait=async predicate=>{while(!predicate(buffer))await new Promise((resolve,reject)=>{const fail=()=>{waiting=null;reject(Error('IMAP unavailable'));};socket.once('error',fail);socket.once('close',fail);waiting=()=>{socket.off('error',fail);socket.off('close',fail);waiting=null;resolve();};});};
const command=async text=>{const id='Q'+(++tag);socket.write(`${id} ${text}\r\n`);await wait(v=>new RegExp(`(?:^|\\r\\n)${id} (OK|NO|BAD) `).test(v));const result=buffer;buffer='';if(!new RegExp(`${id} OK `).test(result))throw Error('IMAP rejected');return result;};
try{
 await wait(v=>v.includes('\r\n'));if(!buffer.startsWith('* OK'))throw Error('IMAP greeting');buffer='';
 await command(`LOGIN ${quote(config.LEAD_SMTP_USER)} ${quote(config.LEAD_SMTP_PASSWORD)}`);
 const list=await command('LIST "" "*"');
 const observed=[...list.matchAll(/^\* LIST \([^\r\n]*\) "[^"]*" (?:(?:"([^"]+)")|([^\r\n]+))/gm)].map(m=>m[1]||m[2]);
 const folders=observed.filter(v=>/^(?:INBOX[./])?(?:INBOX|Spam|Junk(?: E-mail)?|Sent(?: Items)?|Trash)$/i.test(v)),results=[];
 for(const folder of folders){
  await command('EXAMINE '+quote(folder));const match=await command('UID SEARCH HEADER Message-ID '+quote(proof.messageId));
  const ids=(match.match(/^\* SEARCH ([\d ]+)/m)?.[1]||'').trim().split(/\s+/).filter(Boolean),row={folder,found:ids.length>0};
  if(ids.length){
   if(ids.length!==1)throw Error('Ambiguous self-test match');
   const headers=await command(`UID FETCH ${ids[0]} (BODY.PEEK[HEADER.FIELDS (AUTHENTICATION-RESULTS X-SPAM-STATUS X-SPAM-SCORE X-SPAM-FLAG MESSAGE-ID)])`);
   row.authenticationResults=[...new Set([...headers.matchAll(/\b(spf|dkim|dmarc)=(pass|fail|softfail|neutral|none|temperror|permerror)\b/gi)].map(m=>m[0].toLowerCase()))];
   row.spamFlag=headers.match(/X-Spam-(?:Status|Flag):\s*(Yes|No)/i)?.[1]||'not supplied';
   row.spamScore=headers.match(/X-Spam-Score:\s*([\d.]+)/i)?.[1]||headers.match(/X-Spam-Status:[^\r\n]*score=([\d.]+)/i)?.[1]||'not supplied';
   row.onlySelectedSelfTestHeadersRead=true;
  }
  results.push(row);
 }
 await command('LOGOUT');
 const report={at:new Date().toISOString(),siteId:proof.siteId,messageId:proof.messageId,tlsVerified:true,readOnly:true,observedFolderCount:observed.length,standardFolders:results,noBodiesRead:true,noMailboxChanges:true,noSecondMessage:true};
 await writeFile(new URL('MAIL_DIAGNOSTIC.json',base),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch{console.error('Read-only marked-message diagnostic unavailable; credentials and mailbox content suppressed.');process.exitCode=1;}finally{socket.destroy();}
