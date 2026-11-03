import type {ComponentProps} from 'react';
import {expandedClientSources,type ExpandedEngineSources} from '@/lib/expanded-configurator';
import ExpandedProductDetailClient from './expanded-product-detail-client';
type Props=Omit<ComponentProps<typeof ExpandedProductDetailClient>,'engineSources'>&{engineSources?:ExpandedEngineSources};
export default function ExpandedProductDetail(props:Props){
 return <ExpandedProductDetailClient {...props} engineSources={props.engineSources||expandedClientSources(props.product,props.catalogRuntime)}/>;
}
