import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyContentRelease } from '../src/content-release.mjs';
try {
  if (!process.argv[2]) throw new Error('Naudojimas: node content-studio/scripts/verify-content-release.mjs <release-directory>.');
  const publicRoot = process.env.STUDIO_PUBLIC_CORE_DIR || path.resolve(import.meta.dirname, '../../../dovanos-memorycasting');
  const { validateContentPackage } = await import(pathToFileURL(path.join(publicRoot, 'scripts/content-package-core.mjs')));
  process.stdout.write(JSON.stringify(await verifyContentRelease(path.resolve(process.argv[2]), validateContentPackage), null, 2) + '\n');
} catch (error) { process.stderr.write(String(error.message || error) + '\n'); process.exitCode = 1; }
