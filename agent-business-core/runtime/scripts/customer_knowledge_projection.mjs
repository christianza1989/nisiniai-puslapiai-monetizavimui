// Trusted local adapter over the maintained public projection; no second publishing predicate.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {canonical,hash,transport} from './knowledge_transport_v2.mjs';

export async function projectCustomer(input) {
  const keys=['public_core','public_source_revision','sandbox','site_id','canonical_host','package_sha256','base_revision'];
  if(!input || Object.keys(input).some(k=>!keys.includes(k)) || !/^creation-[a-f0-9]{32}$/.test(input.site_id)
      || !/^[a-f0-9]{40}$/.test(input.public_source_revision) || !/^[a-f0-9]{64}$/.test(input.package_sha256)
      || !Number.isSafeInteger(input.base_revision) || input.base_revision<0 || input.base_revision>2147483646
      || !path.isAbsolute(input.public_core) || !path.isAbsolute(input.sandbox))throw Error('invalid_customer_projection_request');
  const core=path.resolve(input.public_core), sandbox=path.resolve(input.sandbox);
  if(!sandbox.startsWith(core+path.sep+'output'+path.sep))throw Error('isolated_output_required');
  const git=args=>execFileSync('git',args,{cwd:core,encoding:'utf8',windowsHide:true}).trim();
  if(git(['rev-parse','HEAD'])!==input.public_source_revision || git(['status','--porcelain']))throw Error('exact_clean_public_source_required');
  // The ignored preview must execute the same maintained helpers as this exact source.
  for(const name of ['lib/content-projection-v2.mjs','scripts/content-package-v2.mjs','scripts/content-package-core.mjs','scripts/content-v2-admission.mjs'])
    if(hash(await readFile(path.join(core,name)))!==hash(await readFile(path.join(sandbox,name))))throw Error('preview_helper_source_mismatch');
  const {validateContentPackage}=await import(pathToFileURL(path.join(core,'scripts/content-package-core.mjs')));
  const {validateV2Admission,assertPreviewSandbox}=await import(pathToFileURL(path.join(core,'scripts/content-v2-admission.mjs')));
  const {projectContentPagesV2,visibleContentTextV2,projectedSnapshotV2}=await import(pathToFileURL(path.join(core,'lib/content-projection-v2.mjs')));
  const directory=path.join(sandbox,'content-packages',input.site_id), raw=await readFile(path.join(directory,'content-package.json'));
  if(raw.length>8000000 || hash(raw)!==input.package_sha256)throw Error('exact_customer_package_required');
  const pkg=validateContentPackage(JSON.parse(raw)), admission=JSON.parse(await readFile(path.join(directory,'activation.json')));
  if(pkg.schemaVersion!==2 || pkg.siteId!==input.site_id || pkg.canonicalHost!==input.canonical_host)throw Error('customer_projection_identity_conflict');
  if(admission.scope!=='local-preview' || admission.testOnly!==true)throw Error('local_preview_admission_required');
  assertPreviewSandbox(sandbox,admission);validateV2Admission(pkg,raw,admission);
  const packages=JSON.parse(await readFile(path.join(sandbox,'lib/generated/content-packages.json')));
  const selected=packages.filter(p=>p.siteId===pkg.siteId);
  if(selected.length!==1 || canonical(selected[0])!==canonical(pkg))throw Error('compiled_package_conflict');
  const networkRaw=await readFile(path.join(sandbox,'config/niche-network.json')),
    network=JSON.parse(networkRaw), commerce=JSON.parse(await readFile(path.join(sandbox,'config/commerce-targets.json')));
  const contact=network.contactsBySite?.[pkg.siteId], email=contact?.email || network.defaultEmail,
    operator=contact && Object.hasOwn(contact,'operatorName')?contact.operatorName:network.operatorName;
  if(pkg.site.contact.email!==email || pkg.site.operatorName!==operator || !operator?.trim())throw Error('customer_contact_conflict');
  const now=Date.now(), pages=projectContentPagesV2(pkg,packages,network,commerce,now);
  if(!pages.some(p=>p.type==='home' && p.slug===''))throw Error('eligible_home_required');
  const projected=pages.map(p=>({id:p.id,title:p.title,url:p.url,text:visibleContentTextV2(p),revision_hash:p.revisionHash,projection_hash:hash(JSON.stringify(projectedSnapshotV2(p)))}));
  const metadata={site_id:pkg.siteId,canonical_host:pkg.canonicalHost,contact_email:email,operator,generated_at:new Date(now).toISOString(),
    deployment_id:hash(JSON.stringify({site_id:pkg.siteId,canonical_host:pkg.canonicalHost,contact_email:email,operator,pages:projected}))};
  return {evidence:{scope:'isolated-local-approved-v2-projection',public_source_revision:input.public_source_revision,
    package_sha256:hash(raw),network_config_sha256:hash(networkRaw),projected_at:metadata.generated_at,
    public_domain_launch_verified:false,provider_calls:0,page_ids:projected.map(p=>p.id)},transport:transport(metadata,projected,input.base_revision)};
}
if(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{const chunks=[];let size=0;for await(const b of process.stdin){size+=b.length;if(size>4096)throw Error('request_limit');chunks.push(b);}
    process.stdout.write(JSON.stringify(await projectCustomer(JSON.parse(Buffer.concat(chunks).toString('utf8'))))+'\n');
  }catch{process.stderr.write('Customer projection failed; verify exact source, package and local admission.\n');process.exitCode=1;}
}
