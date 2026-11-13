import type {Product} from '@/lib/types';
import {expandedClientSources,type ExpandedState} from '@/lib/expanded-configurator';
import type {CatalogRuntime} from '@/lib/catalog-configurator';
import {previewMode} from '@/lib/catalog';
import {ProductDetailClient} from './product-detail-client';
export function ProductDetail(props:{product:Product;url:string;presetOnly?:boolean;catalogRuntime?:CatalogRuntime;initialConfiguration?:ExpandedState;initialCustomized?:boolean;configurationMessage?:string}){
 return <ProductDetailClient {...props} localizedPreview={previewMode()} engineSources={expandedClientSources(props.product,props.catalogRuntime)}/>;
}
