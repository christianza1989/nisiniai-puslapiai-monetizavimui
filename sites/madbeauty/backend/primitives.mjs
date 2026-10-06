import {randomUUID} from 'node:crypto';
import {TAXONOMY} from '../prototype/demo-model.mjs';
export const SITE_ID='madbeauty';
export const randomId=type=>type+'_'+randomUUID();
export class ApiError extends Error{constructor(code,message,status=400){super(message);this.code=code;this.status=status;}}
export const reject=(code,message,status=400)=>{throw new ApiError(code,message,status);};
export const initialState=()=>Object.fromEntries(['organizations','locations','practitioners','resources','services','schedules','busyBlocks','clients','bookings','reviews','inquiries','waitlist','holds','messages','revisions','reports','preferences','events','memberships'].map(k=>[k,[]]).concat([['taxonomy',TAXONOMY],['idempotency',{}],['isDemo',false]]));
export const mediaPublic=a=>({id:a.id,alt:a.alt,variants:a.variants.map(v=>({file:'api/madbeauty/media/'+v.storageFile,width:v.width,height:v.height,bytes:v.bytes,sha256:v.sha256}))});
