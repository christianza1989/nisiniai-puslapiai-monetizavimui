import path from 'node:path';
import { exportExternalContent } from '../src/external-content-export.mjs';

const [releaseDirectory, destination, expectedSiteId, expectedCanonicalHost] = process.argv.slice(2);
try {
  if (!releaseDirectory || !destination || !expectedSiteId || !expectedCanonicalHost) {
    throw new Error('Usage: node content-studio/scripts/export-external-content.mjs <release-directory> <NEW-output-directory> <expected-siteId> <expected-canonicalHost>');
  }
  const receipt = await exportExternalContent({ releaseDirectory, destination, expectedSiteId,
    expectedCanonicalHost, publicCoreDirectory: process.env.STUDIO_PUBLIC_CORE_DIR || path.resolve(import.meta.dirname, '../../../dovanos-memorycasting') });
  console.log(JSON.stringify({ siteId: receipt.siteId, bundleId: receipt.bundleId, pages: receipt.pages.length,
    assets: receipt.assets.length, state: receipt.state }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
