import manifest from './performance/manifest.json' with {type:'json'};
export const performanceAssetFiles=manifest.records.flatMap(r=>r.variants.map(v=>v.file));
const url=v=>'/assets/performance/'+v.file;
export function performanceSource(file,input){
 let text=input;
 for(const record of manifest.records){
  const variants=record.variants,defaultVariant=variants.find(v=>v.width<=800)||variants.at(-1),srcset=variants.map(v=>url(v)+' '+v.width+'w').join(', ');
  const sizes=record.source.includes('phone-frame')?'(max-width: 600px) 24vw, 220px':record.source.includes('devices-group')?'(max-width: 600px) 30vw, 420px':'(max-width: 600px) 100vw, 1100px';
  text=text.replace(/<(?:img|link)\b[^>]*>/g,tag=>{
   if(!tag.includes('"'+record.source+'"'))return tag;
   const image=tag.startsWith('<img');let result=tag.replace('"'+record.source+'"','"'+url(defaultVariant)+'"');
   result=result.replace(/\s(?:srcset|sizes|imagesrcset|imagesizes)="[^"]*"/g,'');
   return result.replace(/>$/,` ${image?'srcset':'imagesrcset'}="${srcset}" ${image?'sizes':'imagesizes'}="${sizes}">`);
  });
  if(file.endsWith('.js'))text=text.replaceAll(record.source,url(defaultVariant));
  if(file==='assets/app-ui-v1/desktop.js'&&record.source.includes('devices-group'))text=text.replace('${base}devices-group-v1.png',url(defaultVariant));
 }
 if(file.endsWith('.html')){
  text=text.replace('<script src="assets/simulator-v2/stories.js"></script>','<script src="assets/simulator-v2/stories.js" defer></script>');
  text=text.replace(/<img\b[^>]*class="workspace-backdrop"[^>]*>/g,tag=>tag.replace(/\sfetchpriority="[^"]*"/g,'').replace(/>$/,' fetchpriority="high">'));
  text=text.replace('<div class="ea-apps" aria-label=','<div class="ea-apps" role="group" aria-label=');
 }
 if(file==='assets/simulator-v2/creator-ui.js')text=text.replace('<h1>${tab===','<h2>${tab===').replace(':tab}</h1>',':tab}</h2>');
 if(file.endsWith('.css'))text=text.replaceAll('.creator-header h1','.creator-header h2');
 return text;
}
