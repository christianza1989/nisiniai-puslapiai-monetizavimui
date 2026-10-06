import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CITIES, CITY_NAMES} from '../prototype/cities.mjs';
import {TAXONOMY} from '../prototype/demo-model.mjs';
import {resolveRoute} from '../prototype/app-server.mjs';
import {openStore} from '../backend/store.mjs';
import {createAuth} from '../backend/auth.mjs';
import {createPlatform} from '../backend/platform.mjs';

test('Every Lithuanian city has an unambiguous searchable route; unknown cities remain missing', () => {
  assert.equal(CITIES.length, 103);
  assert.equal(new Set(CITIES.map(([id]) => id)).size, 103);
  for (const [id] of CITIES) {
    assert.ok(resolveRoute('/miestai/' + id), id);
    assert.ok(resolveRoute('/paslaugos/antakiai/' + id), id);
  }
  assert.equal(resolveRoute('/miestai/not-a-city'), null);
  assert.equal(resolveRoute('/paslaugos/antakiai/not-a-city'), null);
});

test('Changing an already selected service still exposes every service and city', async () => {
  let source = await readFile(new URL('../prototype/public/ui.mjs', import.meta.url), 'utf8');
  for (const name of ['seo-contract', 'cities']) {
    source = source.replace('/' + name + '.mjs', new URL('../prototype/' + name + '.mjs', import.meta.url).href);
  }
  const {searchForm} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  for (const service of TAXONOMY) {
    const html = searchForm({taxonomy: TAXONOMY, dayLabel: String}, {paslauga: service.id, miestas: 'utena', diena: 1, nuo: '17:00', iki: '20:00'});
    const menu = html.match(/<select[^>]*name="paslauga"[^>]*>(.*?)<\/select>/)[1];
    assert.equal([...menu.matchAll(/<option /g)].length, TAXONOMY.length);
    assert.ok(menu.includes(`value="${service.id}" selected`));
    for (const option of TAXONOMY) assert.ok(menu.includes(`value="${option.id}"`));
    assert.ok(!html.includes('<datalist'));
    const cities = html.match(/<select[^>]*name="miestas"[^>]*>(.*?)<\/select>/)[1];
    assert.equal([...cities.matchAll(/<option /g)].length, 103);
    assert.ok(cities.includes('value="utena" selected'));
  }
});

test('Provider registration, city changes and published catalog accept cities outside the old eight', () => {
  const store = openStore({filename: ':memory:', clock: () => Date.parse('2026-10-06T07:00:00Z'), secret: 'x'.repeat(64)});
  try {
    const auth = createAuth(store), api = createPlatform(store);
    const session = auth.session(null), challenge = auth.start(session, 'city-test@example.com', '127.0.0.1');
    const owner = auth.verify(session, challenge.challengeId, store.capture(challenge.challengeId).code, '127.0.0.1').user;
    const operator = {...owner, operator: true};
    for (const city of ['Utena', 'Kazlų Rūda', 'Žiežmariai']) {
      const org = api.createOrganization(owner, {name: 'Izoliuotas miesto testas', bio: 'Testinis profilis.', city, kind: 'solo'});
      const scope = {role: 'professional', organizationId: org.id}, w = api.workspace(owner, scope);
      const service = api.createService(owner, {organizationId: org.id, practitionerId: w.practitioners[0].id, resourceId: w.resources[0].id, taxonomyServiceId: 'antakiai', label: 'Antakių priežiūra', durationMin: 30, priceMinor: 2000, bufferBeforeMin: 0, bufferAfterMin: 0});
      const revision = api.submitRevision(owner, {scope, name: org.name, bio: org.bio});
      api.moderate(operator, {id: revision.id, state: 'approved'});
      assert.ok(api.catalog({city, taxonomyServiceId: 'antakiai'}).some(s => s.id === service.id));
      const change = api.submitRevision(owner, {scope, name: org.name, bio: org.bio, city: 'Viekšniai'});
      api.moderate(operator, {id: change.id, state: 'approved'});
      assert.ok(!api.catalog({city}).some(s => s.id === service.id));
      assert.ok(api.catalog({city: 'Viekšniai'}).some(s => s.id === service.id));
    }
    assert.throws(() => api.createOrganization(owner, {name: 'Invalid', bio: 'Test', kind: 'solo', city: 'Unknown'}), e => e.code === 'INVALID_INPUT');
    assert.ok(CITY_NAMES.includes('Panemunė'));
  } finally { store.close(); }
});
