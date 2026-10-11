// Shared exact private intake/native context. Caller owns current auth and accepted revision.
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const boundedText = (value, minimum, maximum) => typeof value === 'string' && value.trim().length >= minimum && value.length <= maximum;

export async function readArtifactBytes(file, limit) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) fail('writer_unsafe_artifact');
  return readFile(file);
}
export async function assertArtifactDirectories(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail('writer_path_outside_artifacts');
  let cursor = root;
  for (const segment of ['', ...relative.split(path.sep).filter(Boolean)]) {
    if (segment) cursor = path.join(cursor, segment);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('writer_unsafe_artifact');
  }
}
export async function loadCustomerContentContext(input, { requirePage = false, intakePageOnly = false } = {}) {
  if (!object(input)
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.creationId)
      || !Number.isSafeInteger(input.acceptedRevision) || input.acceptedRevision < 1 || !hash(input.sourceHash)
      || (requirePage && typeof input.pageId !== 'string')
      || (input.pageId !== undefined && !(intakePageOnly ? /^page-[a-f0-9]{24}$/ : /^[a-z0-9][a-z0-9-]{1,79}$/).test(input.pageId))
      || !boundedText(input.canonicalHost, 1, 253)) fail('writer_invalid_identity');
  for (const key of ['artifactsRoot', 'dataDir', 'outputDir']) {
    if (typeof input[key] !== 'string' || !path.isAbsolute(input[key])) fail('writer_absolute_paths_required');
  }
  const root = path.resolve(input.artifactsRoot);
  if (path.basename(root) !== 'artifacts' || path.basename(path.dirname(root)) !== 'runtime') fail('writer_runtime_artifacts_required');
  const directory = path.join(root, 'customer-content', input.creationId, 'revision-' + input.acceptedRevision);
  const data = path.join(directory, 'data'), output = path.join(directory, 'output');
  if (path.resolve(input.dataDir) !== data || path.resolve(input.outputDir) !== output) fail('writer_revision_directory_mismatch');
  await assertArtifactDirectories(root, path.join(data, 'sites')); await assertArtifactDirectories(root, output);
  if (await realpath(root) !== root) fail('writer_artifacts_alias');
  try { await lstat(path.join(directory, '.intake.lock')); fail('writer_intake_busy'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const manifestBytes = await readArtifactBytes(path.join(directory, 'intake-manifest.json'), 1000000);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const siteId = 'creation-' + input.creationId.replaceAll('-', '');
  if (manifest.version !== 'customer-content-intake.v1' || manifest.state !== 'private-draft-imported'
      || manifest.creationId !== input.creationId || manifest.acceptedRevision !== input.acceptedRevision
      || manifest.sourceHash !== input.sourceHash || manifest.siteId !== siteId || manifest.canonicalHost !== input.canonicalHost
      || manifest.fullF1 !== 'UNVERIFIED' || manifest.launch !== 'UNVERIFIED' || manifest.deployment !== 'not-performed') fail('writer_intake_binding_mismatch');
  const original = await readArtifactBytes(path.join(directory, 'source-draft.json'), 200000);
  const contextBytes = await readArtifactBytes(path.join(directory, 'intake-context.json'), 300000);
  if (sha(original) !== input.sourceHash || sha(contextBytes) !== manifest.requestHash) fail('writer_original_hash_mismatch');
  const intake = JSON.parse(contextBytes.toString('utf8')), proposal = JSON.parse(original.toString('utf8'));
  if (intake.creationId !== input.creationId || intake.acceptedRevision !== input.acceptedRevision
      || intake.sourceHash !== input.sourceHash || intake.siteId !== siteId || intake.canonicalHost !== input.canonicalHost
      || intake.version !== manifest.version || intake.importerHash !== manifest.importerHash
      || intake.dataDir !== data || intake.outputDir !== output) fail('writer_intake_binding_mismatch');
  const mapping = manifest.pageMappings?.find(item => item.pageId === input.pageId);
  if (intakePageOnly && (!mapping || mapping.pageId !== 'page-' + sha(mapping.path).slice(0, 24))) fail('writer_page_not_in_intake');
  await readArtifactBytes(path.join(data, 'sites', siteId + '.json'), 2000000);
  process.env.STUDIO_DATA_DIR = data; process.env.STUDIO_OUTPUT_DIR = output;
  const model = await import('../src/model.mjs');
  if (model.DATA !== data || model.OUTPUT !== output) fail('writer_studio_context_conflict');
  const site = await model.getSite(siteId);
  const page = input.pageId === undefined ? null : site.pages.find(item => item.id === input.pageId && item.siteId === siteId && item.status !== 'revoked');
  if (site.id !== siteId || site.canonicalHost !== input.canonicalHost || site.schemaVersion !== 2 || site.contentWorkflowVersion !== 1
      || (input.pageId !== undefined && (!page || page.contentVersion !== 2
        || (mapping && (page.type === 'home' ? '/' : '/' + page.slug + '/') !== mapping.path)))) fail('writer_page_binding_mismatch');
  return { site, page, model, proposal, intake, manifest, manifestBytes, mapping, root, directory, data, output, siteId };
}
