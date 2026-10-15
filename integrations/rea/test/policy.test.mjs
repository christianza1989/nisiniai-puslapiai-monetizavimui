import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, symlink, rm, readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {origin, endpoint, prepareCall, policy, call, digest} from '../client.mjs';

const scope = {endpoint: 'http://127.0.0.1:9338', allowedOrigins: ['https://example.com']};
test('discovery always receives an explicit origin and the fixed endpoint', async () => {
  assert.deepEqual(await prepareCall('list_browser_targets', {}, scope),
    {cdp_endpoint: scope.endpoint, allowed_origins: scope.allowedOrigins});
});
test('caller cannot replace endpoint or expand origins', async () => {
  for (const args of [{cdp_endpoint: 'http://127.0.0.1:9222'}, {allowed_origins: []},
    {allowed_origins: ['https://other.example']}, {allowed_origins: ['https://example.com.evil.test']}])
    await assert.rejects(prepareCall('inspect_web_page', args, scope), /out_of_scope/);
});
test('browser capture fails closed before upstream when no scope exists', async () => {
  await assert.rejects(prepareCall('list_browser_targets', {}, null), /scope_not_configured/);
});
test('missing observation duration cannot inherit upstream ten-second defaults', async () => {
  assert.equal((await prepareCall('observe_web_session', {}, scope)).observation_ms, 1000);
  assert.equal((await prepareCall('inspect_web_page', {}, scope)).observation_ms, 500);
  assert.equal((await prepareCall('capture_web_screenshot', {}, scope)).observation_ms, undefined);
});
test('origin matching rejects path, wildcard, credentials and normalization ambiguity', () => {
  for (const url of ['https://example.com/', 'https://example.com/x', 'https://*.example.com',
    'https://name:password@example.com', 'file:///tmp/a', 'https://example.com:443']) {
    // A wildcard is not a permitted DNS host even though WHATWG URL accepts it.
    assert.throws(() => origin(url));
  }
});
test('CDP is literal loopback HTTP, never LAN, account URLs or websocket paths', () => {
  assert.equal(endpoint('http://127.0.0.1:9338'), scope.endpoint);
  for (const url of ['http://localhost:9338', 'http://192.168.1.1:9338',
    'http://127.0.0.1', 'http://127.0.0.1:9338/json', 'https://127.0.0.1:9338'])
    assert.throws(() => endpoint(url));
});
test('unsupported active, native and export tools are denied', async () => {
  for (const name of ['capture_browser_scenario', 'open_binary', 'export_web_scripts', '__proto__'])
    await assert.rejects(prepareCall(name, {}, scope), /not_allowed/);
});
test('account contents, extra network fetches and long observation are denied', async () => {
  for (const args of [{include_console_text: true}, {include_storage_keys: true},
    {include_storage_fingerprints: true}, {fetch_source_maps: true}, {observation_ms: 5001},
    {observation_ms: -1}, {observation_ms: 1.5}])
    await assert.rejects(prepareCall('analyze_web_bundle', args, scope));
});
test('static source stays inside real artifact root, including symlinks', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pinet-rea-policy-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const inside = path.join(root, 'allowed'), outside = path.join(root, 'outside');
  await mkdir(inside); await mkdir(outside);
  const configured = {...scope, artifactRoot: inside};
  assert.equal((await prepareCall('analyze_javascript_application', {input_path: inside}, configured)).input_path, inside);
  await assert.rejects(prepareCall('analyze_javascript_application', {input_path: outside}, configured), /out_of_scope/);
  const link = path.join(inside, 'escape');
  await symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(prepareCall('analyze_javascript_application', {input_path: link}, configured), /out_of_scope/);
});
test('malformed private policy is an error, not an implicit default scope', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pinet-rea-config-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const file = path.join(root, 'policy.json');
  assert.equal(await policy(file), null);
  await writeFile(file, '{}'); await assert.rejects(policy(file));
  await writeFile(file, '{'); await assert.rejects(policy(file));
});
test('tool failures retain a content-addressed receipt and are never success', async () => {
  const result = await call({client: {callTool: async () => ({isError: true,
    content: [{type: 'text', text: 'synthetic provider unavailable'}]})}}, 'compare_web_screenshots', {}, null);
  const receipt = await readFile(result._meta.pinet.receiptPath);
  assert.equal(result._meta.pinet.actualToolSucceeded, false);
  assert.equal(digest(receipt), result._meta.pinet.receiptSha256);
  assert.equal(JSON.parse(receipt).result.isError, true);
});
test('a disconnected upstream also leaves a failure receipt', async () => {
  const result = await call({client: {callTool: async () => {throw Error('synthetic connection closed');}}},
    'compare_web_captures', {}, null);
  assert.equal(result.isError, true);
  assert.equal(result._meta.pinet.actualToolSucceeded, false);
  const receipt = await readFile(result._meta.pinet.receiptPath);
  assert.equal(digest(receipt), result._meta.pinet.receiptSha256);
  assert.match(JSON.parse(receipt).result.content[0].text, /connection closed/);
});
