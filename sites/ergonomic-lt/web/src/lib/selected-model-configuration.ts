import type {Product} from './types';

// Client-safe selector: no editorial HTML/parser or catalog index dependencies.
export function selectedModelConfiguration(product:Product){return product.configurations.find(configuration=>configuration.id===product.modelConfigurationId);}
