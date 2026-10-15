import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {crc32, deflateSync} from 'node:zlib';
import {ROOT, digest, TOOLS} from '../client.mjs';

function fixturePng() {
  const chunk = (type, data) => {
    const name = Buffer.from(type), size = Buffer.alloc(4), checksum = Buffer.alloc(4);
    size.writeUInt32BE(data.length); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([size, name, data, checksum]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(1); header.writeUInt32BE(1, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0,255,0,0,255]))), chunk('IEND', Buffer.alloc(0))]);
}

test('actual stdio proxy → pinned REA: discovery, gates, PNG evidence and static JS', {timeout: 120_000}, async t => {
  const transport = new StdioClientTransport({command: process.execPath,
    args: [path.join(ROOT, 'server.mjs')], cwd: ROOT, stderr: 'pipe'});
  const client = new Client({name: 'pinet-rea-acceptance', version: '1.0.0'}, {capabilities: {}});
  t.after(() => client.close());
  await client.connect(transport);
  const list = await client.listTools();
  assert.deepEqual(list.tools.map(t => t.name).sort(), ['rea_status', ...TOOLS.map(n => 'rea_' + n)].sort());
  assert.equal(list.tools.some(t => /scenario|open_binary|shell/.test(t.name)), false);
  const rejected = await client.callTool({name: 'rea_open_binary', arguments: {}});
  assert.equal(rejected.isError, true);
  const expanded = await client.callTool({name: 'rea_list_browser_targets',
    arguments: {allowed_origins: ['https://not-authorized.invalid']}});
  assert.equal(expanded.isError, true);
  const status = await client.callTool({name: 'rea_status', arguments: {}});
  assert.equal(JSON.parse(status.content[0].text).version, '6.5.0');
  // One authored synthetic pixel keeps acceptance independent of site/customer assets.
  const bytes = fixturePng();
  const artifact = {sha256: digest(bytes), bytes: bytes.length, media_type: 'image/png', data_base64: bytes.toString('base64')};
  const compared = await client.callTool({name: 'rea_compare_web_screenshots', arguments: {before: artifact, after: artifact}},
    undefined, {timeout: 60_000});
  assert.notEqual(compared.isError, true, JSON.stringify(compared.content));
  assert.equal(compared._meta.pinet.actualToolSucceeded, true);
  const receipt = await readFile(compared._meta.pinet.receiptPath);
  assert.equal(digest(receipt), compared._meta.pinet.receiptSha256);
  assert.match(JSON.stringify(compared.content), /identical/);
  const root = path.join(ROOT, '.local/artifacts');
  await mkdir(root, {recursive: true});
  const fixture = await mkdtemp(path.join(root, 'acceptance-'));
  await writeFile(path.join(fixture, 'package.json'), '{"name":"synthetic-reference","type":"module"}');
  await writeFile(path.join(fixture, 'app.js'), 'export const route="/catalog"; export function lookup(){return fetch("/api/catalog");}\n');
  const analysed = await client.callTool({name: 'rea_analyze_javascript_application', arguments: {input_path: fixture}},
    undefined, {timeout: 60_000});
  assert.notEqual(analysed.isError, true, JSON.stringify(analysed.content));
  assert.equal(analysed._meta.pinet.actualToolSucceeded, true);
  assert.match(JSON.stringify(analysed.content), /app\.js/);
});
