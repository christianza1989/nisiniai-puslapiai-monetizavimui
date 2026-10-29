/** Read-only package metadata admission. This never claims package/browser PASS,
 * reads Native checkpoints, probes suppliers, stages payloads, or publishes. */
import {readFile,writeFile,mkdir,readdir,statfs,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseArgs} from 'node:util';
import {validateChairComponents} from '../src/lib/chair-components';
import {validateDeskComponents,deskReferencedAssets} from '../src/lib/desk-components';
import {catalogModelVisible} from '../src/lib/catalog-consolidation';
import type {BaseObservedPalette} from '../src/lib/chair-color-admission';

const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const plain=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const digest=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const field=(v:string)=>/^[A-Z][A-Z0-9_]{0,79}$/.test(v);
const scalar=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=100&&!/[\x00-\x1f]/.test(v);
const relative=(v:string)=>!v.includes('\\')&&!path.isAbsolute(v)&&v.split('/').every(p=>p&&p!=='.'&&p!=='..');
async function metadata(file:string){const raw=await readFile(file);assert(raw.length<=15_000_000,'JSON15MB');return {raw,value:JSON.parse(raw.toString('utf8')),sha256:sha(raw)};}
export function originalOnlyPalette(input:any,code:string,runtimeSha256:string):BaseObservedPalette{
 assert(plain(input)&&/^chair-base-observed-colours-(362|366|369|370|411|455|478)-v1$/.test(input.schema)&&input.code===code&&input.actualPaletteComplete===false&&input.independentFinishCompositionAllowed===false&&Array.isArray(input.availableMaterialBindings)&&input.availableMaterialBindings.length===0&&plain(input.baselineObservedFinish),'Unknown original-only palette');
 assert(Object.keys(input.baselineObservedFinish).length<=30);
 for(const [key,v]of Object.entries(input.baselineObservedFinish)as[string,any][]){assert(field(key)&&plain(v)&&scalar(v.value)&&Array.isArray(v.knownCurrentPrefixChoices)&&v.knownCurrentPrefixChoices.length<=1000&&v.knownCurrentPrefixChoices.every(scalar)&&new Set(v.knownCurrentPrefixChoices).size===v.knownCurrentPrefixChoices.length,'Invalid original finish evidence');}
 return {schema:'chair-base-observed-colours-v1',sourceSchema:input.schema,code,runtimeSha256,actualPaletteComplete:false,independentFinishCompositionAllowed:false,availableMaterialBindings:[],baselineObservedFinish:input.baselineObservedFinish};
}
async function main(){
 const {values}=parseArgs({options:{source:{type:'string'},output:{type:'string'},prior:{type:'string'}}});assert(values.source&&values.output&&values.prior);
 const source=path.resolve(values.source),out=path.resolve(values.output);assert((await realpath(out)).toLowerCase().startsWith('e:\\ergonomic\\'));
 const d=await statfs('D:/'),e=await statfs('E:/');assert(d.bavail*d.bsize>=60_000_000_000&&e.bavail*e.bsize>=150_000_000_000,'Owner resource floors');
 const seed=(await metadata('content/seed.json')).value,registry=(await metadata('content/desk-component-candidates.json')).value;
 const oldDesks=new Set([...Object.values(registry.models).map((r:any)=>r.code),'KERG020WW001']);
 const previous=(await metadata(path.join(values.prior,'FIRST5-PACKAGE-QUALIFICATION-RESULT.json'))).value;
 const parts=[];
 for(const file of await readdir(path.join(source,'perziurai-spalvos-288')))if(/^partija-\d+\.json$/.test(file)){const m=await metadata(path.join(source,'perziurai-spalvos-288',file));parts.push(...m.value.models.map((r:any)=>({...r,manifestFile:file,manifestSha256:m.sha256})));}
 const accepted:any[]=[],rejected:any[]=[],known=new Map<string,number>(),modelHashes=new Map<string,number>();
 for(const [kind,directory]of [['chair','paruosti-kedes'],['desk','paruosti-stalai']]){
  const root=path.join(source,directory),codes=(await readdir(root,{withFileTypes:true})).filter(p=>p.isDirectory()&&/^K[A-Z0-9]+$/.test(p.name)).map(p=>p.name);
  for(const code of codes){
   if(kind==='desk'&&oldDesks.has(code))continue;
   try{
    const packageRoot=path.join(root,code),runtime=await metadata(path.join(packageRoot,'runtime.json')),refs:any[]=[];
    const products=seed.products.flatMap((p:any)=>p.configurations.filter((c:any)=>c.code===code&&catalogModelVisible(p.id,c)).map((c:any)=>({productId:p.id,sample:c.id,name:p.name,slug:p.slug})));assert(products.length===1,'Missing unique actual catalog model');
    const row:any={kind,code,root:packageRoot,...products[0],runtimeSha256:runtime.sha256,runtimeBytes:runtime.raw.length,runtime:runtime.value,contexts:runtime.value.contexts?.length,headers:{'runtime.json':runtime.sha256}};
    if(kind==='chair'){
     const manifest=await metadata(path.join(packageRoot,'SHA256SUMS.json')),colors=await metadata(path.join(packageRoot,'colors.json'));assert(manifest.value.code===code&&plain(manifest.value.files)&&colors.value.code===code,'Package code mismatch');
     validateChairComponents(runtime.value,code);assert(manifest.value.files['runtime.json']?.sha256===runtime.sha256&&manifest.value.files['runtime.json']?.bytes===runtime.raw.length&&manifest.value.files['colors.json']?.sha256===colors.sha256,'Manifest metadata mismatch');
     for(const [file,item]of Object.entries(manifest.value.files)as[string,any][]){assert(relative(file)&&digest(item.sha256)&&Number.isSafeInteger(item.bytes)&&item.bytes>0);assert(!file.endsWith('.glb')||item.bytes<=25*1024*1024,'GLB25MiB');assert(!file.endsWith('.json')||item.bytes<=15_000_000,'JSON15MB');refs.push({file,...item});}
     row.manifestSha256=manifest.sha256;row.headers['SHA256SUMS.json']=manifest.sha256;row.headers['colors.json']=colors.sha256;
     if(['chair-colors-full-state-329-v1','chair-colors-observed-partial-344-v1'].includes(colors.value.schema)){
      assert(colors.value.runtimeSha256===runtime.sha256,'Color/runtime binding changed');const selectors=await metadata(path.join(packageRoot,'selectors.json'));assert(selectors.value.schema==='canonical-world-primitive-selectors-329-v1'&&plain(selectors.value.assets)&&manifest.value.files['selectors.json']?.sha256===selectors.sha256,'Unknown own selectors');
      row.palette=colors.value;row.selectors=selectors.value;row.headers['selectors.json']=selectors.sha256;
     }else{row.palette=originalOnlyPalette(colors.value,code,runtime.sha256);row.selectors={schema:'canonical-world-primitive-selectors-329-v1',assets:{}};}
     const prior=previous.models.find((m:any)=>m.code===code);if(prior){assert(prior.manifestSha256===manifest.sha256,'Already qualified first5 source changed');row.previousFirst5Qualified=true;}
    }else{
     const info=await metadata(path.join(packageRoot,'INFO.json')),colors=await metadata(path.join(packageRoot,'colors/colors.json'));assert(info.value.code===code&&info.value.status==='COMPONENT_HYBRID_RUNTIME_PASS'&&info.value.runtimePass===true&&info.value.fullGraphPass===false&&info.value.sourceCollectionComplete===true&&info.value.needsCompression===false,'Source package incomplete or requires compression');
     assert(info.value.runtimeSha256===runtime.sha256&&info.value.runtimeBytes===runtime.raw.length,'Desk runtime binding changed');validateDeskComponents(runtime.value,code);
     const bound=deskReferencedAssets(runtime.value),byFile=new Map(info.value.glbs.map((a:any)=>[a.file,a]));assert(byFile.size===bound.length&&info.value.states===row.contexts);
     for(const a of bound){const actual:any=byFile.get(a.file);assert(actual?.sha256===a.sha256&&actual.bytes===a.bytes&&relative(a.file));refs.push({file:a.file,sha256:a.sha256,bytes:a.bytes});}
     const checked=parts.filter((p:any)=>p.code===code);assert(checked.length===1&&checked[0].colorsSha256===colors.sha256&&checked[0].runtimeSha256===runtime.sha256&&checked[0].runtimeAndGeometryChanged===false,'Updated288 color manifest mismatch');
     assert(colors.value.code===code&&colors.value.status==='COMPLETE','Color package not complete');row.palette=colors.value;row.updated288Manifest=checked[0];row.headers['INFO.json']=info.sha256;row.headers['colors/colors.json']=colors.sha256;row.info=info.value;
    }
    row.files=refs;row.declaredBytes=refs.reduce((n,r)=>n+r.bytes,0);
    for(const r of refs){const old=known.get(r.sha256);assert(old===undefined||old===r.bytes,'SHA/byte disagreement');known.set(r.sha256,r.bytes);if(!modelHashes.has(r.sha256))modelHashes.set(r.sha256,r.bytes);}
    accepted.push(row);
   }catch(error){rejected.push({kind,code,reason:String(error instanceof Error?error.message:error),packagePass:false,public:false});}
  }
 }
 const result={at:new Date().toISOString(),result:'METADATA_CANDIDATES_ONLY_NOT_PACKAGE_OR_BROWSER_PASS',source,sourceCheckout:process.cwd(),sourceFilesReadOnly:true,newPayloadCopies:0,NativeAllowed:false,packagePass:false,browserPass:false,accepted,rejected,declaredBytes:accepted.reduce((n,r)=>n+r.declaredBytes,0),uniqueDeclaredShaBytes:[...modelHashes.values()].reduce((n,b)=>n+b,0)};
 await writeFile(path.join(out,'SOURCE-INVENTORY.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({result:result.result,chairCandidates:accepted.filter(r=>r.kind==='chair').length,deskCandidates:accepted.filter(r=>r.kind==='desk').length,declaredBytes:result.declaredBytes,uniqueDeclaredShaBytes:result.uniqueDeclaredShaBytes,rejected}));
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepare-ready-review-inventory.ts'))main().catch(e=>{console.error(e);process.exitCode=1;});
