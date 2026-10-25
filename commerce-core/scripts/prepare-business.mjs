import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { prepareBusiness, configurationReadiness } from '../src/business-config.mjs';
const args = process.argv.slice(2),
  index = args.indexOf('--out');
const business = JSON.parse(
  readFileSync(new URL('../config/memocasting-business.json', import.meta.url), 'utf8'),
);
const prepared = prepareBusiness(business);
if (index >= 0) {
  const output = resolve(args[index + 1]);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(prepared, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
process.stdout.write(JSON.stringify(configurationReadiness(prepared), null, 2) + '\n');
