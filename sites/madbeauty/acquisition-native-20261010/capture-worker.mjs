// Isolated acceptance harness only. No public API, external transport or production import.
import {DurableObject} from 'cloudflare:workers';
import {openDurableStore} from '../cloudflare/store.mjs';
import {createNativeRecipientCapture} from './native-recipient-adapter.mjs';
import {createPlatform} from '../backend/platform.mjs';
import {createRetention} from '../backend/retention.mjs';
import {RETENTION_POLICY} from '../backend/retention-policy.mjs';
export class RecipientCapture extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.now=Number(env.CAPTURE_CLOCK);this.store=openDurableStore(ctx,'public-synthetic-workers-secret-32',{clock:()=>this.now});this.store.retentionPolicyVersion=RETENTION_POLICY.version;}
 async adapter(){return createNativeRecipientCapture({store:this.store,scope:{business_id:'business-test',site_id:'madbeauty',environment_id:'capture-native',environment_class:'test'},adapterId:'madbeauty-native',sourceRelease:'native-workers-capture-v1',recipientKeyId:'recipient-test-v1',recipientSecret:Uint8Array.from({length:32},(_,i)=>i+1),transportKeyId:'transport-test-v1',transportSecret:Uint8Array.from({length:32},(_,i)=>i+41),captureOnly:true});}
 async login(invitationRef){const a=await this.adapter(),s=a.auth.session(null),c=a.startInvitation(s,{invitationRef,email:'owner@example.test',ip:'isolated-native'}),mail=this.store.db.prepare('SELECT payload FROM mail_outbox WHERE challenge_id=?').get(c.challengeId);return JSON.stringify(a.verifyInvitation(s,{challengeId:c.challengeId,code:this.store.unseal(mail.payload).code,ip:'isolated-native'}));}
 async prepare(invitationRef){return (await this.adapter()).prepare(invitationRef);}
 async packet(id){return JSON.stringify(await(await this.adapter()).packet(id));}
 async accept(id,raw){return JSON.stringify((await this.adapter()).acceptReceipt(id,JSON.parse(raw)));}
 async state(invitationRef){return (await this.adapter()).state(invitationRef);}
 async advance(ms){this.now+=Number(ms);}
 async erase(accountId){const user=this.store.db.prepare('SELECT id,email,name,operator FROM accounts WHERE id=?').get(accountId);return JSON.stringify(createRetention(this.store).begin({...user,verifiedAt:this.now},{confirmEmail:user.email,policyVersion:RETENTION_POLICY.version}));}
 async ordinaryProvider(accountId){const user=this.store.db.prepare('SELECT id,email,name,operator FROM accounts WHERE id=?').get(accountId);return JSON.stringify(createPlatform(this.store).createOrganization({...user,verifiedAt:this.now},{name:'Isolated native capture',bio:'Offline harness',kind:'solo',city:'Vilnius'}));}
 async summary(){return {requests:this.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_requests').get().n,accounts:this.store.db.prepare('SELECT COUNT(*) n FROM accounts').get().n,mail:this.store.db.prepare('SELECT type,state FROM mail_outbox').all(),external_sent:false};}
}
export default {fetch(){return new Response('Not found',{status:404});}};
