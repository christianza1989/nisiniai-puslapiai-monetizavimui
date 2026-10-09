import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {signRequest, verifySignature} from './server-auth.mjs';

const vector = JSON.parse(await fs.readFile(new URL('./signature-vector.json', import.meta.url), 'utf8'));
const request = {keyId: vector.key_id, secret: vector.key_utf8, method: vector.method,
  path: vector.path, body: vector.body_utf8, headers: vector.headers, now: vector.timestamp};

test('Python and Node/Web Crypto sign the same raw UTF-8 bytes', async () => {
  assert.deepEqual(await signRequest({...request, timestamp: vector.timestamp}), vector.headers);
  assert.equal(await verifySignature(request), true);
});
test('Body, target, key and clock tampering fail', async () => {
  for (const patch of [{body: request.body + ' '}, {path: request.path + '/other'},
    {keyId: 'other-key'}, {now: request.now + 301}, {method: 'GET'},
    {headers: {...request.headers, 'X-Acq-Signature': 'v1=' + '0'.repeat(64)}}])
    await assert.rejects(verifySignature({...request, ...patch}));
});
test('Non-ASCII body has matching byte treatment', async () => {
  const body = '{"synthetic":"Grožio paslaugos"}';
  const headers = await signRequest({...request, body, timestamp: vector.timestamp});
  assert.equal(await verifySignature({...request, body, headers}), true);
  await assert.rejects(verifySignature({...request, body: body.normalize('NFD'), headers}));
});
