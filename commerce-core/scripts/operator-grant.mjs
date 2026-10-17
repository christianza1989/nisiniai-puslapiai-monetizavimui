// Node-only preparation. Admission and verified identity remain the deployment owner's job.
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, lstat, unlink, rmdir } from 'node:fs/promises';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateStore, requireValue, identifier, integer, digest } from '../src/validation.mjs';
import { OPERATOR_GRANTS } from '../src/identity.mjs';
const privateRoot = fileURLToPath(new URL('../runtime/operator-grants/', import.meta.url));
const usage =
  'node scripts/operator-grant.mjs --store-file <validated-production-store.json> --confirm-store <store-id> --operator <admitted-operator-id> [--permissions read,stock,catalog] [--ttl-minutes 1..480] [--write]';

export function operatorGrantPlan(
  store,
  { confirmStoreId, operatorId, permissions = ['read'], ttlMinutes = 480 } = {},
) {
  validateStore(store);
  requireValue(
    store.environment === 'production' && store.testOnly !== true && confirmStoreId === store.id,
    'operator_grant_store_not_confirmed',
    403,
  );
  requireValue(identifier(operatorId), 'operator_grant_identity_required', 403);
  requireValue(
    Array.isArray(permissions) &&
      permissions.includes('read') &&
      permissions.length <= OPERATOR_GRANTS.length &&
      new Set(permissions).size === permissions.length &&
      permissions.every((p) => OPERATOR_GRANTS.includes(p)),
    'operator_grant_permissions_invalid',
    403,
  );
  requireValue(integer(ttlMinutes, 1, 480), 'operator_grant_lifetime_invalid', 403);
  return {
    state: 'PLAN_ONLY_NO_CREDENTIAL_CREATED',
    operatorId,
    storeId: store.id,
    legalEntityId: store.legalEntityId,
    environment: 'production',
    permissions: [...permissions],
    ttlMinutes,
    identityVerifiedByTool: false,
  };
}
async function rejectLinks(root) {
  for (let cursor = resolve(root); ; cursor = dirname(cursor)) {
    try {
      requireValue(
        !(await lstat(cursor)).isSymbolicLink(),
        'operator_grant_private_path_invalid',
        403,
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (dirname(cursor) === cursor) break;
  }
}
export async function writeOperatorGrant(
  store,
  options,
  { directoryRoot = privateRoot, now = () => Date.now() } = {},
) {
  const plan = operatorGrantPlan(store, options),
    issuedAt = now();
  requireValue(integer(issuedAt, 0, 9999999999999 - 480 * 60000), 'operator_grant_clock_invalid');
  const root = resolve(directoryRoot);
  await rejectLinks(root);
  await mkdir(root, { recursive: true, mode: 0o700 });
  await rejectLinks(root);
  const directory = await mkdtemp(join(root, 'grant-'));
  requireValue(directory.startsWith(root + sep), 'operator_grant_private_path_invalid', 403);
  const tokenFile = join(directory, 'operator-token.txt'),
    grantFile = join(directory, 'grant.json'),
    created = [];
  try {
    const token = randomBytes(32).toString('base64url');
    const grant = {
      id: plan.operatorId,
      storeId: plan.storeId,
      legalEntityId: plan.legalEntityId,
      environment: plan.environment,
      tokenHash: await digest(token),
      issuedAt,
      expiresAt: issuedAt + plan.ttlMinutes * 60000,
      permissions: plan.permissions,
      revoked: false,
    };
    await writeFile(tokenFile, token + '\n', { flag: 'wx', mode: 0o600 });
    created.push(tokenFile);
    await writeFile(grantFile, JSON.stringify(grant, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    created.push(grantFile);
    return {
      ...plan,
      state: 'CREDENTIAL_PREPARED_NOT_DEPLOYED',
      directory,
      tokenFile,
      grantFile,
      issuedAt,
      expiresAt: grant.expiresAt,
      next: 'Merge this grant into the existing COMMERCE_CORE_GRANTS array through the trusted deployment owner. Deliver the token privately; do not paste it into chat or a URL.',
    };
  } catch (error) {
    // Only files successfully created in this new private directory are removed.
    for (const file of created) await unlink(file).catch(() => {});
    await rmdir(directory).catch(() => {});
    throw error;
  }
}
async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log(usage);
    return;
  }
  try {
    const values = {};
    let write = false;
    for (let index = 0; index < args.length; index++) {
      const key = args[index];
      if (key === '--write') {
        requireValue(!write, 'operator_grant_arguments_invalid');
        write = true;
        continue;
      }
      requireValue(
        [
          '--store-file',
          '--confirm-store',
          '--operator',
          '--permissions',
          '--ttl-minutes',
        ].includes(key) &&
          values[key] === undefined &&
          args[index + 1] &&
          !args[index + 1].startsWith('--'),
        'operator_grant_arguments_invalid',
      );
      values[key] = args[++index];
    }
    requireValue(typeof values['--store-file'] === 'string', 'operator_grant_arguments_invalid');
    const source = await readFile(resolve(values['--store-file']));
    requireValue(source.length <= 65536, 'operator_grant_store_too_large');
    const store = JSON.parse(source.toString('utf8'));
    const options = {
      confirmStoreId: values['--confirm-store'],
      operatorId: values['--operator'],
      ...(values['--permissions'] !== undefined
        ? { permissions: values['--permissions'].split(',') }
        : {}),
      ...(values['--ttl-minutes'] !== undefined
        ? { ttlMinutes: Number(values['--ttl-minutes']) }
        : {}),
    };
    const result = write
      ? await writeOperatorGrant(store, options)
      : operatorGrantPlan(store, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const code = error.code || error.message;
    console.error(
      JSON.stringify({
        state: 'BLOCKED',
        reason: /^[a-z][a-z0-9_]{2,100}$/.test(code || '')
          ? code
          : 'operator_grant_preparation_failed',
        usage,
      }),
    );
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main(process.argv.slice(2));
