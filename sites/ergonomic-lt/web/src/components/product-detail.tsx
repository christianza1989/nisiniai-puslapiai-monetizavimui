import type {Product} from '@/lib/types';
import {expandedClientSources,type ExpandedState} from '@/lib/expanded-configurator';
import type {CatalogRuntime} from '@/lib/catalog-configurator';
import {isAdmin} from '@/lib/auth';
import {previewMode} from '@/lib/catalog';
import {ProductDetailClient} from './product-detail-client';
export async function ProductDetail(props:{product:Product;url:string;presetOnly?:boolean;catalogRuntime?:CatalogRuntime;initialConfiguration?:ExpandedState;initialCustomized?:boolean;configurationMessage?:string}){
 const localizedPreview=previewMode();
 return <ProductDetailClient {...props} localizedPreview={localizedPreview} showAdminCodes={localizedPreview&&await isAdmin()} engineSources={expandedClientSources(props.product,props.catalogRuntime)}/>;
}
