// Read-only snapshot for binding human/editorial checks to exact drafts.
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees',core=`${root}/memo-keywords-core-20261109`,pub=`${root}/memo-keywords-public-20261109`;
process.env.STUDIO_DATA_DIR=`${root}/memo-keywords-bulk-studio-20261109/studio-data`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
const {memoIsGiftCollection}=await import(pathToFileURL(`${pub}/lib/memocasting-gift-collections.mjs`));
const site=await model.getSite('memocasting');
const pages=site.pages.filter(memoIsGiftCollection).map(p=>({id:p.id,slug:p.slug,revisionHash:model.revisionHash(p),publishAt:p.publishAt}));
if(pages.length!==20)throw new Error(`Expected 20 collection drafts, got ${pages.length}`);
await writeFile(`${root}/memo-keywords-bulk-studio-20261109/review-snapshot.json`,JSON.stringify({capturedAt:new Date().toISOString(),pages},null,2));
console.log(JSON.stringify({count:pages.length,path:`${root}/memo-keywords-bulk-studio-20261109/review-snapshot.json`,state:'draft snapshot only'}));
