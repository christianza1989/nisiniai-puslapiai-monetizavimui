// Exact marked local browser fixture only; refuses ambiguous storage or names.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const base=new URL('../../sites/roletaiklaipedoje/',import.meta.url),core=new URL('../../../dovanos-memorycasting/',import.meta.url);
const ui=JSON.parse(await readFile(new URL('verification/native-success-ui.json',base),'utf8'));
assert.match(ui.name,/^BROWSER-ROLETai-20261007-\d{13}$/);assert.equal(ui.url,'http://127.0.0.1:8794/uzklausa');
const dir=new URL('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/',core),files=(await readdir(dir)).filter(p=>p.endsWith('.sqlite')&&p!=='metadata.sqlite');assert.equal(files.length,1);
const db=new DatabaseSync(fileURLToPath(new URL(files[0],dir))),site='roletaiklaipedoje';
try{
 const rows=db.prepare('SELECT id,site_id,source_path,status,consent_at FROM niche_leads WHERE site_id=? AND name=?').all(site,ui.name);
 assert.equal(rows.length,1);const row=rows[0];assert.equal(row.source_path,'/kontaktai');assert.equal(row.status,'new');assert.ok(row.consent_at>0);assert.match(row.id,/^[a-f0-9-]{36}$/);
 const deleted=db.prepare('DELETE FROM niche_leads WHERE id=? AND site_id=? AND name=?').run(row.id,site,ui.name);assert.equal(deleted.changes,1);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM niche_leads WHERE site_id=? AND name=?').get(site,ui.name).n,0);
 const report={...ui,at:new Date().toISOString(),siteId:site,durable:row,syntheticRecordRemoved:true,cleanupScope:'exact UUID/site/name only',SMTP:false,returnLink:'Browser clicked Grįžti į pradžią and observed homepage',packageSha256:JSON.parse(await readFile(new URL('LOCAL_RELEASE.json',base),'utf8')).packageSha256};
 await writeFile(new URL('NATIVE_FORM_QA.json',base),JSON.stringify(report,null,2));console.log(JSON.stringify({siteId:site,storedStatus:row.status,consentStored:true,syntheticRecordRemoved:true}));
}finally{db.close();}
