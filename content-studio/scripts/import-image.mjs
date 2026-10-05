import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {initialize,saveResponsiveAsset} from '../src/model.mjs';
const [siteId,file,...flags]=process.argv.slice(2);const options={};
for(let i=0;i<flags.length;i+=2){if(!['--alt','--rights','--prompt-file','--credit'].includes(flags[i])||!flags[i+1])throw Error('Allowed options: --alt --rights --prompt-file --credit');options[flags[i].slice(2)]=flags[i+1];}
if(!siteId||!file||!options.alt||!options.rights)throw Error('Usage: node content-studio/scripts/import-image.mjs <siteId> <imagePath> --alt <text> --rights <text> [--prompt-file <path>]');
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[path.extname(file).toLowerCase()];
if(!mime)throw Error('Only PNG/JPEG/WebP files accepted.');
await initialize();const imported=await saveResponsiveAsset(siteId,{mime,alt:options.alt,rights:options.rights,credit:options.credit??'',prompt:options['prompt-file']?await readFile(options['prompt-file'],'utf8'):''},await readFile(file));
console.log(JSON.stringify({siteId,assetId:imported.id,variants:imported.variants.map(({id,width,height,bytes,sha256})=>({id,width,height,bytes,sha256})),optimization:imported.optimization},null,2));
