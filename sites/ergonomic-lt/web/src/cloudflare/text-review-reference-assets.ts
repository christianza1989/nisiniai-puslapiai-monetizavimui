import {env} from 'cloudflare:workers';
import {textReviewAssetRequest} from '../lib/text-review-asset-origin';
export function referenceAsset(request:Request){
 if(!env.REFERENCE_ASSETS)throw Error('Read-only reference asset binding unavailable');
 const upstream=textReviewAssetRequest(request);if(env.PRIVATE_SOURCE_READ_TOKEN)upstream.headers.set('Authorization','Bearer '+env.PRIVATE_SOURCE_READ_TOKEN);
 return env.REFERENCE_ASSETS.fetch(upstream);
}
