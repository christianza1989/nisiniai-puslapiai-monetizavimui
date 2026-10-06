import {writeFile} from 'node:fs/promises';
import {taxonomy} from '../upgrade-plan-20261006/data.mjs';
const tree=taxonomy.categories.map(c=>({id:c.id,label:c.label,scope:c.scope,reviewRequired:c.reviewRequired,groups:c.groups.map(g=>({id:g.id,label:g.label,treatments:g.treatments.map(({id,label,aliases,reviewRequired})=>({id,label,aliases,reviewRequired}))}))}));
await writeFile(new URL('../prototype/taxonomy-data.mjs',import.meta.url),'// Original Madbeauty procedure registry. Versioned source; no provider prices or durations.\nexport const CATEGORY_TREE='+JSON.stringify(tree,null,2)+';\n');
