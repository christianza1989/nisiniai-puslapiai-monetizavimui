import {reject} from './primitives.mjs';

// Central desired preferences and this bounded fanout intent are committed in
// the same SQL transaction. Organization acknowledgements are separate commits;
// a lost reply leaves durable retry work rather than inventing a shared rollback.
export function createCustomerControlQueue(store){
 const {db,siteId}=store;
 db.exec('CREATE TABLE IF NOT EXISTS directory_customer_control_versions(site_id TEXT NOT NULL,client_id TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(site_id,client_id)); CREATE TABLE IF NOT EXISTS directory_customer_controls(site_id TEXT NOT NULL,client_id TEXT NOT NULL,organization_id TEXT NOT NULL,revision INTEGER NOT NULL,due_at INTEGER NOT NULL,PRIMARY KEY(site_id,client_id,organization_id)); CREATE INDEX IF NOT EXISTS directory_controls_due ON directory_customer_controls(site_id,due_at);');
 return {
  enqueue:(clientId,transfers)=>{
   if(transfers.length>32)reject('CAPACITY','Per didelė organizacijų apimtis.',503);
   const revision=(db.prepare('SELECT revision FROM directory_customer_control_versions WHERE site_id=? AND client_id=?').get(siteId,clientId)?.revision||0)+1;if(!Number.isSafeInteger(revision))reject('CAPACITY','Nustatymų versijų riba pasiekta.',503);
   db.prepare('INSERT INTO directory_customer_control_versions VALUES(?,?,?) ON CONFLICT(site_id,client_id) DO UPDATE SET revision=excluded.revision').run(siteId,clientId,revision);
   for(const t of transfers)db.prepare('INSERT INTO directory_customer_controls VALUES(?,?,?,?,?) ON CONFLICT(site_id,client_id,organization_id) DO UPDATE SET revision=excluded.revision,due_at=excluded.due_at').run(siteId,clientId,t.organization_id,revision,store.clock());
   return revision;
  },
  pending:clientId=>db.prepare('SELECT client_id,organization_id,revision,due_at FROM directory_customer_controls WHERE site_id=?'+(clientId?' AND client_id=?':' AND due_at<=?')+' ORDER BY due_at,client_id,organization_id LIMIT 32').all(siteId,clientId||store.clock()),
  acknowledge:row=>db.prepare('DELETE FROM directory_customer_controls WHERE site_id=? AND client_id=? AND organization_id=? AND revision=?').run(siteId,row.client_id,row.organization_id,row.revision),
  retry:row=>db.prepare('UPDATE directory_customer_controls SET due_at=? WHERE site_id=? AND client_id=? AND organization_id=? AND revision=?').run(store.clock()+30000,siteId,row.client_id,row.organization_id,row.revision),
  nextAt:()=>db.prepare('SELECT MIN(due_at) AS due FROM directory_customer_controls WHERE site_id=?').get(siteId)?.due??null,
  revision:clientId=>db.prepare('SELECT revision FROM directory_customer_control_versions WHERE site_id=? AND client_id=?').get(siteId,clientId)?.revision||0,
  remaining:clientId=>!!db.prepare('SELECT revision FROM directory_customer_controls WHERE site_id=? AND client_id=? LIMIT 1').get(siteId,clientId)
 };
}

export function createCustomerControlReceiver(store){
 const {db,siteId}=store;
 db.exec('CREATE TABLE IF NOT EXISTS organization_customer_controls(site_id TEXT NOT NULL,client_id TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(site_id,client_id));');
 return {apply:(actor,revision,run)=>{
  if(!actor)reject('UNAUTHENTICATED','Prisijunkite.',401);
  if(!Number.isSafeInteger(revision)||revision<1)reject('INVALID_INPUT','Netinkama nustatymų versija.');
  const old=db.prepare('SELECT revision FROM organization_customer_controls WHERE site_id=? AND client_id=?').get(siteId,actor.id);
  if(old?.revision>revision)reject('STALE_CUSTOMER_CONTROL','Nustatymai pasikeitė.',409);
  // Even the same revision may follow a newer cache. Reconciliation is itself
  // idempotent and validates current cached preferences before any queued notice.
  run();
  db.prepare('INSERT INTO organization_customer_controls VALUES(?,?,?) ON CONFLICT(site_id,client_id) DO UPDATE SET revision=excluded.revision').run(siteId,actor.id,revision);
  return {revision};
 }};
}
