import type {MetadataRoute} from 'next';
export const dynamic='force-dynamic';
import {legacyPages,catalogAsync as catalog,visibleProductsAsync as visibleProducts,visibleModelsAsync,productPath,indexable} from '@/lib/catalog';
import {standardSitePages} from '@/lib/site-reading-pages';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{if(!indexable())return [];const seed=await catalog(),products=await visibleProducts(),models=await visibleModelsAsync();const routes=[...standardSitePages(seed,products,models).map(p=>p.id),...models.map(productPath)];return [...new Set(routes)].map(route=>({url:'https://ergonomic.lt'+route}));}
