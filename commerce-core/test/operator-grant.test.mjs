import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, lstat, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { operatorGrantPlan, writeOperatorGrant } from '../scripts/operator-grant.mjs';
import { fixtureStore } from './fixtures.mjs';
import { coreOperatorAuthorize } from '../src/identity.mjs';
import { digest } from '../src/validation.mjs';
import { NodeDatabase } from '../src/node-db.mjs';
import { CommerceService } from '../src/service.mjs';
import { createHandler } from '../src/http.mjs';
const store = () => ({
  ...fixtureStore('store_owner_fixture'),
  hosts: ['owner-admin.example'],
  checkout: {
    successUrl: 'https://owner-admin.example/cart',
    cancelUrl: 'https://owner-admin.example/cart',
  },
  environment: 'production',
  testOnly: false,
  requireCustomer: true,
  productionAdmission: { approved: true },
  operationalAdmission: { approved: false },
  documentPolicy: { approved: false },
});
const options = { confirmStoreId: 'store_owner_fixture', operatorId: 'admitted_owner_fixture' };
async function temporary(t) {
  const dir = await mkdtemp(join(tmpdir(), 'commerce-operator-test-'));
  t.after(async () => {
    assert.ok(dir.startsWith(join(tmpdir(), 'commerce-operator-test-')));
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}
test('preparation rejects unconfirmed store, sandbox, invalid identity, elevated defaults and excessive lifetime before file creation', async (t) => {
  const root = await temporary(t),
    output = join(root, 'not-created');
  assert.deepEqual(operatorGrantPlan(store(), options).permissions, ['read']);
  for (const [config, change] of [
    [store(), { confirmStoreId: 'another_store' }],
    [{ ...store(), environment: 'sandbox', testOnly: true }, {}],
    [store(), { operatorId: 'public@example.test' }],
    [store(), { permissions: ['read', 'all'] }],
    [store(), { permissions: ['read', 'read'] }],
    [store(), { permissions: ['stock'] }],
    [store(), { ttlMinutes: 481 }],
    [store(), { ttlMinutes: 0 }],
    [store(), { ttlMinutes: 1.5 }],
  ])
    await assert.rejects(
      writeOperatorGrant(config, { ...options, ...change }, { directoryRoot: output }),
      (error) => error.code?.startsWith('operator_grant_') && error.status === 403,
    );
  await assert.rejects(lstat(output), { code: 'ENOENT' });
});
test('private files contain a scoped hash-only grant accepted by canonical production identity without enabling checkout', async (t) => {
  const root = await temporary(t),
    config = store();
  const receipt = await writeOperatorGrant(config, options, { directoryRoot: root });
  const token = (await readFile(receipt.tokenFile, 'utf8')).trim(),
    grant = JSON.parse(await readFile(receipt.grantFile, 'utf8'));
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(grant.tokenHash, await digest(token));
  assert.ok(!JSON.stringify(grant).includes(token));
  assert.ok(!JSON.stringify(receipt).includes(token));
  assert.equal(receipt.identityVerifiedByTool, false);
  assert.equal(grant.expiresAt - grant.issuedAt, 8 * 3600000);
  assert.deepEqual(grant.permissions, ['read']);
  if (process.platform !== 'win32')
    assert.equal((await lstat(receipt.tokenFile)).mode & 0o777, 0o600);
  const authorize = coreOperatorAuthorize(async () => [grant]);
  const request = (path, method = 'GET') =>
    new Request('https://owner-admin.example' + path, {
      method,
      headers: { authorization: 'Bearer ' + token },
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
  assert.equal((await authorize(request('/'), config, 'read')).id, options.operatorId);
  assert.equal(await authorize(request('/'), config, 'stock'), false);
  for (const change of [
    { id: 'another_store' },
    { legalEntityId: 'another_entity' },
    { environment: 'sandbox' },
  ])
    assert.equal(await authorize(request('/'), { ...config, ...change }, 'read'), false);
  assert.equal(
    await coreOperatorAuthorize(async () => [{ ...grant, revoked: true }])(
      request('/'),
      config,
      'read',
    ),
    false,
  );
  assert.equal(
    await coreOperatorAuthorize(
      async () => [grant],
      () => grant.expiresAt,
    )(request('/'), config, 'read'),
    false,
  );
  const db = new NodeDatabase();
  db.migrate();
  try {
    const service = new CommerceService(db);
    await service
      .stmt(
        'INSERT INTO stores(id,environment,config_json) VALUES(?,?,?)',
        config.id,
        config.environment,
        JSON.stringify(config),
      )
      .run();
    const handler = createHandler({
      service,
      environment: 'production',
      operatorAuthorize: authorize,
    });
    assert.equal((await handler(request('/api/operator/overview'))).status, 200);
    assert.equal((await handler(request('/api/operator/finished-lots', 'POST'))).status, 403);
    const context = await (await handler(request('/api/storefront-context'))).json();
    assert.equal(context.productionReady, false);
    assert.equal(context.publishOffers, false);
    assert.equal((await service.one('SELECT COUNT(*) n FROM orders')).n, 0);
  } finally {
    db.close();
  }
});
test('explicit permissions and shorter lifetime survive preparation; independent runs never overwrite or expose the first token', async (t) => {
  const root = await temporary(t),
    config = store(),
    input = { ...options, permissions: ['read', 'stock', 'catalog'], ttlMinutes: 15 };
  const first = await writeOperatorGrant(config, input, { directoryRoot: root });
  const originalToken = await readFile(first.tokenFile, 'utf8'),
    originalGrant = await readFile(first.grantFile, 'utf8');
  const second = await writeOperatorGrant(config, input, { directoryRoot: root });
  assert.notEqual(first.directory, second.directory);
  assert.notEqual(await readFile(second.tokenFile, 'utf8'), originalToken);
  assert.equal(await readFile(first.tokenFile, 'utf8'), originalToken);
  assert.equal(await readFile(first.grantFile, 'utf8'), originalGrant);
  const grant = JSON.parse(originalGrant);
  assert.deepEqual(grant.permissions, input.permissions);
  assert.equal(grant.expiresAt - grant.issuedAt, 15 * 60000);
  assert.deepEqual(
    (await readdir(root)).sort(),
    [first.directory.split(/[\\/]/).at(-1), second.directory.split(/[\\/]/).at(-1)].sort(),
  );
});
test('private preparation refuses linked output roots before writing credentials', async (t) => {
  const root = await temporary(t),
    target = join(root, 'real'),
    link = join(root, 'linked');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(target);
  await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(
    writeOperatorGrant(store(), options, { directoryRoot: link }),
    /operator_grant_private_path_invalid/,
  );
  assert.deepEqual(await readdir(target), []);
});
test('CLI default produces only a plan, rejects accidental secret arguments and never echoes malformed store contents', async (t) => {
  const root = await temporary(t),
    file = join(root, 'store.json'),
    script = fileURLToPath(new URL('../scripts/operator-grant.mjs', import.meta.url));
  await writeFile(file, JSON.stringify(store()));
  const base = [
    script,
    '--store-file',
    file,
    '--confirm-store',
    options.confirmStoreId,
    '--operator',
    options.operatorId,
  ];
  const plan = spawnSync(process.execPath, base, { encoding: 'utf8', windowsHide: true });
  assert.equal(plan.status, 0, plan.stderr);
  const parsed = JSON.parse(plan.stdout);
  assert.equal(parsed.state, 'PLAN_ONLY_NO_CREDENTIAL_CREATED');
  assert.deepEqual(parsed.permissions, ['read']);
  assert.equal(parsed.tokenFile, undefined);
  assert.deepEqual(await readdir(root), ['store.json']);
  const rejected = spawnSync(process.execPath, [...base, '--token', 'fixture_sensitive_value'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(rejected.status, 1);
  assert.ok(!rejected.stderr.includes('fixture_sensitive_value'));
  await writeFile(file, '{"secret":"fixture_sensitive_value"invalid');
  const malformed = spawnSync(process.execPath, base, { encoding: 'utf8', windowsHide: true });
  assert.equal(malformed.status, 1);
  assert.ok(!malformed.stderr.includes('fixture_sensitive_value'));
  assert.equal(JSON.parse(malformed.stderr).reason, 'operator_grant_preparation_failed');
});
