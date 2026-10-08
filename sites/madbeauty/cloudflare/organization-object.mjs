import {DurableObject} from 'cloudflare:workers';
import {openDurableStore} from './store.mjs';
import {createOrganizationStaging} from '../backend/organization-handoff.mjs';

// Exported for isolated runtime acceptance. No production binding or HTTP routing
// points here yet. This class has no booking mutations or mail delivery methods.
export class MadbeautyOrganizationStaging extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.store=openDurableStore(ctx,env.SESSION_SECRET);this.staging=null;}
 stage(packet){const targetName='madbeauty:organization:v1:'+packet?.manifest?.organizationId;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');this.staging=createOrganizationStaging(this.store,{targetName});return this.staging.accept(packet);}
 stagingStatus(){return createOrganizationStaging(this.store,{targetName:''}).summary();}
 fetch(){return new Response('Not found',{status:404});}
}
