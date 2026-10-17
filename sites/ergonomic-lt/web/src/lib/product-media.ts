import imagePaths from '../../content/optimized-product-images.json';
import {preparedImageSource} from './product-image-sources';

const paths:Record<string,string>=imagePaths;
// Keep new supplier/admin images usable until the next preparation run.
export function optimizedProductImage(source:string):string;
export function optimizedProductImage(source:string|null):string|null;
export function optimizedProductImage(source:string|null){return source ? paths[source]||preparedImageSource(source) : null;}
