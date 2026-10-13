import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {applyIncludedPaint} from './INCLUDED-PAINT.mjs';import {pages} from './CONTENT.mjs';import {localizedPages} from './LOCALIZED-CONTENT.mjs';
const pkg=JSON.parse(await readFile(new URL('../../../dovanos-memorycasting/content-packages/memocasting/content-package.json',import.meta.url)));
let kits=0;
for(const page of pkg.pages){assert.deepEqual(applyIncludedPaint(page),page,'Published inclusion is idempotent '+page.slug);assert.ok(!/35\s*€|3\s*€/.test(JSON.stringify({description:page.description,body:page.body})),'Old paint price '+page.slug);}
for(const page of [...pages,...localizedPages]){if(!/^(?:pl\/|lv\/|et\/)?(?:rinkinys-porai|seimos-rinkinys|products\/liejimo-rinkinys-porai|products\/seimos-rinkinys-1)$/.test(page.slug))continue;const language=/^(pl|lv|et)\//.exec(page.slug)?.[1]??'lt',paint=({lt:'Balti dažai.',pl:'Biała farba.',lv:'Balta krāsa.',et:'Valge värv.'})[language];assert.equal(page.body.find(b=>b.type==='list').items.filter(t=>t===paint).length,1,'Source contents '+page.slug);assert.ok(!/35\s*€|3\s*€/.test(JSON.stringify(page)),'Source old surcharge '+page.slug);kits++;}
assert.equal(kits,8);console.log(JSON.stringify({status:'INCLUDED_PAINT_SOURCE_AND_APPROVED_PACKAGE_PASS',pages:pkg.pages.length,sourceKits:kits}));
