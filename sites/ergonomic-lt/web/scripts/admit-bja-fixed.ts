import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { ChairPreview } from '../src/lib/chair-preview';
import type { ChairQualifiedData, QualifiedOption } from '../src/lib/chair-qualified-colors';
import { validateChairReviewComponents } from '../src/lib/chair-components';

export const ownBjaFixedPins = {
  code: 'KBJA002WW002',
  version: 'colors-20261109-v1-qualified-own1011000',
  manifest: 'c87f1956234e01051fa81e7bc104c5cb69e17982cda5918b36e77bab9270099d',
  runtime: '17844005fb591e6352b84a92358510d5e2184a470bc288fc48cdfb96ed1edcdc',
  asset: '19c56dd72591cf850e992f95cb396016edd9f22926a439a375b5d0079cdcd98b',
  contract: '3100a97fd88babe38a4bf639392764b238701448403d1e83c4ae90b9d3771cee',
};

type PackageObject = Record<string, any>;
const construction = {
  CARMRESTS: 'R35K3SB2',
  CBACKRESTFOAM: 'STANDARD',
  CBASE: 'ST61POLBL',
  CCASTORS: 'ESH60',
  CLUMBARSUPPORT: 'LSD2',
  CMECHANISM: 'FST',
  CSEATFOAM: 'FLAMERETARDANT',
};
const finishFields = ['CPRICEGROUP', 'CUPHCOLOR', 'CUPHGROUP'];
const tupleKey = (values: Record<string, string>) => JSON.stringify(finishFields.map(field => values[field]));
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function admitBjaFixed(input: {
  manifest: string;
  runtimeSha256: string;
  rawRuntime: PackageObject;
  documents: Record<string, PackageObject>;
  selectors: ChairPreview['selectors'];
  materials: Record<string, unknown>;
}) {
  const pins = ownBjaFixedPins;
  const { rawRuntime, documents, selectors, materials } = input;
  const contract = documents['own-source-contract.json'];
  const palette = documents['colors-groups.json'];
  const evidence = documents['native10-qualification.json'];
  const scope = documents['construction-scope.json'];
  assert.equal(input.manifest, pins.manifest);
  assert.equal(input.runtimeSha256, pins.runtime);
  for (const document of [rawRuntime, contract, palette, evidence, scope]) assert.equal(document.code, pins.code);
  assert.equal(contract.version, pins.version);
  assert.equal(contract.schema, 'qualified-own-complete-finish-fixed-construction-contract-1011100-v1');
  assert.equal(palette.schema, 'chair-qualified-own-current-group-palette-1011100-v1');
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
  assert.deepEqual(contract.actualGroupValueCounts, [704]);
  assert(evidence.pass && evidence.tested === 10 && evidence.passed === 10 && evidence.actualDistinctNativeSignatures === 10);
  assert(evidence.actualWholeStates === 704 && evidence.postprefixDomainRowsVerified === 2112);
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
  assert.deepEqual(context.dimensions, Object.fromEntries(
    Object.entries(palette.exactConstructionAndDerivedValues).map(([key, value]) => [key.split('.')[1], value]),
  ));
  assert.deepEqual(Object.keys(contract.fixedSelectableStructuralFields).sort(), Object.keys(construction));
  assert.deepEqual(scope.fullObservedStructuralFields, Object.keys(construction));
  for (const [field, value] of Object.entries(construction)) {
    const restriction = contract.fixedSelectableStructuralFields[field];
    assert.equal(context.dimensions[field], value);
    assert.equal(restriction.fixedValue, value);
    assert.equal(restriction.qualifiedProperty, pins.code + '_OPTIONS.' + field);
    assert(restriction.editable && restriction.visible);
    assert.equal(restriction.role, 'FIXED_SELECTABLE_CONSTRUCTION_RESTRICTION_NOT_READONLY');
    assert.deepEqual(restriction.supportedScopeValues, [value]);
    assert(restriction.sourceSelectableValues.includes(value));
    assert.deepEqual(restriction.unqualifiedValues, restriction.sourceSelectableValues.filter((choice: string) => choice !== value));
    assert(restriction.unqualifiedValues.length > 0);
  }
  for (const document of [palette, scope, evidence, rawRuntime, context]) {
    assert.deepEqual(document.fixedSelectableStructuralFields, contract.fixedSelectableStructuralFields);
  }
  assert.deepEqual(palette.fixedObservedFinishValues, {});
  assert.deepEqual(palette.fixedObservedFinishRoles, {});
  assert.deepEqual(contract.fixedNonchoiceFinishRoles, {});

  const runtime = structuredClone(rawRuntime);
  runtime.finishPolicy = 'original manufacturer finishes; no FINISH setters';
  runtime.contexts[0].choiceRules = 'conditional selectable tuples only';
  runtime.contexts[0].groups = [{ fields: [], variants: [{ values: {}, asset: null }] }];
  runtime.contexts[0].invariant.file = 'assets/' + invariant.componentSha256 + '.glb';
  validateChairReviewComponents(runtime, pins.code);
  assert.equal(selectors.schema, 'canonical-world-primitive-selectors-329-v1');
  assert.deepEqual(Object.keys(selectors.assets), [pins.asset]);
  const slots = selectors.assets[pins.asset].slots;
  assert.equal(slots.length, 24);
  assert.equal(palette.groups.length, 1);
  const group = palette.groups[0];
  assert.deepEqual(group.fields, finishFields);
  assert(group.completeActualPostPrefixDomain && group.actualGroupValueCount === 704);
  const variants: PackageObject[] = Array.isArray(group.values) ? group.values : Object.values(group.values);
  assert.equal(variants.length, 704);
  const owned = new Set<string>();
  for (const selector of group.ownedBaselineSelectors) {
    assert.equal(selector.assetSha256, pins.asset);
    assert(slots.some(slot => slot.selectorId === selector.selectorId));
    assert(!owned.has(selector.selectorId));
    owned.add(selector.selectorId);
  }
  assert.equal(owned.size, 9);
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
    // Two supplied variants change only a subset of the owned surfaces.
    assert(isBase ? variant.bindings.length === 0 : [2, owned.size].includes(variant.bindings.length));
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
      id: hash(pins.runtime), label: 'Bja · apmušalas', context: 0, construction: context.dimensions,
      variants: [0], requiredAssets: [pins.asset], groups: [{ id: group.id, label: 'Apmušalas', options, base: hash(baseTuple) }],
      singles: [], branches: [], structural: Object.fromEntries(Object.entries(construction).map(([field, value]) => [field, { value, supportedValues: [value] }])),
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
