// Final read-only SEO regression over the compiled inventory; not a publisher.
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const core=fileURLToPath(new URL('../../../dovanos-memorycasting/',import.meta.url));
const packages=JSON.parse(await readFile(new URL('../../../dovanos-memorycasting/lib/generated/content-packages.json',import.meta.url),'utf8'));
const results=[];
for(const pkg of packages){
  const r=spawnSync(process.execPath,['tests/seo-core-smoke.mjs'],{cwd:core,encoding:'utf8',env:{...process.env,SEO_SMOKE_BASE_URL:'http://127.0.0.1:8794',SEO_SMOKE_SITE_ID:pkg.siteId},windowsHide:true});
  results.push({siteId:pkg.siteId,exitCode:r.status,output:r.stdout.trim(),error:r.stderr.trim()});
}
const report={at:new Date().toISOString(),base:'http://127.0.0.1:8794',command:'node tests/seo-core-smoke.mjs with explicit SEO_SMOKE_BASE_URL and each compiled SEO_SMOKE_SITE_ID',results};
await writeFile(new URL('../../../dovanos-memorycasting/output/audits/roletai/all-niche-seo.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));if(results.some(x=>x.exitCode!==0))process.exitCode=1;
