// Isolated acceptance harness only. No public API, external transport or production import.
import {DurableObject} from 'cloudflare:workers';
import {openDurableStore} from '../cloudflare/store.mjs';
import {createNativeRecipientCapture} from './native-recipient-adapter.mjs';
import {createPlatform} from '../backend/platform.mjs';
import {createRetention} from '../backend/retention.mjs';
import {RETENTION_POLICY} from '../backend/retention-policy.mjs';
export class RecipientCapture extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.now=Number(env.CAPTURE_CLOCK);this.store=openDurableStore(ctx,'public-synthetic-workers-secret-32',{clock:()=>this.now});this.store.retentionPolicyVersion=RETENTION_POLICY.version;}
 async adapter(){return createNativeRecipientCapture({store:this.store,scope:{business_id:'business-test',site_id:'madbeauty',environment_id:'capture-native',environment_class:'test'},adapterId:'madbeauty-native',sourceRelease:'native-workers-capture-v1',recipientKeyId:'recipient-test-v1',recipientSecret:Uint8Array.from({length:32},(_,i)=>i+1),transportKeyId:'transport-test-v1',transportSecret:Uint8Array.from({length:32},(_,i)=>i+41),transportPermissions:['recipient-challenge','verify-recipient','retire-recipient','resolve','events'],captureOnly:true});}
 async login(invitationRef,email='owner@example.test'){const a=await this.adapter(),s=a.auth.session(null),c=a.startInvitation(s,{invitationRef,email,ip:'isolated-native'}),mail=this.store.db.prepare('SELECT payload FROM mail_outbox WHERE challenge_id=?').get(c.challengeId);return JSON.stringify(a.verifyInvitation(s,{challengeId:c.challengeId,code:this.store.unseal(mail.payload).code,ip:'isolated-native'}));}
 async prepare(invitationRef){return (await this.adapter()).prepare(invitationRef);}
 async packet(id){return JSON.stringify(await(await this.adapter()).packet(id));}
 async accept(id,raw){return JSON.stringify((await this.adapter()).acceptReceipt(id,JSON.parse(raw)));}
 async state(invitationRef){return (await this.adapter()).state(invitationRef);}
 async advance(ms){this.now+=Number(ms);}
 async erase(accountId){await this.adapter();const user=this.store.db.prepare('SELECT id,email,name,operator FROM accounts WHERE id=?').get(accountId);return JSON.stringify(createRetention(this.store).begin({...user,verifiedAt:this.now},{confirmEmail:user.email,policyVersion:RETENTION_POLICY.version}));}
 async retirementStatus(){return JSON.stringify((await this.adapter()).retirementStatus());}
 async retirementPacket(id){return JSON.stringify(await(await this.adapter()).retirementPacket(id));}
 async retirementCapture(id,receipt){return JSON.stringify(await(await this.adapter()).dispatchRetirement(id,async()=>new Response(receipt,{status:200})));}
 async privacySummary(){return JSON.stringify({pending:this.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_pending').get().n,requests:this.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_requests').get().n,privacy:this.store.db.prepare('SELECT state,payload,body_sha256 FROM native_recipient_privacy').all()});}
 async resolution(invitationRef,raw){return JSON.stringify((await this.adapter()).lifecycle.acceptResolution(invitationRef,JSON.parse(raw)));}
 async captureProvider(accountId,invitationRef){const a=await this.adapter(),user=this.store.db.prepare('SELECT id,email,name,operator FROM accounts WHERE id=?').get(accountId);return JSON.stringify(a.lifecycle.createOrganization({...user,verifiedAt:this.now},{name:'Workers native lifecycle',bio:'Isolated capture only',kind:'solo',city:'zarasai'},invitationRef));}
 async fixtureOperator(accountId){this.store.db.prepare('UPDATE accounts SET operator=1 WHERE id=?').run(accountId);return 'fixture-role-granted';}
 async lifecycleMutation(method,accountId,raw){const a=await this.adapter(),user=this.store.db.prepare('SELECT id,email,name,operator FROM accounts WHERE id=?').get(accountId);return JSON.stringify(a.lifecycle.execute(method,{...user,verifiedAt:this.now},JSON.parse(raw)));}
 async lifecycleWorkspace(accountId,organizationId){const a=await this.adapter(),user=this.store.db.prepare('SELECT id,email,name,operator FROM accounts WHERE id=?').get(accountId);return JSON.stringify(a.lifecycle.workspace({...user,verifiedAt:this.now},{role:'professional',organizationId}));}
 async lifecycleStatus(){return JSON.stringify((await this.adapter()).lifecycle.status());}
 async lifecycleCurrent(id){return JSON.stringify((await this.adapter()).lifecycle.current(id));}
 async lifecyclePacket(id){return JSON.stringify(await(await this.adapter()).lifecycle.packet(id));}
 async lifecycleCapture(id,raw){return JSON.stringify(await(await this.adapter()).lifecycle.dispatch(id,async()=>new Response(raw,{status:200})));}
 async ordinaryProvider(accountId){const user=this.store.db.prepare('SELECT id,email,name,operator FROM accounts WHERE id=?').get(accountId);return JSON.stringify(createPlatform(this.store).createOrganization({...user,verifiedAt:this.now},{name:'Isolated native capture',bio:'Offline harness',kind:'solo',city:'Vilnius'}));}
 async summary(){return JSON.stringify({requests:this.store.db.prepare('SELECT COUNT(*) n FROM native_recipient_requests').get().n,accounts:this.store.db.prepare('SELECT COUNT(*) n FROM accounts').get().n,mail:this.store.db.prepare('SELECT type,state FROM mail_outbox').all(),external_sent:false});}
}
export default {fetch(){return new Response('Not found',{status:404});}};
