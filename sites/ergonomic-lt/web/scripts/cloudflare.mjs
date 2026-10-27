import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync,existsSync,realpathSync} from 'node:fs';
import {join,resolve,relative,isAbsolute} from 'node:path';

const task=process.argv[2];
const sourceRoot=process.cwd(),buildRoot=task==='build'&&process.env.ERGONOMIC_BUILD_ROOT?resolve(process.env.ERGONOMIC_BUILD_ROOT):sourceRoot;
if(task==='build'){
 if(process.env.ERGONOMIC_BUILD_OUTPUT)throw Error('Output-directory overrides do not isolate vinext cleanup. Use an isolated ERGONOMIC_BUILD_ROOT.');
 if(existsSync(join(buildRoot,'dist/server/wrangler.json')))throw Error('Preserve the deployed build: use a fresh isolated ERGONOMIC_BUILD_ROOT.');
 if(buildRoot!==sourceRoot){
  const physical=realpathSync(buildRoot),inside=relative(realpathSync(sourceRoot),physical);
  if(!physical.toLowerCase().startsWith('e:')||(!inside.startsWith('..')&&!isAbsolute(inside))||existsSync(join(buildRoot,'.git')))throw Error('Expected a separate E build scaffold, not a source checkout.');
  const scaffold=JSON.parse(readFileSync(join(buildRoot,'.ergonomic-build-scaffold.json'),'utf8'));
  if(realpathSync(scaffold.sourceRoot)!==realpathSync(sourceRoot))throw Error('Build scaffold source mismatch');
 }
}
if(task==='build'){
 const check=spawnSync(process.execPath,['scripts/check-admin-snapshot.mjs'],{cwd:process.cwd(),stdio:'inherit'});
 if(check.status!==0)process.exit(check.status??1);
}
// vinext and Next both generate .next/types/routes.d.ts. Restore Next's
// generated files after the parallel Cloudflare build, keeping local Next usable.
const generated=['next-env.d.ts','.next/types/routes.d.ts'].map(path=>join(buildRoot,path)).filter(existsSync).map(path=>({path,bytes:readFileSync(path)}));
const options={cwd:process.cwd(),stdio:'inherit',env:{...process.env,
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',
  CLOUDFLARE_BUILD:'true',
  SITE_INDEXABLE:'false',PREVIEW_CATALOG:'true',
}};
const command=task==='types'?['node_modules/wrangler/bin/wrangler.js','types']:
  [join(sourceRoot,'node_modules/vite/bin/vite.js'),task==='dev'?'--host':'build',...(task==='dev'?['127.0.0.1','--port','3004']:buildRoot!==sourceRoot?[buildRoot,'--config',join(sourceRoot,'vite.config.ts')]:[])];
const result=spawnSync(process.execPath,command,options);
if(task!=='types')for(const entry of generated)writeFileSync(entry.path,entry.bytes);
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
if(task==='build')writeFileSync(join(buildRoot,'dist/client/_headers'),`/*
  X-Robots-Tag: noindex, follow
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# Content-addressed responsive photographs can be cached across page visits.
/media/products-v2/*
  Cache-Control: public, max-age=31536000, immutable

# Only the static design examples can be compared in same-origin frames.
/pavyzdziai/*
  ! X-Frame-Options
  Content-Security-Policy: frame-ancestors 'self';

# User-reference design examples, same-origin comparison only.
/pavyzdziai-biurams/*
  ! X-Frame-Options
  Content-Security-Policy: frame-ancestors 'self';

# Selected sand homepage top alternatives, same-origin comparison only.
/virsaus-variantai/*
  ! X-Frame-Options
  Content-Security-Policy: frame-ancestors 'self';

# Animated sand homepage alternatives, same-origin comparison only.
/virsaus-variantai-2/*
  ! X-Frame-Options
  Content-Security-Policy: frame-ancestors 'self';
`);
