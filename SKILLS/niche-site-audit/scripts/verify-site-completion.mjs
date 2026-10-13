import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {catalogFromMarkdown,scoreAudit} from './score-audit.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const arg=(name,args)=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const required=(name,args)=>{const v=arg(name,args);if(!v||v.startsWith('--'))throw Error(`Missing ${name}`);return v;};
const isLoopback=u=>['127.0.0.1','localhost','[::1]'].includes(u.hostname);
const urlFor=(pkg,p)=>new URL('/'+p.slug,'https://'+pkg.canonicalHost).href;
const urlsIn=text=>new Set((text.match(/https?:\/\/[^\s<>\[\]()"']+/g)||[]).map(u=>u.replace(/&amp;/g,'&').split('#')[0]));
const normalizeReading=text=>String(text).replace(/\\([\\[\]])/g,'$1').replace(/\s+/g,' ').trim();
export function verifyDiscoveryOutputs(pkg,pages,outputs){
  const issues=[],eligible=new Set(pages.map(p=>p.id));
  for(const [pathname,text] of Object.entries(outputs)){
    const urls=urlsIn(text);
    for(const p of pkg.pages)if(!eligible.has(p.id)&&urls.has(urlFor(pkg,p)))issues.push('HIDDEN_URL_IN_DISCOVERY:'+pathname+':'+p.id);
    for(const p of pages)if(!urls.has(urlFor(pkg,p)))issues.push('PUBLIC_URL_MISSING_FROM_DISCOVERY:'+pathname+':'+p.id);
  }
  const full=outputs['/llms-full.txt'];
  if(full!==undefined){
    // Check each canonical page's section, so another page cannot satisfy its body/date evidence.
    const sections=full.split(/^## [^\r\n]+\r?\n+(?=URL:)/m).slice(1);
    for(const e of articleExpectations(pkg,pages,'__unused__')){
      const section=sections.find(s=>s.match(/^URL:\s*(\S+)/)?.[1]===e.url);
      if(!section){issues.push('READING_SECTION_MISSING:'+e.id);continue;}
      const normalized=normalizeReading(section);
      if(e.contentVersion===2||['article','guide'].includes(e.type))for(const text of e.bodyTexts)if(text.trim()&&!normalized.includes(normalizeReading(text)))issues.push('READING_BODY_MISSING:'+e.id);
      if(e.contentVersion===2){
        for(const date of [e.datePublished,e.dateModified].filter(Boolean))if(!section.includes(date))issues.push('READING_APPROVED_DATE_MISSING:'+e.id);
        for(const author of e.authors)if(author.url&&!urlsIn(section).has(author.url))issues.push('READING_PROFILE_MISSING:'+e.id);
        const page=pages.find(p=>p.id===e.id);
        for(const link of page.externalLinks||[])if(!urlsIn(section).has(link.url.split('#')[0]))issues.push('READING_SOURCE_MISSING:'+e.id);
        for(const link of page.links||[]){const target=pages.find(p=>p.id===link.targetPageId);if(target&&!urlsIn(section).has(urlFor(pkg,target)))issues.push('READING_RELATED_LINK_MISSING:'+e.id);}
      }
    }
  }
  return [...new Set(issues)];
}
function pythonInspect(observations,python='python'){
  return new Promise((resolve,reject)=>{
    const child=spawn(python,['-X','utf8',path.join(import.meta.dirname,'rendered_site.py')],{stdio:['pipe','pipe','pipe'],windowsHide:true});
    let out='',err='';child.on('error',reject);child.stdout.on('data',s=>out+=s);child.stderr.on('data',s=>err+=s);
    child.on('close',code=>{if(code)return reject(Error(`HTML inspection failed: ${err.slice(0,1500)}`));try{resolve(JSON.parse(out));}catch(e){reject(e);}});
    child.stdin.on('error',reject);child.stdin.end(JSON.stringify(observations));
  });
}
export function articleExpectations(pkg,pages,indexSlug,allowNoindex=false){
  const origin='https://'+pkg.canonicalHost,publicUrls=pages.map(p=>urlFor(pkg,p)),publicIds=new Set(pages.map(p=>p.id));
  const hiddenUrls=pkg.pages.filter(p=>!publicIds.has(p.id)).map(p=>urlFor(pkg,p));
  return pages.map(p=>{
    const authors=(p.editorial?.authors||[]).map(a=>{
      const profiles=pages.filter(p=>p.type==='author'&&p.editorial?.authors?.some(identity=>identity.id===a.id));
      return {name:a.name,kind:a.kind==='organization'?'Organization':'Person',url:profiles.length===1?urlFor(pkg,profiles[0]):''};
    });
    const bodyTexts=p.body.flatMap(b=>b.text?[b.text]:b.content?[b.content.map(n=>n.text).join('')]:b.items?b.items.map(row=>typeof row==='string'?row:row.map(n=>n.text).join('')):[]);
    return {id:p.id,type:p.type,contentVersion:p.contentVersion||1,title:p.title,description:p.description,locale:pkg.locale,origin,url:urlFor(pkg,p),
      isArticleIndex:p.slug===indexSlug,articleIndexUrl:origin+'/'+indexSlug,publicUrls,authors,allowNoindex,
      hiddenUrls,
      datePublished:p.editorial?.datePublished||null,dateModified:p.editorial?.dateModified||null,
      mediaUrls:p.media.map(m=>new URL(m.src,origin).href),bodyTexts};
  });
}
export async function verifySiteCompletion(args){
  const packagePath=path.resolve(required('--package',args)),origin=new URL(required('--origin',args)),indexSlug=required('--article-index',args);
  if(origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error('Origin must have no path, credentials, query or fragment.');
  const core=path.resolve(arg('--core',args)||process.env.PINET_PUBLIC_CORE_PATH||process.env.STUDIO_PUBLIC_CORE_DIR||path.resolve(import.meta.dirname,'../../../..','dovanos-memorycasting'));
  const bytes=await readFile(packagePath),pkg=JSON.parse(bytes),packageSha256=sha(bytes),nowArg=arg('--now',args);
  if(!isLoopback(origin)&&origin.origin!=='https://'+pkg.canonicalHost)throw Error('Hosted origin must be the exact package canonical HTTPS origin.');
  if(nowArg&&!isLoopback(origin))throw Error('A controlled clock is allowed only against an isolated loopback preview, never a live origin.');
  const now=nowArg?Date.parse(nowArg):Date.now();if(!Number.isFinite(now))throw Error('Invalid --now instant.');
  const {validateContentPackage}=await import(pathToFileURL(path.join(core,'scripts/content-package-core.mjs')));
  validateContentPackage(pkg);
  const projectionFile=pkg.schemaVersion===2?'lib/content-projection-v2.mjs':'lib/niche-links.mjs';
  const projection=await import(pathToFileURL(path.join(core,projectionFile)));
  const settings=JSON.parse(await readFile(path.join(core,'config/niche-network.json'),'utf8'));
  // Eligibility is imported from the active core, never reimplemented here.
  const pages=pkg.schemaVersion===2?projection.projectContentPagesV2(pkg,[pkg],settings,{targets:[]},now):projection.projectPublicPages(pkg,[pkg],settings,now);
  const expected=articleExpectations(pkg,pages,indexSlug,isLoopback(origin)),publicIds=new Set(pages.map(p=>p.id)),http=[],issues=[];
  if(!pages.some(p=>p.type==='home'))issues.push('NO_PUBLIC_HOME');
  if(!pages.some(p=>p.slug===indexSlug))issues.push('NO_PUBLIC_ARTICLE_INDEX');
  if(!pages.some(p=>['guide','article'].includes(p.type)))issues.push('NO_PUBLIC_ARTICLE_TO_INSPECT');
  const get=async pathname=>{
    const response=await fetch(new URL(pathname,origin),{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache',...(isLoopback(origin)?{Host:pkg.canonicalHost}:{})}});
    const data=Buffer.from(await response.arrayBuffer());
    if(data.length>8*1024*1024)throw Error('Response exceeds bounded inspector size: '+pathname);
    const receipt={path:pathname,status:response.status,contentType:response.headers.get('content-type')||'',sha256:sha(data)};
    const header=arg('--package-header',args);if(header&&response.headers.get(header)!==packageSha256)issues.push('HOSTED_PACKAGE_HEADER:'+pathname);
    http.push(receipt);return {...receipt,html:data.toString('utf8')};
  };
  const each=async(items,fn)=>{let next=0;await Promise.all(Array.from({length:Math.min(items.length,4)},async()=>{while(next<items.length)await fn(items[next++]);}));};
  const observations=[];
  await each(expected,async e=>observations.push({...await get(new URL(e.url).pathname),expected:e}));
  const rendered=await pythonInspect(observations,arg('--python',args)||'python');
  for(const row of rendered)for(const code of row.errors)issues.push(code+':'+row.url);
  await each(pkg.pages.filter(p=>!publicIds.has(p.id)),async p=>{const r=await get('/'+p.slug);if(r.status!==404)issues.push('HIDDEN_PAGE_NOT_404:'+p.id);});
  const publicAssets=new Set(pages.flatMap(p=>p.media.map(m=>m.src))),allAssets=[...new Set(pkg.pages.flatMap(p=>p.media.map(m=>m.src)))];
  await each(allAssets,async asset=>{const r=await get(asset);if(publicAssets.has(asset)){if(r.status!==200||!r.contentType.startsWith('image/'))issues.push('PUBLIC_IMAGE_UNAVAILABLE:'+asset);}else if(r.status!==404)issues.push('HIDDEN_ASSET_NOT_404:'+asset);});
  const discovery={};
  for(const pathname of ['/sitemap.xml','/llms.txt','/llms-full.txt']){
    const r=await get(pathname);if(r.status!==200)issues.push('DISCOVERY_UNAVAILABLE:'+pathname);
    discovery[pathname]=r.html;
  }
  issues.push(...verifyDiscoveryOutputs(pkg,pages,discovery));
  const robots=await get('/robots.txt');
  if(robots.status!==200)issues.push('ROBOTS_UNAVAILABLE');
  const crawlerPolicy=await pythonInspect({mode:'robots',text:robots.html,urls:expected.map(e=>e.url)},arg('--python',args)||'python');
  if(!isLoopback(origin)){
    for(const [bot,blocked] of Object.entries(crawlerPolicy))if(blocked.length)issues.push('SEARCH_CRAWLER_ROBOTS_BLOCKED:'+bot);
    if(!robots.html.includes('https://'+pkg.canonicalHost+'/sitemap.xml'))issues.push('PUBLIC_ROBOTS_SITEMAP_MISSING');
  }
  for(const pathname of ['/content-package.json','/release-manifest.json','/__niche-check-'+packageSha256.slice(0,16)]){
    if((await get(pathname)).status!==404)issues.push('PRIVATE_OR_UNKNOWN_PATH_NOT_404:'+pathname);
  }
  let auditScore=null;
  if(!args.includes('--render-only')){
    const audit=JSON.parse(await readFile(required('--audit',args),'utf8'));
    if(audit.siteId!==pkg.siteId||audit.canonicalHost!==pkg.canonicalHost||audit.version?.packageSha256!==packageSha256)issues.push('AUDIT_TARGET_OR_PACKAGE_MISMATCH');
    if(!audit.evaluatedAt||!audit.version?.sourceVersion)issues.push('AUDIT_VERSION_OR_DATE_MISSING');
    const catalog=catalogFromMarkdown(await readFile(new URL('../references/checklist.md',import.meta.url),'utf8'));
    auditScore=scoreAudit(audit,catalog);if(!auditScore.stages.local.perfect)issues.push('LOCAL_AUDIT_INCOMPLETE');
  }
  let coreCommit=null;try{coreCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:core,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
  const sourceFiles=['scripts/content-package-core.mjs',projectionFile,...(pkg.schemaVersion===2?['scripts/content-package-v2.mjs','schemas/content-package.v2.schema.json','lib/content-seo-v2.mjs']:['lib/niche-seo.ts','lib/niche-schema-core.mjs'])];
  const report={version:1,checkedAt:new Date().toISOString(),projectionAt:new Date(now).toISOString(),siteId:pkg.siteId,canonicalHost:pkg.canonicalHost,transportOrigin:origin.origin,
    packageSha256,inspector:{scriptSha256:sha(await readFile(import.meta.filename)),htmlParserSha256:sha(await readFile(path.join(import.meta.dirname,'rendered_site.py')))},source:{coreCommit,files:await Promise.all(sourceFiles.map(async file=>({file,sha256:sha(await readFile(path.join(core,file)))})))},
    state:issues.length?'NOT_COMPLETE':args.includes('--render-only')?'RENDERED_CHECKS_PASS_NOT_SITE_ACCEPTANCE':'LOCAL_DELIVERY_CHECKS_PASS',
    publicPages:pages.length,hiddenPages:pkg.pages.length-pages.length,articles:pages.filter(p=>['guide','article'].includes(p.type)).length,rendered,crawlerPolicy,http,auditScore,issues:[...new Set(issues)],
    limitations:['HTML checks do not prove computed browser visibility, image pixels, factual correctness or business capability.','Separate A–Z/browser/performance/form/source evidence and actual launch gates remain required.','Current package pages only; dynamic catalogue, query facets and other business routes retain their own acceptance.','Robots checks use the standard parser for search agents, not a verified crawler visit or proof of WAF/CDN/account access. Training and user-request bots have separate owner-controlled policies.','A controlled-clock local check is not evidence that the future live date has occurred.','GET requests only; no deployment, approval, paid research, DNS, mail or client writes.']};
  if(arg('--output',args))await writeFile(path.resolve(arg('--output',args)),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{const r=await verifySiteCompletion(process.argv.slice(2));console.log(JSON.stringify({state:r.state,siteId:r.siteId,packageSha256:r.packageSha256,publicPages:r.publicPages,hiddenPages:r.hiddenPages,articles:r.articles,requests:r.http.length,issues:r.issues},null,2));if(r.issues.length)process.exitCode=1;}
  catch(e){console.error(e.message);process.exitCode=1;}
}
