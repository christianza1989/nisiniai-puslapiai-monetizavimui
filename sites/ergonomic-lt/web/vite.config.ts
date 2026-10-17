import {defineConfig} from 'vite';
import vinext from 'vinext';
import {cloudflare} from '@cloudflare/vite-plugin';
import {fileURLToPath} from 'node:url';

const file=(name:string)=>fileURLToPath(new URL(name,import.meta.url));
export default defineConfig({
  envDir:file('./.cloudflare-env'),
  environments:{rsc:{build:{rolldownOptions:{output:{banner:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire('/bundle/worker.js');"}}}}},
  plugins:[vinext(),cloudflare({configPath:process.env.LAUNCH_SITE==='true'?'wrangler.launch.json':'wrangler.jsonc',viteEnvironment:{name:'rsc',childEnvironments:['ssr']}})],
  resolve:{alias:[
    {find:/^(?:@\/lib\/publication-db|\.\/publication-db)$/,replacement:file('./src/cloudflare/publication-db.ts')},
    {find:/^(?:@\/lib\/db|\.\/db)$/,replacement:file('./src/cloudflare/db.ts')},
    {find:'./pdf-assets',replacement:file('./src/cloudflare/pdf-assets.ts')},
    {find:'./configurator-runtime-assets',replacement:file('./src/cloudflare/configurator-runtime-assets.ts')},
    {find:/^pdfkit$/,replacement:file('./node_modules/pdfkit/js/pdfkit.standalone.js')},
  ]},
});
