import {defineConfig} from 'vite';
import vinext from 'vinext';
import {cloudflare} from '@cloudflare/vite-plugin';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const file=(name:string)=>fileURLToPath(new URL(name,import.meta.url));
const releaseOutput=process.env.ERGONOMIC_BUILD_OUTPUT;
export default defineConfig({
  // A reviewed release can reuse its exact immutable assets via hard links.
  // The explicit stager restores them after building; originals stay intact.
  publicDir:process.env.ERGONOMIC_REUSE_RELEASE_ASSETS==='1'?false:undefined,
  build:releaseOutput?{outDir:releaseOutput}:undefined,
  envDir:file('./.cloudflare-env'),
  environments:{rsc:{build:{rolldownOptions:{output:{banner:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire('/bundle/worker.js');"}}}},...(releaseOutput?{client:{build:{outDir:join(releaseOutput,'client')}}}:{})},
  plugins:[vinext(releaseOutput?{rscOutDir:join(releaseOutput,'server'),ssrOutDir:join(releaseOutput,'server/ssr'),clientOutDir:join(releaseOutput,'client')}:{}),cloudflare({configPath:process.env.LAUNCH_SITE==='true'?'wrangler.launch.json':'wrangler.jsonc',viteEnvironment:{name:'rsc',childEnvironments:['ssr']}})],
  resolve:{alias:[
    // Keep the installed dependency immutable; fix its measured large-row CPU
    // defect in this application's reviewed adapter, with byte-parity tests.
    {find:/^.*[\\/]vinext[\\/]dist[\\/]server[\\/]rsc-stream-hints\.js$/,replacement:file('./src/cloudflare/rsc-stream-hints.ts')},
    {find:/^(?:@\/lib\/publication-db|\.\/publication-db)$/,replacement:file('./src/cloudflare/publication-db.ts')},
    {find:/^(?:@\/lib\/db|\.\/db)$/,replacement:file('./src/cloudflare/db.ts')},
    {find:'./pdf-assets',replacement:file('./src/cloudflare/pdf-assets.ts')},
    {find:'./configurator-runtime-assets',replacement:file('./src/cloudflare/configurator-runtime-assets.ts')},
    {find:/^pdfkit$/,replacement:file('./node_modules/pdfkit/js/pdfkit.standalone.js')},
  ]},
});
