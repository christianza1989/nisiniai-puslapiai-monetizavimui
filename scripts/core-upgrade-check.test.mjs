import test from 'node:test';import assert from 'node:assert/strict';
import {uncoveredUpgradePaths} from './core-upgrade-check.mjs';
test('committed shared changes require exact registered paths, with no directory wildcard bypass',()=>{
 assert.deepEqual(uncoveredUpgradePaths(['content-studio/src/generator.mjs','scripts/core-upgrade-check.mjs','sites/madbeauty/report.json','core-improvements/entries/upgrade-x/record.json'],['content-studio/src/','scripts/core-upgrade-check.mjs']),['content-studio/src/generator.mjs']);
 assert.deepEqual(uncoveredUpgradePaths(['content-studio/src/generator.mjs'],['content-studio/src/generator.mjs']),[]);
 assert.deepEqual(uncoveredUpgradePaths(['AGENTS.md'],[]),['AGENTS.md']);
});
