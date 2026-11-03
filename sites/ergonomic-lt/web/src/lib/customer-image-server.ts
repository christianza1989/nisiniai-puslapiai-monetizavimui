import type {Product} from './types';
import {preparedImageSource} from './product-image-sources';
import {prepareCustomerAsset} from './customer-assets-server';
export async function customerProductImage(p:Product){const source=preparedImageSource(p.image||'');return typeof source==='string'&&source.startsWith('/media/')?(await prepareCustomerAsset({asset:source})).url:null;}
