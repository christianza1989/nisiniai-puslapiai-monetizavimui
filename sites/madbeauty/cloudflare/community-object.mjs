import {DurableObject} from 'cloudflare:workers';
import {communityState} from '../backend/community-state.mjs';
import {createCommunityPerson,createCommunityConversation} from '../backend/community.mjs';
import {ApiError} from '../backend/primitives.mjs';
export class MadbeautyCommunity extends DurableObject {
 constructor(ctx,env){super(ctx,env);const sql=ctx.storage.sql;
  const db={exec:q=>sql.exec(q).toArray(),prepare:q=>({get:(...a)=>sql.exec(q,...a).toArray()[0],all:(...a)=>sql.exec(q,...a).toArray(),run:(...a)=>{const c=sql.exec(q,...a);c.toArray();return {changes:c.rowsWritten};}})};
  this.store=communityState(db,fn=>ctx.storage.transactionSync(fn));
 }
 // Binding RPC only. The Worker never forwards browser identity or capabilities.
 call(kind,entity,principal,method,input={}){
  try{
   const key=this.store.read('identity',{entity:null,kind:null});
   if(key.entity&& (key.entity!==entity||key.kind!==kind))throw new ApiError('FORBIDDEN','Kita saugyklos sritis.',403);
   if(!key.entity)this.store.transaction(()=>this.store.write('identity',{entity,kind},0));
   const engine=kind==='person'?createCommunityPerson(this.store,entity):kind==='conversation'?createCommunityConversation(this.store,entity.split('|')):null;
   if(!engine||typeof engine[method]!=='function')throw new ApiError('NOT_FOUND','Operacija nerasta.',404);
   return {result:engine[method](principal,input)};
  }catch(e){return {error:{code:e instanceof ApiError?e.code:'SERVER_ERROR',message:e instanceof ApiError?e.message:'Veiksmas nepavyko.',status:e instanceof ApiError?e.status:500}};}
 }
 fetch(){return new Response('Not found',{status:404});}
}
