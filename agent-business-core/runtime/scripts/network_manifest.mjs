// Freeze the public core's actual projection; never implement a second publishing filter.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { transport } from './knowledge_transport_v2.mjs';

const [coreArg, outputArg] = process.argv.slice(2);
if (!coreArg || !outputArg) throw new Error('Usage: node network_manifest.mjs CORE OUTPUT');
const core = resolve(coreArg), output = resolve(outputArg);
const { projectPublicPages } = await import(pathToFileURL(join(core, 'lib/niche-links.mjs')).href);
const raw = await readFile(join(core, 'lib/generated/content-packages.json'), 'utf8');
const networkRaw = await readFile(join(core, 'config/niche-network.json'), 'utf8');
const packages = JSON.parse(raw), network = JSON.parse(networkRaw);
const hash = value => createHash('sha256').update(value).digest('hex');
const generatedAt = new Date().toISOString();
const projectionNow = Date.now();
let projectionV2, commerce;
if (packages.some(pkg => pkg.schemaVersion === 2)) {
  projectionV2 = await import(pathToFileURL(join(core, 'lib/content-projection-v2.mjs')).href);
  commerce = JSON.parse(await readFile(join(core, 'config/commerce-targets.json'), 'utf8'));
}
await mkdir(output, { recursive: true });
const sites = [];
for (const pkg of packages) {
  const pages = pkg.schemaVersion === 2
    ? projectionV2.projectContentPagesV2(pkg, packages, network, commerce, projectionNow)
    : projectPublicPages(pkg, packages, network, Date.now());
  if (!pages.some(p => p.slug === '')) continue;
  const email = network.contactsBySite?.[pkg.siteId]?.email || network.defaultEmail;
  if (pkg.site.contact.email !== email) throw new Error('contact_mismatch:' + pkg.siteId);
  if (pkg.schemaVersion === 2) {
    const siteContact = network.contactsBySite?.[pkg.siteId];
    const operator = siteContact && Object.hasOwn(siteContact, 'operatorName')
      ? siteContact.operatorName : network.operatorName;
    if (typeof operator !== 'string' || !operator.trim() || pkg.site.operatorName !== operator)
      throw new Error('operator_mismatch:' + pkg.siteId);
    const projected = pages.map(page => ({id:page.id,title:page.title,url:page.url,
      text:projectionV2.visibleContentTextV2(page),revision_hash:page.revisionHash,
      projection_hash:hash(JSON.stringify(projectionV2.projectedSnapshotV2(page)))}));
    const metadata = {site_id:pkg.siteId,canonical_host:pkg.canonicalHost,contact_email:email,
      operator,generated_at:generatedAt,
      deployment_id:hash(JSON.stringify({site_id:pkg.siteId,canonical_host:pkg.canonicalHost,
        contact_email:email,operator,pages:projected}))};
    const value = transport(metadata, projected);
    await writeFile(join(output, pkg.siteId + '.v2.json'), JSON.stringify(value, null, 2));
    sites.push({site_id:pkg.siteId,canonical_host:pkg.canonicalHost,pages:projected.length,
      schema_version:2,deployment_id:metadata.deployment_id,manifest_sha256:hash(JSON.stringify(value)),
      runtime_admitted:false});
    continue;
  }
  const projected = pages.map(page => {
    const text = page.body.map(b => b.type === 'paragraph' || b.type === 'heading' ? b.text
      : b.type === 'list' ? b.items.join('\n') : '').join('\n');
    return { id: page.id, title: page.title, url: `https://${pkg.canonicalHost}/${page.slug}`, text,
      revision_hash: page.revisionHash,
      projection_hash: hash(JSON.stringify({ title: page.title, text, externalLinks: page.externalLinks || [] })) };
  });
  const manifest = { site_id: pkg.siteId, canonical_host: pkg.canonicalHost, contact_email: email,
    operator: network.operatorName, deployment_id: hash(JSON.stringify(projected.map(p => p.projection_hash))),
    generated_at: generatedAt, pages: projected };
  await writeFile(join(output, pkg.siteId + '.json'), JSON.stringify(manifest, null, 2));
  sites.push({ site_id: pkg.siteId, canonical_host: pkg.canonicalHost, pages: projected.length,
    deployment_id: manifest.deployment_id, manifest_sha256: hash(JSON.stringify(manifest)) });
}
await writeFile(join(output, 'registry.json'), JSON.stringify({ generated_at: generatedAt, sites,
  packages_sha256: hash(raw), network_config_sha256: hash(networkRaw),
  source: 'existing_public_core_projectPublicPages', public_domain_launch_verified: false }, null, 2));
process.stdout.write(JSON.stringify({ sites, source: 'approved_local_projection' }) + '\n');
