import {hasSourceMaterial,renderMaterial} from '@/lib/render-materials';

export function PreviewColourSample({code}:{code?:string}){
 if(!code||!hasSourceMaterial(code))return null;
 const {image}=renderMaterial({code});
 return image?<img className="pc2-colour-sample" src={image} width={24} height={24} alt="" loading="lazy"/>:null;
}
