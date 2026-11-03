import type {Plugin} from 'vite';
/** Browser files are admitted from the CURRENT bundle graph only. Previous
 * release scripts retained for rollback are never implicitly public. */
export function customerClientBoundaryPlugin():Plugin{
 return {name:'ergonomic-customer-client-boundary',applyToEnvironment:environment=>environment.name==='client',generateBundle(_options,bundle){
  const chunks=Object.values(bundle).filter(chunk=>chunk.type==='chunk');
  const privateModule=(id:string)=>{
   const path=id.replaceAll('\\','/');
   if(/\/content\/.*\.json(?:\?|$)/.test(path)&&!/(?:\/editorial\/(?:compiled-ui|active-revision)|\/product-environment)\.json/.test(path))return true;
   return /\/src\/lib\/(?:catalog(?:-configurator)?|configurator|expanded-(?:configurator|engine)|render-materials|viewer-upholstery|viewer-materials|chair-(?:preview|qualified-colors|color-materials|material-groups|surface-roles)|configuration-labels)\.[jt]sx?(?:\?|$)/.test(path)||/\/src\/components\/(?:expanded-product-detail-client|pc2-chair-review|quote-form|product-detail-client)\.[jt]sx?(?:\?|$)/.test(path);
  };
  const denied=new Set(chunks.filter(chunk=>Object.keys(chunk.modules).some(privateModule)||/\bK[A-Z0-9]{2,14}WW\d{3}\b|\bC(?:UPH[A-Z]+|ARMRESTS|CASTORS|HEADREST[A-Z]*|PRICEGROUP)\b/.test(chunk.code)).map(chunk=>chunk.fileName));
  let changed=true;while(changed){changed=false;for(const chunk of chunks)if(!denied.has(chunk.fileName)&&chunk.imports.some(name=>denied.has(name))){denied.add(chunk.fileName);changed=true;}}
  const manifest={schema:1,public:chunks.filter(chunk=>!denied.has(chunk.fileName)).map(chunk=>'/'+chunk.fileName).sort(),private:[...denied].map(name=>'/'+name).sort(),modules:chunks.map(chunk=>({path:'/'+chunk.fileName,private:denied.has(chunk.fileName),modules:Object.keys(chunk.modules).map(id=>id.replaceAll('\\','/')),imports:chunk.imports,dynamicImports:chunk.dynamicImports}))};
  this.emitFile({type:'asset',fileName:'.private/customer-client-manifest.json',source:JSON.stringify(manifest,null,2)});
 }};
}
