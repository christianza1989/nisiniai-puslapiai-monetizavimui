// Actual immutable native source -> loopback capture API -> PostgreSQL.
// Fixture credentials/raw recovery bytes are read/written only in ignored paths.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [snapshotArg, laneArg, artifactsArg, scenario, phase = 'prepare'] = process.argv.slice(2);
assert.ok(['privacy', 'lifecycle', 'expired', 'stopped'].includes(scenario));
assert.ok(['prepare', 'replay'].includes(phase));
const source = '2e4d1ea874326f6862e2f45d98a48fdf3463a267';
const snapshot = resolve(snapshotArg), artifacts = resolve(artifactsArg);
const base = join(snapshot, 'sites/madbeauty');
const load = file => import(pathToFileURL(join(base, file)).href);
const { openStore } = await load('backend/store.mjs');
const { createRetention } = await load('backend/retention.mjs');
const { RETENTION_POLICY } = await load('backend/retention-policy.mjs');
const { createNativeRecipientCapture } = await load('acquisition-native-20261010/native-recipient-adapter.mjs');
const { signRequest } = await load('acquisition-native-20261010/contracts/server-auth.mjs');
const lane = JSON.parse(readFileSync(laneArg, 'utf8'));
assert.equal(lane.fixture_only, true);
assert.equal(lane.scope.environment_class, 'test');
assert.equal(lane.source_release, source);
const config = { scope: lane.scope, adapterId: lane.adapter_id, sourceRelease: source,
  recipientKeyId: lane.recipient_key_id, recipientSecret: Uint8Array.from(Buffer.from(lane.recipient_secret_hex, 'hex')),
  transportKeyId: lane.transport_key_id, transportSecret: Uint8Array.from(Buffer.from(lane.transport_secret_hex, 'hex')),
  transportPermissions: ['recipient-challenge', 'verify-recipient', 'retire-recipient', 'resolve', 'events'],
  captureOnly: true };
mkdirSync(artifacts, { recursive: true });
const statePath = join(artifacts, 'recovery-state.json');
if (phase === 'prepare') assert.equal(existsSync(statePath), false, 'Never overwrite a consumed lane');
const state = phase === 'prepare' ? { storeSecret: randomBytes(32).toString('hex'), source, scenario } :
  JSON.parse(readFileSync(statePath, 'utf8'));
