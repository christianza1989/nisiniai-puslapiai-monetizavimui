import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('shared v1 onboarding preserves defaults and validates English identity before writing', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'studio-site-locale-'));
  await mkdir(path.join(data, 'sites'));
  process.env.STUDIO_DATA_DIR = data;
  const model = await import('../src/model.mjs');
  try {
    const old = await model.createSite({ canonicalHost: 'default-locale.example', name: 'Fixture', offer: 'Test' });
    assert.equal(old.locale, 'lt-LT'); assert.equal(old.timezone, 'Europe/Vilnius');
    const english = await model.createSite({ canonicalHost: 'english-locale.example', name: 'Fixture', offer: 'Test', locale: 'en-us', timezone: 'Europe/London' });
    assert.equal(english.locale, 'en-US'); assert.equal(english.timezone, 'Europe/London');
    for (const extra of [{ locale: '' }, { locale: 'bad_locale' }, { timezone: 'Nowhere/Invalid' }, { timezone: '' }]) {
      await assert.rejects(model.createSite({ canonicalHost: 'invalid-locale.example', name: 'Fixture', offer: 'Test', ...extra }));
      assert.equal((await model.listSites()).some(s => s.canonicalHost === 'invalid-locale.example'), false);
    }
    assert.equal((await model.listSites()).length, 2);
  } finally { await rm(data, { recursive: true, force: true }); }
});
