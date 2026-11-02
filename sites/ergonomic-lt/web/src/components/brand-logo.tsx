import assets from '../../content/brand-logo-assets.json';
export function BrandLogo({sizes='(max-width: 800px) 260px, 300px',alt='Ergonomic.lt – Ergonomic Furniture'}:{sizes?:string;alt?:string}={}){
  return <img className="brand-logo-image" src="/branding/ergonomic-logo.png" srcSet={assets.variants.map(image=>image.asset+' '+image.width+'w').join(', ')} sizes={sizes} style={{aspectRatio:'1700 / 210'}} alt={alt} width={1700} height={210} decoding="async"/>;
}