assert.equal(state.source, source); assert.equal(state.scenario, scenario);
let store, adapter;
async function open() {
  store = openStore({ filename: join(artifacts, 'native.sqlite'), secret: state.storeSecret, clock: Date.now });
  store.retentionPolicyVersion = RETENTION_POLICY.version;
  adapter = await createNativeRecipientCapture({ store, ...config });
}
function login(email, invitation = true) {
  const session = adapter.auth.session(null);
  const start = invitation ? adapter.startInvitation(session, { invitationRef: lane.invitation_ref, email, ip: 'root-capture' }) :
    adapter.auth.start(session, email, 'root-capture');
  const code = store.capture(start.challengeId).code;
  return invitation ? adapter.verifyInvitation(session, { challengeId: start.challengeId, code, ip: 'root-capture' }).user :
    adapter.auth.verify(session, start.challengeId, code, 'root-capture').user;
}
async function exchange(packet) {
  assert.equal(packet.method, 'POST');
  assert.ok(packet.path.startsWith('/integrations/acquisition/v1/sites/madbeauty/'));
  return fetch('http://127.0.0.1:8851' + packet.path, { method: 'POST', headers: packet.headers,
    body: packet.body, signal: packet.signal || AbortSignal.timeout(5000), redirect: 'error' });
}
async function result(packet) {
  const response = await exchange(packet);
  return { status: response.status, body: await response.text() };
}
async function raw(endpoint, body) {
  const path = '/integrations/acquisition/v1/sites/madbeauty/' + endpoint;
  return { method: 'POST', path, body, headers: await signRequest({ keyId: config.transportKeyId,
    secret: config.transportSecret, path, body, timestamp: Math.floor(Date.now() / 1000) }) };
}
async function prepareProof(user) {
  const challengeId = await adapter.prepare(lane.invitation_ref, user.id);
  const issued = await result(await adapter.packet(challengeId));
  assert.equal(issued.status, 200);
  adapter.acceptReceipt(challengeId, JSON.parse(issued.body));
  const proofId = await adapter.prepare(lane.invitation_ref, user.id), packet = await adapter.packet(proofId);
  assert.equal(packet.body.includes('@'), false);
  return { proofId, packet };
}
function save() { writeFileSync(statePath, JSON.stringify(state, null, 2)); }
try {
  await open();
  if (phase === 'prepare' && ['expired', 'stopped'].includes(scenario)) {
    const user = login('owner@example.test');
    const id = await adapter.prepare(lane.invitation_ref, user.id);
    const challenge = await result(await adapter.packet(id));
    assert.equal(challenge.status, 200); assert.equal(JSON.parse(challenge.body).state, scenario);
    assert.equal(JSON.parse(challenge.body).challenge, null);
    adapter.acceptReceipt(id, JSON.parse(challenge.body));
    const resolution = await result(await adapter.lifecycle.resolvePacket(lane.invitation_ref));
    assert.equal(resolution.status, 200); assert.equal(JSON.parse(resolution.body).state, scenario);
    adapter.lifecycle.acceptResolution(lane.invitation_ref, JSON.parse(resolution.body));
    const org = adapter.lifecycle.createOrganization(user,
      { name: 'Ordinary native signup fixture', bio: 'No acquisition revival', kind: 'salon', city: 'vilnius' }, lane.invitation_ref);
    assert.match(org.id, /^provider_/); assert.equal(adapter.lifecycle.current(org.id), null);
    assert.deepEqual(adapter.lifecycle.status(), []);
    assert.throws(() => adapter.lifecycle.acceptResolution(lane.invitation_ref,
      { ...JSON.parse(resolution.body), expires_at: new Date(Date.now() + 7200000).toISOString(), state: 'available' }),
      /original_invitation_expiry_changed/);
    state.provider = org.id;
    state.challengeBody = store.db.prepare('SELECT body FROM native_recipient_requests WHERE request_id=?').get(id).body;
    state.challengeReceipt = challenge.body; save();
  } else if (phase === 'prepare' && scenario === 'privacy') {
    const user = login('owner@example.test'), proof = await prepareProof(user);
    const bound = await result(proof.packet);
    assert.equal(bound.status, 200); assert.equal(JSON.parse(bound.body).state, 'recipient_bound');
    state.proofBody = proof.packet.body; state.proofReceipt = bound.body;
    // Core committed; native intentionally does not accept the proof ACK.
    const erased = createRetention(store).begin(user, { confirmEmail: user.email, policyVersion: RETENTION_POLICY.version });
    assert.equal(erased.state, 'completed');
    assert.equal(store.db.prepare('SELECT id FROM accounts WHERE id=?').get(user.id), undefined);
    for (const table of ['native_recipient_pending', 'native_recipient_requests', 'native_recipient_challenges'])
      assert.equal(store.db.prepare('SELECT COUNT(*) n FROM ' + table).get().n, 0);
    const [queued] = adapter.retirementStatus(); assert.ok(queued);
    const packet = await adapter.retirementPacket(queued.request_id);
    assert.equal(packet.body.includes('@'), false);
    const retired = await result(packet);
    assert.equal(retired.status, 200); assert.equal(JSON.parse(retired.body).state, 'recipient_retired');
    state.retirementId = queued.request_id; state.retirementBody = packet.body; state.retirementReceipt = retired.body;
    // Native loses this ACK too; reopening must recover the same encrypted bytes.
    store.close(); await open();
    assert.equal((await adapter.retirementPacket(queued.request_id)).body, packet.body);
    const ack = await adapter.dispatchRetirement(queued.request_id, async retry => {
      assert.equal(retry.body, packet.body);
      const response = await exchange(retry);
      assert.equal(await response.clone().text(), retired.body);
      return response;
    });
    assert.equal(ack.state, 'recipient_retired'); assert.equal(ack.external_sent, false);
    assert.equal(adapter.retirementStatus()[0].state, 'accepted');
    assert.equal(store.db.prepare('SELECT payload FROM native_recipient_privacy').get().payload, null);
    assert.equal(await adapter.retirementPacket(queued.request_id), null);
    save();
  } else if (phase === 'prepare' && scenario === 'lifecycle') {
    const user = login('owner@example.test'), proof = await prepareProof(user);
    const bound = await result(proof.packet); assert.equal(bound.status, 200);
    adapter.acceptReceipt(proof.proofId, JSON.parse(bound.body));
    const resolution = await result(await adapter.lifecycle.resolvePacket(lane.invitation_ref));
    assert.equal(resolution.status, 200);
    adapter.lifecycle.acceptResolution(lane.invitation_ref, JSON.parse(resolution.body));
    const l = adapter.lifecycle, org = l.createOrganization(user,
      { name: 'Root immutable native fixture', bio: 'Actual native mutation fixture', kind: 'salon', city: 'zarasai' }, lane.invitation_ref);
    assert.equal(org.city, 'Zarasai'); state.provider = org.id;
    const scope = { role: 'professional', organizationId: org.id }, workspace = l.workspace(user, scope);
    const operator = login('operator@example.test', false);
    store.db.prepare('UPDATE accounts SET operator=1 WHERE id=?').run(operator.id);
    const [selected] = l.execute('selectProcedures', user, { organizationId: org.id,
      procedureIds: ['kirpimai-vyru-kirpimas'], version: 0, idempotencyKey: 'root-selection' });
    const saved = l.execute('saveOffer', user, { id: selected.id, version: selected.version, label: 'Native test service',
      variants: [{ id: 'root-variant', label: 'Test variant', priceMinor: 2200, durationMin: 30,
        staffOptions: [{ practitionerId: workspace.practitioners[0].id, resourceId: workspace.resources[0].id }] }] });
    const submitted = l.execute('submitOffer', user, { id: saved.id, version: saved.version });
    l.execute('moderateOffer', operator, { id: submitted.id, version: submitted.version, state: 'approved' });
    const revision = l.execute('submitRevision', user, { scope, name: org.name, bio: org.bio });
    assert.throws(() => l.execute('moderate', { ...user, operator: true }, { id: revision.id, state: 'approved' }),
      error => error.code === 'FORBIDDEN');
    l.execute('moderate', operator, { id: revision.id, state: 'approved' });
    assert.equal(l.current(org.id).profile_active, true);
    l.execute('submitRevision', user, { scope, name: 'Unapproved pending fixture', bio: org.bio });
    assert.equal(l.current(org.id).profile_active, true);
    const offer = l.workspace(user, scope).offers[0];
    l.execute('archiveOffer', user, { id: offer.id, version: offer.version });
    assert.equal(l.current(org.id).profile_active, false);
    const rows = l.status(); assert.deepEqual(rows.map(row => row.source_revision), [1, 2, 3, 4, 5, 6]);
    assert.throws(() => adapter.eraseAccount(user, { confirmEmail: user.email, policyVersion: RETENTION_POLICY.version }),
      error => error.code === 'PROFESSIONAL_ACCOUNT');
    const first = await l.packet(rows[0].event_id);
    const lost = await l.dispatch(rows[0].event_id, async packet => {
      const response = await exchange(packet);
      assert.equal(response.status, 200); state.firstReceipt = await response.text();
      throw Error('deliberately_lost_ack');
    });
    assert.equal(lost, null); state.firstBody = first.body;
    store.close(); await open();
    assert.equal((await adapter.lifecycle.packet(rows[0].event_id)).body, first.body);
    await new Promise(done => setTimeout(done, 2100)); // Genuine bounded retry backoff.
    const active = []; state.events = [];
    for (const row of rows) {
      const packet = await adapter.lifecycle.packet(row.event_id);
      const ack = await adapter.lifecycle.dispatch(row.event_id, async retry => {
        assert.equal(retry.body, packet.body);
        const response = await exchange(retry), body = await response.clone().text();
        assert.equal(response.status, 200);
        if (row.source_revision === 1) assert.equal(body, state.firstReceipt);
        state.events.push({ body: retry.body, receipt: body });
        return response;
      });
      assert.ok(ack); assert.equal(ack.external_sent, false); active.push(ack.profile_active);
    }
    assert.deepEqual(active, [false, false, false, true, true, false]);
    assert.ok(adapter.lifecycle.status().every(row => row.state === 'accepted'));
    assert.equal(adapter.lifecycle.current(org.id).profile_active, false);
    const foreign = JSON.parse(state.firstBody); foreign.scope.environment_id += '-foreign';
    assert.equal((await result(await raw('events', JSON.stringify(foreign)))).status, 401);
    assert.equal((await result(await raw('events', state.firstBody + ' '))).status, 409);
    save();
  } else if (['expired', 'stopped'].includes(scenario)) {
    const replay = await result(await raw('recipient-challenge', state.challengeBody));
    assert.equal(replay.status, 200); assert.equal(replay.body, state.challengeReceipt);
    assert.equal(adapter.lifecycle.current(state.provider), null);
    assert.deepEqual(adapter.lifecycle.status(), []);
  } else if (scenario === 'privacy') {
    const proof = await result(await raw('verify-recipient', state.proofBody));
    assert.equal(proof.status, 200); assert.equal(proof.body, state.proofReceipt);
    const retired = await result(await raw('retire-recipient', state.retirementBody));
    assert.equal(retired.status, 200); assert.equal(retired.body, state.retirementReceipt);
    assert.equal((await result(await raw('retire-recipient', state.retirementBody + ' '))).status, 409);
    assert.equal(store.db.prepare('SELECT payload FROM native_recipient_privacy').get().payload, null);
    assert.equal(adapter.retirementStatus()[0].state, 'accepted');
  } else {
    for (const event of state.events) {
      const replay = await result(await raw('events', event.body));
      assert.equal(replay.status, 200); assert.equal(replay.body, event.receipt);
    }
    assert.equal(adapter.lifecycle.current(state.provider).profile_active, false);
    assert.ok(adapter.lifecycle.status().every(row => row.state === 'accepted'));
  }
  console.log(JSON.stringify({ source, scenario, phase, status: 'PASS', actual_tcp: true,
    native_restart: phase === 'replay' || ['privacy', 'lifecycle'].includes(scenario), external_sent: false }));
} finally { store?.close(); }
