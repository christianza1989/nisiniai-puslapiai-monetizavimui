import source from '../../scripts/home-final-demo/demo-assets.json';
import checksums from '../../scripts/home-final-demo/asset-checksums.json';
import {customerKey} from './customer-capability';
import {prepareCustomerAsset,customerSceneName} from './customer-assets-server';
const colors=['VL0034','VL1048','VL5001','VL3067','VL4041'];
const colorId=(code:string)=>customerKey().id('home-color',code);
function sourceImage(asset:string){const known=(checksums as Record<string,{sha256:string;bytes:number}>)[asset];if(!known)throw Error('Unqualified demonstration image');return {asset,assetSha256:known.sha256,bytes:known.bytes};}
export function customerHomeMarkup(markup:string){
 let html=markup;for(const color of colors){const material=source.materials[color as keyof typeof source.materials],ref=sourceImage(material.image),url='/media/p/'+customerKey().seal('asset',ref);
  html=html.replaceAll('data-code="'+color+'"','data-code="'+colorId(color)+'"').replaceAll(material.image,url);
 }return html;
}
let cached:{key:string;data:Promise<unknown>}|undefined;
export async function customerHomeDemo(){
 const key=customerKey().id('home-demo',source);if(cached?.key===key)return cached.data;
 const data=prepare();cached={key,data};try{return await data;}catch(error){if(cached?.key===key)cached=undefined;throw error;}
}
async function prepare(){
 const assemblies:Record<string,unknown>={},materials:Record<string,unknown>={};
 const ref=async(asset:Parameters<typeof prepareCustomerAsset>[0])=>{const prepared=await prepareCustomerAsset(asset);return {asset:prepared.url,assetSha256:prepared.sha256,bytes:prepared.bytes};};
 for(const[key,assembly]of Object.entries(source.assemblies)){const base=await ref(assembly.base),patches=[];for(const patch of assembly.patches)patches.push({remove:patch.remove.map(customerSceneName),geometry:patch.geometry?await ref(patch.geometry):null});assemblies[key]={base,patches};}
 for(const color of colors){const material=source.materials[color as keyof typeof source.materials] as {image:string;normalImage?:string;color:string;approximate:boolean;factor?:number[];roughness?:number;metalness?:number};
  materials[colorId(color)]={color:material.color,approximate:material.approximate,factor:material.factor,roughness:material.roughness,metalness:material.metalness,image:(await ref(sourceImage(material.image))).asset,...(material.normalImage?{normalImage:(await ref(sourceImage(material.normalImage))).asset}:{})};
 }
 return {colors:colors.map(colorId),roles:Object.fromEntries([...['CUPHSEATCOLOR','CUPHBACKRESTCOLOR','CHEADRESTUPHCHCOLOR'].map(field=>[customerSceneName(field),'selected']),...['CSEBASIDEPROFILUPHCOLOR','CHEADSIDEPROFUPHCHCOL'].map(field=>[customerSceneName(field),colorId('VL4041')])]),assets:{assemblies,materials}};
}
