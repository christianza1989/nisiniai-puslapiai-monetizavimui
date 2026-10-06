import {openStore} from '../backend/store.mjs';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
// This bounded fault injection touches only this named fictional acceptance account.
const filename=path.resolve(import.meta.dirname,'../runtime/platform-preview.sqlite');
const store=openStore({filename,fixturePreview:true});
try{
 const email='madbeauty-uiux-expiry@example.com';
 const account=store.db.prepare('SELECT id FROM accounts WHERE site_id=? AND email=?').get('madbeauty',email);
 if(!account)throw Error('Named fictional test account missing');
 const result=store.db.prepare('UPDATE sessions SET expires_at=? WHERE site_id=? AND account_id=?').run(Date.now()-1000,'madbeauty',account.id);
 await writeFile(path.resolve('research/madbeauty-implementation/uiux-session-expiry-v1.json'),JSON.stringify({at:new Date().toISOString(),environment:'private named fixture preview database',method:'bounded expiry fault injection for named fictional QA account',sessionsExpired:result.changes,noCredentialsExported:true},null,2));
 console.log('Named fictional acceptance session expired; no other account changed.');
}finally{store.close();}
