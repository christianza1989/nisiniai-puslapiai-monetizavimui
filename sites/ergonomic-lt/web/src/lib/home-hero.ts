import assets from '../../content/home-hero-assets.json';

/** Preserve approved markup, crop, dimensions and copy; vary transport only. */
export function responsiveHomeHero(markup:string){
 const fallback=assets.variants.find(image=>image.width===800)||assets.variants[0];
 return markup.replace('src="'+assets.source.asset+'"','src="'+fallback.url+'" srcset="'+assets.variants.map(image=>image.url+' '+image.width+'w').join(', ')+'" sizes="100vw"');
}
