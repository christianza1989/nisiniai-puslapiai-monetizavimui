import {writeFile,readFile} from 'node:fs/promises';
import {TAXONOMY_VERSION,TAXONOMY_NODES,LEGACY_TARGETS} from '../prototype/taxonomy.mjs';
import {CITIES} from '../prototype/cities.mjs';
import {createContentTargetRegistry} from '../prototype/content-targets.mjs';
const files={
 'taxonomy.json':{schemaVersion:1,siteId:'madbeauty',version:TAXONOMY_VERSION,nodes:TAXONOMY_NODES,legacyTargets:LEGACY_TARGETS},
 'cities.json':{schemaVersion:1,siteId:'madbeauty',cities:CITIES.map(([id,label])=>({id,label}))},
 'registry.planned.json':{...createContentTargetRegistry({now:Date.parse('2026-10-06T00:00:00Z')}),localRouteTemplate:{canonicalPath:'/paslaugos/{taxonomyNodeId}/{cityId}',routeRegistryId:'mb:catalog:{taxonomyNodeId}:{cityId}',requires:'Actual approved offer matching node/ancestor and city; empty filter404'},notice:'Planning export only. No deployed or ready target. Refresh runtime /content-targets.json before public projection.'},
};
for(const [name,data]of Object.entries(files)){const url=new URL(name,import.meta.url),text=JSON.stringify(data,null,2)+'\n';if(process.argv.includes('--check')){if(await readFile(url,'utf8')!==text)throw Error('Stale export: '+name);}else await writeFile(url,text);}
console.log(JSON.stringify({state:process.argv.includes('--check')?'verified':'exported',nodes:TAXONOMY_NODES.length,procedures:TAXONOMY_NODES.filter(n=>n.kind==='treatment').length,cities:CITIES.length,deployed:false}));
