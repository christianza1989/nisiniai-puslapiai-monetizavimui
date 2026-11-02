// Full catalog data stays on the server/explicit legacy callers. The canonical
// calculation is data-free and receives the exact per-product scope on clients.
import data from '../../content/configurator-catalog.json';
import {createCatalogEngine as createScopedCatalogEngine,type CatalogFamily,type CatalogPalettes} from './catalog-engine';
export * from './catalog-engine';
export const catalogFamilies=data.families as unknown as CatalogFamily[];
export const catalogPalettes=data.palettes as CatalogPalettes;
export function createCatalogEngine(scoped?:CatalogFamily){return createScopedCatalogEngine(scoped,catalogFamilies);}
export const {catalogFamily,catalogAnchor,catalogForProduct,catalogChoices,catalogInitial,catalogChange,catalogValidate,catalogAssets,catalogValues,catalogSelection}=createCatalogEngine();
