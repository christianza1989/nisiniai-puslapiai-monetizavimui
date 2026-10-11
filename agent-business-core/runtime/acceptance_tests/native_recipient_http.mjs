// Actual native PR68 OTP/SQLite -> authenticated core TCP. Private artifacts only.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [snapshotArg, laneArg, artifactsArg, phase = 'prepare'] = process.argv.slice(2);
const snapshot = resolve(snapshotArg), artifacts = resolve(artifactsArg);
const base = join(snapshot, 'sites/madbeauty');
const load = path => import(pathToFileURL(join(base, path)).href);
const { openStore } = await load('backend/store.mjs');
const { createNativeRecipientCapture } = await load('acquisition-native-20261010/native-recipient-adapter.mjs');
const { signRequest } = await load('acquisition-native-20261010/contracts/server-auth.mjs');
const { createRetention } = await load('backend/retention.mjs');
const { RETENTION_POLICY } = await load('backend/retention-policy.mjs');
const lane = JSON.parse(readFileSync(laneArg, 'utf8'));
assert.equal(lane.fixture_only, true);
assert.equal(lane.scope.environment_class, 'test');
const config = { scope: lane.scope, adapterId: lane.adapter_id, sourceRelease: lane.source_release,
  recipientKeyId: lane.recipient_key_id, recipientSecret: Uint8Array.from(Buffer.from(lane.recipient_secret_hex, 'hex')),
  transportKeyId: lane.transport_key_id, transportSecret: Uint8Array.from(Buffer.from(lane.transport_secret_hex, 'hex')),
  captureOnly: true };
