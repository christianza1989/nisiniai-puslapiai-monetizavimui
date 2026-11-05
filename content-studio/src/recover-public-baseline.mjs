import { createHash } from 'node:crypto';

// Reconstruct only the published V1 snapshot as an isolated editing baseline.
// Public packages do not contain private facts, editorial reviews, drafts, or
// original media. This does not restore those records or grant a new approval.
export function recoverPublicBaseline(bytes, input, validate, revisionHash) {
  if (!Buffer.isBuffer(bytes) || !/^[a-f0-9]{64}$/.test(input?.expectedPackageSha256 ?? '')) throw new Error('An exact pinned package is required.');
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== input.expectedPackageSha256) throw new Error('Pinned package bytes changed.');
  const e = input.baselineEvidence;
  if (!e || typeof e.sourceVersion !== 'string' || !e.sourceVersion.trim() || typeof e.deploymentId !== 'string' || !e.deploymentId.trim() || !Number.isFinite(Date.parse(e.observedAt))) throw new Error('Observed baseline evidence is required.');
  const pkg = JSON.parse(bytes.toString('utf8'));
  validate(pkg);
  if (pkg.schemaVersion !== 1 || pkg.siteId !== input.siteId || pkg.canonicalHost !== input.canonicalHost || pkg.site?.id !== input.siteId || pkg.site?.canonicalHost !== input.canonicalHost) throw new Error('Only the intended V1 site can be recovered.');
  const ids = input.pageIds;
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.length > 200) throw new Error('Selected page IDs are required.');
  const expected = input.expectedRevisionHashes;
  if (!expected || Object.keys(expected).length !== ids.length) throw new Error('Expected selected revisions are required.');
  for (const id of ids) {
    const p = pkg.pages.find(page => page.id === id);
    if (!p || expected[id] !== p.revisionHash || revisionHash(p) !== p.revisionHash) throw new Error('Selected baseline revision mismatch.');
    // Media editing needs original/private provenance and bytes, not a public snapshot.
    if (p.media.length || p.body.some(b => b.type === 'image')) throw new Error('Recovery currently supports selected pages without media only.');
  }
  const site = { ...structuredClone(pkg.site), facts: '', audience: '', stage: 'planning', contentWorkflowVersion: 1, assets: [],
    recoveredBaseline: { packageSha256: sha, sourceVersion: e.sourceVersion, deploymentId: e.deploymentId, observedAt: e.observedAt,
      note: 'Public snapshots only; private drafts, reviews, facts and original media were not recovered.' },
    pages: pkg.pages.map(p => ({ ...structuredClone(p), externalLinks: (p.externalLinks || []).map(link => ({ ...link, verified: false })),
      status: 'review', factChecks: [], linkSuggestions: [], networkLinkSuggestions: [], editorialReview: null,
      publishedRevision: structuredClone(p) })) };
  return site;
}
