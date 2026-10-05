import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {normalizeDomain,archiveClient,auditDomain,reportMarkdown} from './history.mjs';

const project = path.resolve(import.meta.dirname,'..');
const args = process.argv.slice(2);
const domain = normalizeDomain(args.shift() || '');
const options = {maxUrls:300,maxSnapshots:4,terms:[]}; let refresh = false;
let siteId = domain.replace(/\.[a-z0-9-]+$/,'').replaceAll('.','-');
for (let index=0; index<args.length; index++) {
  const flag = args[index];
  if (flag === '--refresh') {refresh=true;continue;}
  const value=args[++index]; if (!value) throw new Error(`Missing ${flag} value.`);
  if (flag === '--site-id') siteId=value;
  else if (flag === '--terms') options.terms=value.split(',').map(term=>term.trim()).filter(Boolean);
  else if (flag === '--max-urls') options.maxUrls=Number(value);
  else if (flag === '--max-snapshots') options.maxSnapshots=Number(value);
  else throw new Error(`Unknown option ${flag}.`);
}
if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(siteId)) throw new Error('Invalid site ID.');
if (!Number.isInteger(options.maxUrls) || options.maxUrls<1 || options.maxUrls>2000 || !Number.isInteger(options.maxSnapshots) || options.maxSnapshots<0 || options.maxSnapshots>8) throw new Error('Limits: 1–2000 URLs, 0–8 snapshots.');
const directory=path.join(project,'sites',siteId,'history'); const file=path.join(directory,'audit.json');
let cached; try {cached=JSON.parse(await readFile(file,'utf8'));} catch { /* First audit. */ }
const ttl=cached?.coverage==='unknown' ? 30*60*1000 : 24*60*60*1000;
if (!refresh && cached?.version===2 && cached.domain===domain && cached.maxUrls===options.maxUrls && cached.maxSnapshots===options.maxSnapshots
  && JSON.stringify(cached.terms)===JSON.stringify(options.terms) && Date.now()-Date.parse(cached.checkedAt)>=0 && Date.now()-Date.parse(cached.checkedAt)<ttl) {
  console.log(`Cached audit: ${domain}, ${cached.coverage}, ${file}`);
} else {
  const cooldownFile=path.join(project,'domain-history','data','cooldown.json');
  let cooldown;try {cooldown=JSON.parse(await readFile(cooldownFile,'utf8'));}catch { /* No earlier limit. */ }
  if (Date.parse(cooldown?.until)>Date.now()) {
    console.log(`Archive.org cooldown until ${cooldown.until}; history is unknown, not absent. Previous audit preserved.`);
    process.exitCode=2;
  } else {
    const client=archiveClient({onRequest:operation=>console.log(`Read-only: ${domain}, ${operation}`)});
    const report=await auditDomain(domain,{...options,client}); Object.assign(report,{siteId,maxUrls:options.maxUrls,maxSnapshots:options.maxSnapshots});
    await mkdir(directory,{recursive:true});
    const staging=`${file}.${process.pid}.tmp`;await writeFile(staging,JSON.stringify(report,null,2)+'\n');await rename(staging,file);
    await writeFile(path.join(directory,'REPORT.md'),reportMarkdown(report));
    if (client.limited) {await mkdir(path.dirname(cooldownFile),{recursive:true});await writeFile(cooldownFile,JSON.stringify({until:new Date(Date.now()+15*60*1000).toISOString(),reason:'archive_http_429'})+'\n');}
    console.log(`Audit saved: ${report.coverage}; ${report.inventory.length} URLs; ${report.snapshots.filter(row=>row.ok&&row.contentReadable).length} snapshots with readable content. ${directory}`);
  }
}
