import type {Product} from './types';
import {preparedImageSource} from './product-image-sources';
import {prepareCustomerAsset} from './customer-assets-server';
import {customerKey} from './customer-capability';
import identities from '../../content/customer-photo-identities.json';
const urls=new Map<string,string>();
export async function customerProductImage(p:Product){const source=preparedImageSource(p.image||'');if(typeof source!=='string'||!source.startsWith('/media/'))return null;
 const identity=(identities.entries as Record<string,{sha256:string;bytes:number}>)[source];
 if(!identity)return (await prepareCustomerAsset({asset:source})).url;
 const cap=customerKey(),key=cap.id('photo',[source,identity.sha256]);let url=urls.get(key);if(!url){url='/media/p/'+cap.seal('asset',{asset:source,assetSha256:identity.sha256,bytes:identity.bytes});urls.set(key,url);if(urls.size>1600)urls.delete(urls.keys().next().value!);}return url;
}
