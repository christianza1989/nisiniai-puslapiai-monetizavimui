import {readdir,writeFile} from 'node:fs/promises';import {DatabaseSync} from 'node:sqlite';import assert from 'node:assert/strict';
const folder='C:/Users/lenovo/Documents/dovanos-memorycasting/output/laiptucentras-production/.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const files=(await readdir(folder)).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite');assert.equal(files.length,1);
const db=new DatabaseSync(folder+'/'+files[0]),name='AUDIT-UI-laiptucentras-20261001';
try{const rows=db.prepare('SELECT id,site_id,source_path,status FROM niche_leads WHERE name=? AND site_id=?').all(name,'laiptucentras');assert.equal(rows.length,1);assert.equal(rows[0].source_path,'/kontaktai');assert.equal(rows[0].status,'new');
 const removed=db.prepare('DELETE FROM niche_leads WHERE id=? AND site_id=? AND name=?').run(rows[0].id,'laiptucentras',name);assert.equal(removed.changes,1);
 const evidence={at:new Date().toISOString(),synthetic:true,uiFormSubmission:true,stored:rows[0],smtpDisabled:true,syntheticRecordRemoved:true};await writeFile(new URL('./qa/ui-d1.json',import.meta.url),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{db.close();}
