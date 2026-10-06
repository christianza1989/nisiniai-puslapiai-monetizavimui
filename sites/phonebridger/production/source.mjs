import {readFile} from 'node:fs/promises';
import path from 'node:path';
const kit=path.resolve(import.meta.dirname,'../shop-v2');
export const shopAssetFiles=['shop.css','shop.js','shop-icons.svg','checkout.js','orders.js'];
export async function productionSource(file,input){
 if(file==='account/index.html')return input.replace('</main>','<section class="account-panel pb-account-orders"><h2>Your orders</h2><p data-orders-status role="status">Loading your orders…</p><div data-orders-list></div></section></main>').replace('</head>','<link rel="stylesheet" href="/assets/shop-v2/shop.css"><script src="/assets/shop-v2/orders.js" defer></script></head>');
 if(!['shop/index.html','checkout/index.html'].includes(file))return input;
 const checkout=file==='checkout/index.html';
 const main=await readFile(path.join(kit,checkout?'checkout-main.html':'main.html'),'utf8');
 return input.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,main)
  .replace('data-page="shop"',`data-page="${checkout?'checkout':'shop-v2'}"`)
  .replace('</head>',`<link rel="stylesheet" href="/assets/shop-v2/shop.css"><script src="/assets/shop-v2/${checkout?'checkout':'shop'}.js" defer></script></head>`)
  .replace(/<title>[^<]*<\/title>/,`<title>${checkout?'Your order':'Your setup'} — PhoneBridger</title>`);
}
