// Filesystem-only helper for the authorized local email test. Never imported by HTTP.
import {writeFileSync} from 'node:fs';
import {openStore} from './store.mjs';
import path from 'node:path';
const email=String(process.argv[2]||'');if(!email.endsWith('@example.com'))throw Error('Only disposable example.com test identities are allowed.');
const preview=process.argv.includes('--preview'),store=openStore(preview?{filename:path.resolve(import.meta.dirname,'../runtime/platform-preview.sqlite'),fixturePreview:true}:{});try{const c=store.db.prepare('SELECT id FROM email_challenges WHERE email=? AND site_id=? AND consumed=0 ORDER BY created_at DESC LIMIT 1').get(email,store.siteId);if(!c)throw Error('No pending test challenge.');writeFileSync(new URL('../runtime/browser-test-code.json',import.meta.url),JSON.stringify({code:store.capture(c.id).code}),{mode:0o600});console.log('Local test challenge exported privately; no message was sent.');}finally{store.close();}
