import {standardSitePages} from '@/lib/site-reading-pages';
import {visibleModelsAsync,visibleProductsAsync,catalogAsync,previewMode,indexable} from '@/lib/catalog';
import {productReadingResponse} from '@/lib/product-reading';
import {productReadingRuntimes} from '@/lib/product-reading-runtime';
export const dynamic='force-dynamic';
export async function GET(request:Request){const products=await visibleModelsAsync();return productReadingResponse(request,products,true,{preview:previewMode(),indexable:indexable()},await productReadingRuntimes(products),standardSitePages(await catalogAsync(),await visibleProductsAsync(),products));}
