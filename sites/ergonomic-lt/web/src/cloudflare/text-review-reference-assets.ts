import {env} from 'cloudflare:workers';
import {textReviewAssetRequest} from '../lib/text-review-asset-origin';
export function referenceAsset(request:Request){
 if(!env.REFERENCE_ASSETS)throw Error('Read-only reference asset binding unavailable');
 return env.REFERENCE_ASSETS.fetch(textReviewAssetRequest(request));
}
