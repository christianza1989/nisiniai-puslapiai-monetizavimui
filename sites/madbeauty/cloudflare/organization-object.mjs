import {DurableObject} from 'cloudflare:workers';
import {openDurableStore} from './store.mjs';
import {createOrganizationStaging} from '../backend/organization-handoff.mjs';
import {createOrganizationAuthority} from '../backend/organization-authority.mjs';
import {createOrganizationCommand} from '../backend/organization-directory.mjs';
import {createOrganizationMediaStage} from '../backend/organization-media.mjs';
import {createSqlMediaBucket} from './media-bucket.mjs';

// Exported and bound by the candidate deployment configuration. Provisioning has
// no authority effect: the private directory command requires a signed central actor
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
 storeOrganizationMedia(packet,objects){
  if(packet?.method!=='attachUploadedMedia')return {error:{code:'FORBIDDEN',message:'Prieiga neleidžiama.',status:403}};
  const targetName=packet?.targetName;if(!this.ctx.id.equals(this.env.ORGANIZATION_STAGING.idFromName(targetName)))throw Error('Organization object identity mismatch');
  return createOrganizationCommand(this.store,{targetName,writeMediaObjects:entries=>this.mediaBucket.putManySync(entries)}).execute(packet,objects);
 }
 async readOrganizationMedia(packet){
  if(packet?.method!=='mediaReadAccess')return {response:{error:{code:'FORBIDDEN',message:'Prieiga neleidžiama.',status:403}}};
  const response=this.executeDirectoryCommand(packet);if(response.error)return {response};
  try{const object=await this.mediaBucket.get(response.result.key);if(!object)throw Error('Missing object');return {response,bytes:await object.arrayBuffer()};}
  catch{return {response:{error:{code:'MEDIA_UNAVAILABLE',message:'Vaizdas laikinai nepasiekiamas.',status:503}}};}
 }
 fetch(){return new Response('Not found',{status:404});}
}
