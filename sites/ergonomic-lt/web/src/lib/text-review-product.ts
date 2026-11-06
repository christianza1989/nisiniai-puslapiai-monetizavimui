import type{Product}from'./types';
import{modelProduct}from'./product-models';
/** An article transition keeps the geometry state but reads the new article's
 * own text bindings. A similar-looking code never selects another product.
 */
export function selectedTextReviewProduct(product:Product,code:string):Product{
 const current=product.configurations.find(c=>c.id===product.modelConfigurationId);
 if(!code||current?.code===code)return product;
 const selected=product.configurations.find(c=>c.code===code);
 return selected?modelProduct(product,selected):product;
}
