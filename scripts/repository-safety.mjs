import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2),staged=args.includes('--staged');
const root=path.resolve(args.find(a=>!a.startsWith('--'))??'.');
function git(argv,input){const r=spawnSync('git',argv,{cwd:root,encoding:null,input,maxBuffer:512*1024*1024});if(r.status!==0)throw new Error('git safety read failed');return r.stdout;}
const names=git(staged?['diff','--cached','--name-only','--diff-filter=ACM','-z']:['ls-files','-c','-o','--exclude-standard','-z']).toString().split('\0').filter(Boolean);
const files=[...new Set(names)];
const textExt=/\.(?:md|txt|json|jsonl|yaml|yml|toml|ini|cfg|conf|env|mjs|cjs|js|ts|tsx|jsx|py|ps1|cmd|sh|html|css|php|sql|csv|xml|svg)$/i;
const sensitiveName=/(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|[^/]*mail_login_and_password[^/]*|[^/]+\.(?:pem|key|db|sqlite3?))$/i;
const allowedExample=/(?:^|\/)\.env\.(?:example|sample)$/;
const patterns=[
  ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['openai-key',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{28,}\b/g],
  ['google-key',/\bAIza[A-Za-z0-9_-]{32,}\b/g],
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['aws-key',/\bAKIA[A-Z0-9]{16}\b/g]
];
const secrets=[];
const secretRootIndex=args.indexOf('--secrets-root');
const secretsRoot=secretRootIndex>=0?path.resolve(args[secretRootIndex+1]):root;
for(const name of ['.env','.dev.vars.hostinger','.dev.vars.voice','agent-business-core/runtime/.env','fabrikas-github-upload/.env','hostinger_mail_login_and_password.txt']){
  try{const raw=await fs.readFile(path.join(secretsRoot,name),'utf8');for(const line of raw.split(/\r?\n/)){const m=line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);if(m&&/PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY/i.test(m[1])){const v=m[2].replace(/^['"]|['"]$/g,'');if(v.length>=8&&!/^(?:change.?me|your[-_]|example|test|fake|placeholder|<)/i.test(v))secrets.push(v);}else if(name.endsWith('mail_login_and_password.txt')&&line.trim().length>=8&&!line.includes('@'))secrets.push(line.trim());}}
  catch(e){if(e.code!=='ENOENT')throw e;}
}
const findings=[],sizes=[];let bytes=0,textFiles=0;
async function* contents(){
  if(!staged){for(const file of files)yield [file,await fs.readFile(path.join(root,file))];return;}
  // Batch exact index objects: avoid starting a Git process for every file on Windows.
  for(let offset=0;offset<files.length;offset+=32){
    const batch=files.slice(offset,offset+32);
    if(batch.some(file=>/[\r\n]/.test(file)))throw new Error('Unsupported newline in staged filename');
    const output=git(['cat-file','--batch'],Buffer.from(batch.map(file=>':'+file).join('\n')+'\n'));
    let cursor=0;
    for(const file of batch){
      const end=output.indexOf(10,cursor);
      const header=end<0?'':output.subarray(cursor,end).toString('utf8');
      const match=header.match(/^[a-f0-9]+ blob (\d+)$/);
      if(!match)throw new Error('Staged object framing failed');
      const size=Number(match[1]),start=end+1;
      if(start+size>=output.length||output[start+size]!==10)throw new Error('Staged object length failed');
      yield [file,output.subarray(start,start+size)];
      cursor=start+size+1;
    }
    if(cursor!==output.length)throw new Error('Unexpected staged object output');
  }
}
for await(const [file,data] of contents()){
  bytes+=data.length;sizes.push({file,bytes:data.length});
  if(sensitiveName.test(file)&&!allowedExample.test(file))findings.push({file,line:null,rule:'blocked-secret-or-database-file'});
  if(data.length>90*1024*1024)findings.push({file,line:null,rule:'file-exceeds-safe-github-size'});
  if(!textExt.test(file)&&!file.endsWith('.npmrc'))continue;
  textFiles++;const text=data.toString('utf8');
  for(const [rule,re] of patterns){re.lastIndex=0;for(const m of text.matchAll(re))findings.push({file,line:text.slice(0,m.index).split('\n').length,rule});}
  for(const secret of secrets){const index=text.indexOf(secret);if(index>=0)findings.push({file,line:text.slice(0,index).split('\n').length,rule:'matches-local-secret-value'});}
}
const report={status:findings.length?'FAIL':'PASS',mode:staged?'exact-staged-blobs':'candidate-working-files',files:files.length,textFiles,bytes,findings,largest:sizes.sort((a,b)=>b.bytes-a.bytes).slice(0,8),limitations:'Pattern checks and exact local-secret matches; not a proof that arbitrary customer data is absent. Ignore-policy and scope review are separate.'};
const index=args.indexOf('--report');if(index>=0){const dest=path.resolve(args[index+1]);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));process.exitCode=findings.length?1:0;
