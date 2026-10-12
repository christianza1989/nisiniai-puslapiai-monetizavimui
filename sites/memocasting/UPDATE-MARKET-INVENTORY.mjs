import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const file=new URL('./MARKET-INVENTORY.json',import.meta.url);
const inventory=JSON.parse(await readFile(file,'utf8'));
const release=JSON.parse(await readFile(new URL('./LATEST-RELEASE.json',import.meta.url),'utf8'));
const bytes=await readFile(release.path),pkg=JSON.parse(bytes);
if(pkg.siteId!=='memocasting'||createHash('sha256').update(bytes).digest('hex')!==release.packageSha256)throw Error('Release identity mismatch');
for(const route of inventory.routes){
 const page=pkg.pages.find(p=>'/'+p.slug===route.path);
 if(!page||page.approval?.status!=='approved'||page.approval.revisionHash!==page.revisionHash)throw Error('Missing exact approved route '+route.path);
 route.state='reviewed-local-release';
 route.contentPageId=page.id;route.revisionHash=page.revisionHash;
 route.sourceBriefIntent??=route.intent;route.intent=page.intent;
 route.dependencies=['Production market prices/currency/delivery and applicable consumer policies','Supplier/product document and final operator facts where still unknown'];
}
inventory.scope='88 approved native LT/PL/LV/ET content pages in isolated local preview; no production publication or foreign-market commerce admission';
inventory.packageSha256=release.packageSha256;
inventory.refreshedAt=new Date().toISOString();
inventory.counts={...inventory.counts,ltApproved:22,nativeApproved:66,privateTranslations:0,totalApproved:88,indexable:84};
inventory.gates.publication='Exact official approved release; actual88-page local HTTP receipt. Production remains closed.';
inventory.previousInventory='The earlier22LT+66private plan is retained in Git history; no historical approval or date rewritten.';
await writeFile(file,JSON.stringify(inventory,null,2));
console.log(JSON.stringify({approved:88,native:66,packageSha256:release.packageSha256,productionActive:false}));
