import assets from '../../content/brand-logo-assets.json';
export function BrandLogo(){
  return <img className="brand-logo-image" src="/branding/ergonomic-logo.png" srcSet={assets.variants.map(image=>image.asset+' '+image.width+'w').join(', ')} sizes="(max-width: 800px) 260px, 300px" style={{aspectRatio:'1700 / 210'}} alt="Ergonomic.lt – Ergonomic Furniture" width={1700} height={210} decoding="async"/>;
}
