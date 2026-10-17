import source from '../../content/render-materials.json';
import catalogSource from '../../content/render-materials-catalog.json';

export type SourceFinishMaterial={image?:string;normalImage?:string;factor?:number[];roughness?:number;metalness?:number};
export type FinishPreview={image?:string;color?:string;code?:string;group?:string;material?:SourceFinishMaterial};
type MaterialMap=SourceFinishMaterial&{image:string;group?:string|null;approximate?:boolean};
const library={colors:{...source.colors,...catalogSource.colors},groups:source.groups} as {colors:Record<string,MaterialMap>;groups:Record<string,MaterialMap>};
export const hasSourceMaterial=(code:string)=>!!library.colors[code];
export const finishGroup:Record<string,string>={
  CUPHBACKRESTCOLOR:'CBACKRESTUPHGROUP',CUPHSEATCOLOR:'CBACKRESTUPHGROUP',
  CSEBASIDEPROFILUPHCOLOR:'CSEBASIDEPROFILUPHGROUP',CHEADRESTUPHCHCOLOR:'CHEADRESTUPHCHGROUP',
  CHEADSIDEPROFUPHCHCOL:'CHEADSIDEPROFUPHCHGROUP',CUPHCOLOR:'CUPHGROUP',
  CUPHSIDECOLORSEAT:'CUPHGROUP',CMESHCOLOR:'CMESHGROUP',
};
// Palette thumbnails belong to the controls. Never stretch them over a 3D surface.
export function renderMaterial(finish:FinishPreview){
  if(finish.material)return {...finish.material,color:'#ffffff',approximate:false};
  const exact=finish.code?library.colors[finish.code]:undefined;
  if(exact)return {...exact,color:'#ffffff',approximate:false};
  const group=finish.group?library.groups[finish.group]:undefined;
  return {image:group?.image,normalImage:group?.normalImage,color:finish.color||'#ffffff',approximate:true};
}
