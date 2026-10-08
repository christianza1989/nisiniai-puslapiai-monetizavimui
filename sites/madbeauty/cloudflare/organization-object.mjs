import {DurableObject} from 'cloudflare:workers';
import {openDurableStore} from './store.mjs';
import {createOrganizationStaging} from '../backend/organization-handoff.mjs';
import {createOrganizationAuthority} from '../backend/organization-authority.mjs';

// Exported for isolated runtime acceptance. No production binding or HTTP routing
// points here yet. Private prepare/activate RPCs require a source commit; this
// class still exposes no browser booking mutations or mail delivery methods.
export class MadbeautyOrganizationStaging extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.store=openDurableStore(ctx,env.SESSION_SECRET);this.staging=null;}
 stage(packet){const targetName='madbeauty:organization:v1:'+packet?.manifest?.organizationId;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');this.staging=createOrganizationStaging(this.store,{targetName});return this.staging.accept(packet);}
 stagingStatus(){return createOrganizationStaging(this.store,{targetName:''}).summary();}
 prepareAuthority(packet){const targetName=packet?.manifest?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');return createOrganizationAuthority(this.store,{targetName}).prepare(packet);}
 activateAuthority(token){const targetName=token?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');return createOrganizationAuthority(this.store,{targetName}).activate(token);}
 authorityStatus(){return createOrganizationAuthority(this.store,{targetName:''}).status();}
 discardAuthority(token){const targetName=token?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');return createOrganizationAuthority(this.store,{targetName}).discard(token);}
 fetch(){return new Response('Not found',{status:404});}
}
