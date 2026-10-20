import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA } from '../src/model.mjs';
import { importRevisionBaseline, baselineSha256 } from '../src/revision-history.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1]]] : pairs, []));
if (!args.from || !args.label || !args['captured-at']) throw new Error('Naudokite --from <privati-kopija.json> --label <pavadinimas> --captured-at <ISO data>.');
const bytes = await readFile(path.resolve(args.from));
const site = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const directory = process.env.STUDIO_REVISION_HISTORY_DIR || path.join(DATA, 'revision-history');
console.log(JSON.stringify(await importRevisionBaseline(directory, site, { label: args.label, capturedAt: args['captured-at'], sourceSha256: baselineSha256(bytes) })));
