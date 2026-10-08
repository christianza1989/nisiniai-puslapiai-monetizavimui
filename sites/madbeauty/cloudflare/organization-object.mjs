import {DurableObject} from 'cloudflare:workers';
import {openDurableStore} from './store.mjs';
import {createOrganizationStaging} from '../backend/organization-handoff.mjs';
import {createOrganizationAuthority} from '../backend/organization-authority.mjs';
import {createOrganizationCommand} from '../backend/organization-directory.mjs';
import {createOrganizationMediaStage} from '../backend/organization-media.mjs';
import {createSqlMediaBucket} from './media-bucket.mjs';

// Exported for isolated runtime acceptance. No production binding or HTTP routing
// points here yet. The private directory command requires a signed central actor
// and active source commit. Browser sessions and mail transport remain central.
export class MadbeautyOrganizationStaging extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.store=openDurableStore(ctx,env.SESSION_SECRET);this.mediaBucket=createSqlMediaBucket(this.store);this.staging=null;}
 stage(packet){const targetName='madbeauty:organization:v1:'+packet?.manifest?.organizationId;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');this.staging=createOrganizationStaging(this.store,{targetName});return this.staging.accept(packet);}
 stagingStatus(){return createOrganizationStaging(this.store,{targetName:''}).summary();}
 stageOrganizationMedia(packet){const targetName=packet?.manifest?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');return createOrganizationMediaStage(this.store,{targetName}).accept(packet);}
 mediaStagingStatus(){return createOrganizationMediaStage(this.store,{targetName:''}).summary();}
 prepareAuthority(packet){const targetName=packet?.manifest?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');return createOrganizationAuthority(this.store,{targetName}).prepare(packet);}
 activateAuthority(token){const targetName=token?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');return createOrganizationAuthority(this.store,{targetName}).activate(token);}
 authorityStatus(){return createOrganizationAuthority(this.store,{targetName:''}).status();}
 discardAuthority(token){const targetName=token?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');return createOrganizationAuthority(this.store,{targetName}).discard(token);}
 executeDirectoryCommand(packet){const targetName=packet?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');return createOrganizationCommand(this.store,{targetName}).execute(packet);}
 fetch(){return new Response('Not found',{status:404});}
}
