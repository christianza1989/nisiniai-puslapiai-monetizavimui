// Isolated retention inventory; no customer records or external send.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {openStore} from '../backend/store.mjs';
import {createOrganizationMailReceipts} from '../backend/organization-mail.mjs';
let now=Date.parse('2026-10-10T00:00:00Z');const store=openStore({filename:':memory:',clock:()=>now});
try{
 const receipts=createOrganizationMailReceipts(store),transfer={organization_id:'isolated-retention-org',epoch:1};
 for(let n=0;n<4096;n++){const row=receipts.reserve(transfer,{id:'retention-'+n,accountId:'isolated-client',messageHash:'hash-'+n,leaseToken:'lease-'+n});receipts.acknowledged(receipts.settle(row,'accepted'));}
 assert.equal(receipts.capacity(),false);now+=60*86400000;assert.equal(receipts.pending().length,0);assert.equal(receipts.capacity(),false);
 assert.throws(()=>receipts.reserve(transfer,{id:'new-retention-mail',accountId:'isolated-client',messageHash:'new-hash',leaseToken:'new-lease'}),e=>e.code==='CAPACITY');
 const record={at:new Date().toISOString(),adapter:'Node SQLite :memory:',completedReceipts:4096,elapsedDays:60,pendingAcknowledgements:0,nextNewReceipt:'CAPACITY503',externalMailSent:0,customerRecords:0,conclusion:'Reproduced bounded journal exhaustion; no current timed retirement. Not a production incident or a capacity guarantee.'};
 await writeFile(new URL('./CAPACITY_OBSERVATION.json',import.meta.url),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
}finally{store.close();}
