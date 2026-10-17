import NextImage,{type ImageProps} from 'next/image';
import {preparedImageSource,imageBackdrop,supplierImageSource} from '@/lib/product-image-sources';

/** Prebuilt responsive assets also work on Workers without a runtime optimizer. */
export function ProductImage(props:ImageProps){
  const {src,alt,fill,sizes,style,priority,preload,loading,width,height,className,...rest}=props;
  const resolved=typeof src==='string' ? preparedImageSource(src) : src;
  const match=typeof resolved==='string' && resolved.match(/^(\/media\/products-v2\/[a-f0-9]+-(\d+)x(\d+)\/)\d+\.webp$/);
  const supplier=typeof resolved==='string'&&supplierImageSource(resolved,800);
  if(!match&&!supplier)return <NextImage {...props}/>;
  const maximum=match?Number(match[2]):1600,imageHeight=match?Number(match[3]):undefined;
  const widths=[...new Set([160,400,800,1600].filter(w=>w<=maximum).concat(maximum))].sort((a,b)=>a-b);
  const eager=priority||preload||loading==='eager';
  // Exclude Next-only options from native HTML attributes.
  const {loader,quality,placeholder,blurDataURL,unoptimized,onLoadingComplete,overrideSrc,...attributes}=rest;
  void loader;void quality;void placeholder;void blurDataURL;void unoptimized;void onLoadingComplete;void overrideSrc;
  return <img {...attributes} src={match?String(resolved):String(supplier)} alt={alt} className={className}
    srcSet={widths.map(w=>`${match?`${match[1]}${w}.webp`:supplierImageSource(String(resolved),w)} ${w}w`).join(', ')} sizes={sizes||'100vw'}
    width={fill?undefined:width||maximum} height={fill?undefined:height||imageHeight}
    loading={eager?'eager':loading||'lazy'} decoding="async" fetchPriority={props.fetchPriority||(eager?'high':undefined)}
    style={{...(fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{}),backgroundColor:imageBackdrop(String(resolved)),...style}}/>;
}
