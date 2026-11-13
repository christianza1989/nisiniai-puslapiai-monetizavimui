import {previewColourSample} from '@/lib/preview-option-presentation';
import {hasSourceMaterial,renderMaterial} from '@/lib/render-materials';

export function PreviewColourSample({code}:{code?:string}){
 if(!code)return null;
 const {image,color}=hasSourceMaterial(code)?renderMaterial({code}):previewColourSample(code)??{};
 if(image)return <img className="pc2-colour-sample" src={image} width={24} height={24} alt="" loading="lazy"/>;
 return color?<span className="pc2-colour-sample" style={{backgroundColor:color}} aria-hidden="true"/>:null;
}
