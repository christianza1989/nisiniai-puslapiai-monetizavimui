import {openStore} from './store.mjs';
import {createPlatform} from './platform.mjs';
import path from 'node:path';
// Filesystem-owner CLI only. Never import into browser/server allowlist or expose as an HTTP endpoint.
const [command,id]=process.argv.slice(2),store=openStore(process.argv.includes('--preview')?{filename:path.resolve(import.meta.dirname,'../runtime/platform-preview.sqlite'),fixturePreview:true}:{}),platform=createPlatform(store);
try{
  if(command==='mail'){if(!id)throw Error('Supply exact challenge ID');const capture=store.capture(id);if(!capture)throw Error('Capture not found');console.log(JSON.stringify(capture));}
  else if(command==='grant-operator'){const row=store.db.prepare('SELECT id FROM accounts WHERE site_id=? AND email=?').get(store.siteId,String(id).toLowerCase());if(!row)throw Error('Existing authenticated account required');store.db.prepare('UPDATE accounts SET operator=1 WHERE id=?').run(row.id);console.log('Operator assigned to the specified existing account');}
  else if(command==='pending'){console.log(JSON.stringify(store.read().revisions.filter(r=>r.state==='pending').map(({id,organizationId,name})=>({id,organizationId,name})),null,2));}
  else if(command==='approve'){const r=store.read().revisions.find(r=>r.id===id&&r.state==='pending');if(!r)throw Error('Pending revision not found');const operator=store.db.prepare('SELECT id,operator FROM accounts WHERE site_id=? AND operator=1').get(store.siteId);if(!operator)throw Error('Authenticated operator account required');platform.moderate(operator,{id,state:'approved'});console.log('Specified pending revision approved');}
  else throw Error('Commands: mail <challengeId>, grant-operator <existingEmail>, pending, approve <revisionId>');
}finally{store.close();}