mkdirSync(artifacts, { recursive: true });
const statePath = join(artifacts, 'native-http-state.json');
let state = phase === 'prepare' ? { storeSecret: randomBytes(32).toString('hex') } : JSON.parse(readFileSync(statePath, 'utf8'));
let store, adapter;
async function open() {
  store = openStore({ filename: join(artifacts, 'native-http.sqlite'), secret: state.storeSecret, clock: Date.now });
  adapter = await createNativeRecipientCapture({ store, ...config });
}
function verify(email) {
  const session = adapter.auth.session(null);
  const started = adapter.startInvitation(session, { invitationRef: lane.invitation_ref, email, ip: 'isolated-root-capture' });
  return adapter.verifyInvitation(session, { challengeId: started.challengeId, code: store.capture(started.challengeId).code,
    ip: 'isolated-root-capture' });
}
async function send(packet) {
  assert.equal(packet.method, 'POST');
  assert.ok(packet.path.startsWith('/integrations/acquisition/v1/sites/madbeauty/'));
  const response = await fetch('http://127.0.0.1:8851' + packet.path, {
    method: 'POST', headers: packet.headers, body: packet.body, signal: AbortSignal.timeout(5000), redirect: 'error',
  });
  return { status: response.status, body: await response.text() };
}
async function rawPacket(endpoint, body) {
  const path = '/integrations/acquisition/v1/sites/madbeauty/' + endpoint;
  return { method: 'POST', path, body, headers: await signRequest({ keyId: config.transportKeyId,
    secret: config.transportSecret, path, body, timestamp: Math.floor(Date.now() / 1000) }) };
}
try {
  await open();
  if (phase === 'prepare') {
    const wrong = verify('wrong@example.test');
    const wrongChallengeId = await adapter.prepare(lane.invitation_ref, wrong.user.id);
    const wrongChallenge = await send(await adapter.packet(wrongChallengeId));
    assert.equal(wrongChallenge.status, 200);
    adapter.acceptReceipt(wrongChallengeId, JSON.parse(wrongChallenge.body));
    const wrongProofId = await adapter.prepare(lane.invitation_ref, wrong.user.id);
    assert.equal((await send(await adapter.packet(wrongProofId))).status, 403);
    const actual = verify(' Owner@EXAMPLE.TEST ');
    state.accountRef = actual.user.id;
    const id = await adapter.prepare(lane.invitation_ref, actual.user.id);
    const issued = await send(await adapter.packet(id));
    assert.equal(issued.status, 200);
    adapter.acceptReceipt(id, JSON.parse(issued.body));
    const proofId = await adapter.prepare(lane.invitation_ref, actual.user.id);
    const packet = await adapter.packet(proofId);
    assert.equal(JSON.parse(packet.body).native_account_ref, actual.user.id);
    assert.equal(packet.body.includes('@'), false);
    const response = await send(packet);
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(response.body).external_sent, false);
    // Core committed, native loses ACK, closes its DB and recovers immutable bytes.
    state.proofId = proofId; state.proofBody = packet.body; state.proofReceipt = response.body;
    store.close(); await open();
    const retry = await adapter.packet(proofId);
    assert.equal(retry.body, packet.body);
    const replay = await send(retry);
    assert.deepEqual(replay, response);
    adapter.acceptReceipt(proofId, JSON.parse(replay.body));
    assert.equal(adapter.state(lane.invitation_ref, actual.user.id), 'recipient_bound');
    assert.equal(await adapter.packet(proofId), null);
    writeFileSync(statePath, JSON.stringify(state, null, 2));
  } else if (phase === 'replay') {
    assert.equal(adapter.state(lane.invitation_ref, state.accountRef), 'recipient_bound');
    const replay = await send(await rawPacket('verify-recipient', state.proofBody));
    assert.equal(replay.status, 200); assert.equal(replay.body, state.proofReceipt);
    adapter.acceptReceipt(state.proofId, JSON.parse(replay.body));
    const changed = await send(await rawPacket('verify-recipient', state.proofBody + ' '));
    assert.equal(changed.status, 409);
  } else if (phase === 'retire') {
    const actual = verify('owner@example.test');
    assert.equal(actual.user.id, state.accountRef);
    // Atomic native privacy outbox/cleanup is still owned by native PR68.
    // This probe preserves the prepared proof privately and tests actual core retirement.
    const retirement = { retirement_contract_version: '0.1.0', scope: lane.scope, adapter_id: lane.adapter_id,
      invitation_ref: lane.invitation_ref, request_id: randomUUID(), native_account_ref: actual.user.id,
      occurred_at: new Date().toISOString(), source_release: lane.source_release, reason: 'account_erasure',
      recipient_proof: JSON.parse(state.proofBody) };
    store.retentionPolicyVersion = RETENTION_POLICY.version;
    assert.equal(createRetention(store).begin(actual.user, { confirmEmail: actual.user.email,
      policyVersion: RETENTION_POLICY.version }).state, 'completed');
    assert.equal(store.db.prepare('SELECT id FROM accounts WHERE id=?').get(actual.user.id), undefined);
    const body = JSON.stringify(retirement);
    const response = await send(await rawPacket('retire-recipient', body));
    assert.equal(response.status, 200); assert.equal(JSON.parse(response.body).state, 'recipient_retired');
    assert.deepEqual(await send(await rawPacket('retire-recipient', body)), response);
    // Explicitly record the unmodified native cleanup dependency, never fabricate adoption.
    state.remainingNativePending = store.db.prepare('SELECT count(*) n FROM native_recipient_pending WHERE account_ref=?')
      .get(actual.user.id).n;
    assert.equal(state.remainingNativePending, 1);
    writeFileSync(statePath, JSON.stringify(state, null, 2));
  } else throw Error('unknown_capture_phase');
  assert.ok(store.db.prepare('SELECT recipient,state FROM mail_outbox').all()
    .every(row => row.recipient.endsWith('@example.test') && row.state === 'captured'));
  console.log(JSON.stringify({ phase, actualCoreHTTP: true, external_sent: false,
    proofBodySHA256: createHash('sha256').update(state.proofBody).digest('hex'),
    nativePrivacyOutboxAdopted: false, remainingNativePending: state.remainingNativePending ?? null }));
} finally { store?.close(); }
