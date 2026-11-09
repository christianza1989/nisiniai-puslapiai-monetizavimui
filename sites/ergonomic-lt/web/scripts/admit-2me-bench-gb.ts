import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { ChairPreview } from '../src/lib/chair-preview';
import type { ChairQualifiedData, QualifiedOption } from '../src/lib/chair-qualified-colors';
import { validateChairReviewComponents } from '../src/lib/chair-components';

export const own2meBenchPins = {
  code: 'K2ME004WW004',
  version: 'colors-20261108-v1-qualified-own-gb1006700',
  manifest: '0684c0bc75d9ecfd43d2597faabbc130313fa796e330b00faf17d10c7d316a4c',
  runtime: 'eb008084b3c5ae504caa7a60937156186ce226628a63cb56dffb79f86866cae4',
  asset: '2b9d96fcc217bd62cc703dbbac8f0d7ea8d55276b652c1d46a9b96de94df3c74',
  contract: '9962811a39ae8cc7b91ebb5dbe634eddca5907cd702e0453cc5d7fb851e04c03',
};

type PackageObject = Record<string, any>;
const fixedFinish = {
  CARMPADPLCOLOR: 'W',
  CBENCHARMMETALCOLOR: 'CR',
  CBENCHARMMETALMATERIAL: 'STEELCR',
  CSEATCOVERPLASTICCOLOR: 'W',
};
const finishFields = ['CPRICEGROUP', 'CUPHCOLOR', 'CUPHGROUP'];
const tupleKey = (values: Record<string, string>) => JSON.stringify(finishFields.map(field => values[field]));
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function admit2meBench(input: {
  manifest: string;
  runtimeSha256: string;
  rawRuntime: PackageObject;
  documents: Record<string, PackageObject>;
  selectors: ChairPreview['selectors'];
  materials: Record<string, unknown>;
}) {
  const pins = own2meBenchPins;
  const { rawRuntime, documents, selectors, materials } = input;
  const contract = documents['own-source-contract.json'];
  const palette = documents['colors-groups.json'];
  const evidence = documents['native10-qualification.json'];
  const scope = documents['construction-scope.json'];
  assert.equal(input.manifest, pins.manifest);
  assert.equal(input.runtimeSha256, pins.runtime);
  for (const document of [rawRuntime, contract, palette, evidence, scope]) assert.equal(document.code, pins.code);
  assert.equal(contract.version, pins.version);
  assert.equal(contract.schema, 'qualified-own-complete-finish-fixed-construction-contract-1007000-v1');
  assert.equal(palette.schema, 'chair-qualified-own-current-group-palette-1007000-v1');
  assert.equal(contract.runtimeSha256, pins.runtime);
  assert.equal(palette.runtimeSha256, pins.runtime);
  assert.equal(palette.ownSourceContractSha256, pins.contract);
  assert.equal(contract.baselineAssetSha256, pins.asset);
  assert.deepEqual(palette.requiredOwnedBaseAssetShas, [pins.asset]);
  assert.equal(palette.runtimeContextIndex, 0);
  assert.equal(palette.witnessActualTupleSha256, contract.witnessFullActualTupleSha256);
  assert(contract.exactOwnConstructionOnly && contract.neverApplyToAnotherAssetOrRuntimeByCodeAlone);
  for (const document of [contract, palette]) {
    assert.equal(document.actualPaletteComplete, false);
    assert.equal(document.allGeometryContextsCovered, false);
    assert.equal(document.fullFormQualified, false);
    assert.equal(document.qualifiedConditionalConstructionPaletteComplete, true);
    assert.equal(document.existingMainRuntimeGeometryOwnershipQualified, false);
    assert.equal(document.sourceRuntimeOwnership, 'NEW_PC2_OWN_NATIVE_WITNESS');
  }
  assert.deepEqual(contract.actualGroupValueCounts, [537]);
  assert(evidence.pass && evidence.tested === 10 && evidence.passed === 10 && evidence.actualDistinctNativeSignatures === 10);
  assert(evidence.actualWholeStates === 537 && evidence.postprefixDomainRowsVerified === 1407);
  assert(evidence.all3ActiveFinishFieldsNondefaultEachSample && evidence.allGeometryUvOriginalWorldPbrReconstructionsMatched);
  assert(evidence.original432ScopedContextPositiveAndSevenNegativesPassed);
  assert.equal(evidence.sourceQualificationSha256, contract.qualificationSha256);

  assert.equal(rawRuntime.contexts.length, 1);
  assert.equal(rawRuntime.sourceRuntimeOwnership, 'NEW_PC2_OWN_NATIVE_WITNESS');
  const context = rawRuntime.contexts[0];
  const invariant = context.invariant;
  assert.deepEqual(context.groups, []);
  assert.equal(invariant.sha256, pins.asset);
  assert.equal(invariant.file, 'assets/' + pins.asset + '.glb');
  assert.equal(context.dimensions.CGLIDES, 'GB');
  assert.deepEqual(context.dimensions, Object.fromEntries(
    Object.entries(palette.exactConstructionAndDerivedValues).map(([key, value]) => [key.split('.')[1], value]),
  ));
  const glides = contract.fixedSelectableStructuralFields.CGLIDES;
  assert(glides.editable && glides.fixedValue === 'GB');
  assert.equal(glides.role, 'FIXED_SELECTABLE_CONSTRUCTION_RESTRICTION_NOT_READONLY');
  assert.deepEqual(glides.sourceSelectableValues, ['GB', 'GBF']);
  assert.deepEqual(glides.supportedScopeValues, ['GB']);
  assert.deepEqual(glides.unqualifiedValues, ['GBF']);
  for (const document of [palette, scope, evidence, rawRuntime, context]) {
    assert.deepEqual(document.fixedSelectableStructuralFields, contract.fixedSelectableStructuralFields);
  }
  assert.deepEqual(palette.fixedObservedFinishValues, fixedFinish);
  for (const [field, value] of Object.entries(fixedFinish)) {
    const role = contract.fixedNonchoiceFinishRoles[field];
    assert.equal(role.actualValue, value);
    assert.equal(role.notSelectableMenu, true);
    assert.deepEqual(role.actualSelectableChoices, []);
    assert.deepEqual(palette.fixedObservedFinishRoles[field], role);
  }

  const runtime = structuredClone(rawRuntime);
  runtime.finishPolicy = 'original manufacturer finishes; no FINISH setters';
  runtime.contexts[0].choiceRules = 'conditional selectable tuples only';
  runtime.contexts[0].groups = [{ fields: [], variants: [{ values: {}, asset: null }] }];
  runtime.contexts[0].invariant.file = 'assets/' + invariant.componentSha256 + '.glb';
  validateChairReviewComponents(runtime, pins.code);
  assert.equal(selectors.schema, 'canonical-world-primitive-selectors-329-v1');
  assert.deepEqual(Object.keys(selectors.assets), [pins.asset]);
  const slots = selectors.assets[pins.asset].slots;
  assert.equal(slots.length, 12);
  assert.equal(palette.groups.length, 1);
  const group = palette.groups[0];
  assert.deepEqual(group.fields, finishFields);
  assert(group.completeActualPostPrefixDomain && group.actualGroupValueCount === 537);
  const variants: PackageObject[] = Array.isArray(group.values) ? group.values : Object.values(group.values);
  assert.equal(variants.length, 537);
  const owned = new Set<string>();
  for (const selector of group.ownedBaselineSelectors) {
    assert.equal(selector.assetSha256, pins.asset);
    assert(slots.some(slot => slot.selectorId === selector.selectorId));
    assert(!owned.has(selector.selectorId));
    owned.add(selector.selectorId);
  }
  assert.equal(owned.size, 2);
  const usedMaterials: Record<string, unknown> = {};
  const seenTuples = new Set<string>();
  const baseTuple = tupleKey(group.baseValues);
  const options: QualifiedOption[] = [];
  for (const variant of variants) {
    assert.deepEqual(Object.keys(variant.values).sort(), finishFields);
    assert.deepEqual(Object.keys(variant.fieldRoles).sort(), finishFields);
    for (const field of finishFields) {
      assert.equal(variant.fieldRoles[field].actualValue, variant.values[field]);
      assert.equal(variant.fieldRoles[field].visible, true);
      assert.equal(typeof variant.fieldRoles[field].editable, 'boolean');
      if (field !== 'CUPHGROUP') assert.equal(variant.fieldRoles[field].editable, true);
    }
    const key = tupleKey(variant.values);
    assert(!seenTuples.has(key));
    seenTuples.add(key);
    const isBase = key === baseTuple;
    assert.equal(variant.mode, isBase ? 'unchanged' : 'material');
    assert(!variant.removeOwnSelectors && !variant.addOwnManufacturerAsset);
    assert.equal(variant.bindings.length, isBase ? 0 : owned.size);
    const assigned = new Set<string>();
    const bindings = [];
    for (const binding of variant.bindings) {
      assert.equal(binding.assetSha256, pins.asset);
      assert(owned.has(binding.selectorId) && !assigned.has(binding.selectorId));
      assert.equal(slots.find(slot => slot.selectorId === binding.selectorId)?.materialId, binding.baseMaterialId);
      assert(materials[binding.materialId]);
      assigned.add(binding.selectorId);
      if (binding.baseMaterialId !== binding.materialId) {
        usedMaterials[binding.materialId] = materials[binding.materialId];
        bindings.push(binding);
      }
    }
    assert(isBase || bindings.length > 0);
    options.push({
      id: hash(key), label: finishFields.map(field => field + ' = ' + variant.values[field]).join(' · '),
      values: variant.values, patch: { bindings, remove: [], assets: [] },
    });
  }
  assert(seenTuples.has(baseTuple));
  const qualified: ChairQualifiedData = {
    schema: 'chair-qualified-review-v1', code: pins.code, runtimeSha256: pins.runtime, version: pins.version,
    witnesses: [{
      id: hash(pins.runtime), label: 'GB · apmušalas', context: 0, construction: context.dimensions,
      variants: [0], requiredAssets: [pins.asset], groups: [{ id: group.id, label: 'Apmušalas', options, base: hash(baseTuple) }],
      singles: [], branches: [], fixed: fixedFinish, structural: { CGLIDES: { value: 'GB', supportedValues: ['GB'] } },
    }],
    legacyScopes: [], materials: usedMaterials, extraAssets: {}, opaqueAssets: [],
  };
  return {
    runtime, qualified, sourceFile: invariant.file,
    palette: {
      schema: 'chair-base-observed-colours-v1' as const, sourceSchema: palette.schema, code: pins.code,
      runtimeSha256: pins.runtime, actualPaletteComplete: false as const, independentFinishCompositionAllowed: false as const,
      availableMaterialBindings: [], baselineObservedFinish: Object.fromEntries(Object.entries(palette.baseFinishValues)
        .map(([field, value]) => [field, { value: String(value), knownCurrentPrefixChoices: [] }])),
    },
  };
}
