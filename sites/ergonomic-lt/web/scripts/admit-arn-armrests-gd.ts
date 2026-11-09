import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { ChairPreview } from '../src/lib/chair-preview';
import type { Asset } from '../src/lib/expanded-configurator';
import type { ChairQualifiedData, QualifiedOption, QualifiedGroup, QualifiedPatch } from '../src/lib/chair-qualified-colors';
import { validateChairReviewComponents } from '../src/lib/chair-components';

export const ownArnArmrestsGdPins = {
  code: 'KARN008WW003',
  version: 'colors-20261109-v1-qualified-own-armrests-gd1009300',
  manifest: '7e90f1ade231efd149cace06d1ba733747a0335b81ba0c726fe0014be3af4b4a',
  runtime: 'bed4d8635ea0b1a7782b6c27877041a46922f5970a3334c83d0ff326eed8d0a1',
  asset: 'c5d039119c129f4884dc2130ba11c8dc7fc9ca5ad0a23a1a8b62f7f7090c43fa',
  contract: '4338757527a409f5c96039c25f5dd3db6ad03b1c8f414f31a3f0bb493974bd84',
};

type PackageObject = Record<string, any>;
const fixedFinish = {
  CBACKRESTPLASMATERIAL: 'PLASTIC',
  CCHASSISPLASTICMATERIAL: 'PLASTIC',
  CSEATPLASTICMATERIAL: 'PLASTIC',
};
const structural = {
  CARMRESTS: { value: 'BUILTINPLASTCLOSED', supportedValues: ['BUILTINPLASTCLOSED'] },
  CGLIDES: { value: 'GD', supportedValues: ['GD'] },
};
const definitions = [
  { fields: ['CBACKRESTPLASTICCOLOR', 'CCHASSISPLASTICCOLOR', 'CSEATPLASTICCOLOR'], count: 6, selectors: 4, label: 'Korpuso apdaila' },
  { fields: ['CFRAMEMETALCOLOR', 'CFRAMEMETALMATERIAL'], count: 9, selectors: 1, label: 'Rėmo medžiaga ir spalva' },
];
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function admitArnArmrestsGd(input: {
  manifest: string;
  runtimeSha256: string;
  rawRuntime: PackageObject;
  documents: Record<string, PackageObject>;
  selectors: ChairPreview['selectors'];
  materials: Record<string, unknown>;
  fileAssets: Record<string, Asset>;
}) {
  const pins = ownArnArmrestsGdPins;
  const { rawRuntime, documents, selectors, materials, fileAssets } = input;
  const contract = documents['own-source-contract.json'];
  const palette = documents['colors-groups.json'];
  const evidence = documents['native10-qualification.json'];
  const scope = documents['construction-scope.json'];
  assert.equal(input.manifest, pins.manifest);
  assert.equal(input.runtimeSha256, pins.runtime);
  for (const document of [rawRuntime, contract, palette, evidence, scope]) assert.equal(document.code, pins.code);
  assert.equal(contract.version, pins.version);
  assert.equal(contract.schema, 'qualified-own-complete-finish-fixed-construction-contract-1009400-v1');
  assert.equal(palette.schema, 'chair-qualified-own-current-group-palette-1009400-v1');
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
  assert.deepEqual(contract.actualGroupValueCounts, [6, 9]);
  assert(evidence.pass && evidence.tested === 10 && evidence.passed === 10 && evidence.actualDistinctNativeSignatures === 10);
  assert(evidence.actualWholeStates === 24 && evidence.postprefixDomainRowsVerified === 23);
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
  for (const [field, restriction] of Object.entries(structural)) {
    const source = contract.fixedSelectableStructuralFields[field];
    assert.equal(context.dimensions[field], restriction.value);
    assert(source.editable && source.fixedValue === restriction.value);
    assert.equal(source.role, 'FIXED_SELECTABLE_CONSTRUCTION_RESTRICTION_NOT_READONLY');
    assert.deepEqual(source.supportedScopeValues, restriction.supportedValues);
    const excluded = field === 'CARMRESTS' ? 'NONE' : 'GDF';
    assert.deepEqual(source.unqualifiedValues, [excluded]);
    assert.deepEqual([...source.sourceSelectableValues].sort(), [excluded, restriction.value].sort());
  }
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
  assert.equal(slots.length, 7);
  assert.equal(palette.groups.length, 2);
  const owned = new Set<string>();
  const usedMaterials: Record<string, unknown> = {};
  const extraAssets: Record<string, Asset> = {};
  const groups: QualifiedGroup[] = definitions.map((definition, index) => {
    const group = palette.groups[index];
    assert.deepEqual(group.fields, definition.fields);
    assert(group.completeActualPostPrefixDomain && group.actualGroupValueCount === definition.count);
    const variants: PackageObject[] = Object.values(group.values);
    assert.equal(variants.length, definition.count);
    const localSelectors = new Set<string>();
    for (const selector of group.ownedBaselineSelectors) {
      assert.equal(selector.assetSha256, pins.asset);
      assert(slots.some(slot => slot.selectorId === selector.selectorId));
      assert(!owned.has(selector.selectorId));
      owned.add(selector.selectorId);
      localSelectors.add(selector.selectorId);
    }
    assert.equal(localSelectors.size, definition.selectors);
    const tuple = (values: Record<string, string>) => JSON.stringify(definition.fields.map(field => values[field]));
    const baseTuple = tuple(group.baseValues);
    const seen = new Set<string>();
    const options: QualifiedOption[] = variants.map(variant => {
      assert.deepEqual(Object.keys(variant.values).sort(), definition.fields);
      for (const field of definition.fields) {
        assert.equal(variant.fieldRoles[field].actualValue, variant.values[field]);
        assert.equal(typeof variant.fieldRoles[field].editable, 'boolean');
      }
      const key = tuple(variant.values);
      assert(!seen.has(key));
      seen.add(key);
      const isBase = key === baseTuple;
      const patch: QualifiedPatch = { bindings: [], remove: [], assets: [] };
      assert.equal(variant.mode, isBase ? 'unchanged' : index === 0 ? 'material' : 'primitiveSwap');
      if (index === 0) {
        const color = variant.values.CCHASSISPLASTICCOLOR;
        assert(definition.fields.every(field => variant.values[field] === color));
        assert.equal(variant.fieldRoles.CCHASSISPLASTICCOLOR.editable, true);
        assert.equal(variant.fieldRoles.CBACKRESTPLASTICCOLOR.editable, false);
        assert.equal(variant.fieldRoles.CSEATPLASTICCOLOR.editable, false);
      } else {
        assert.equal(variant.values.CFRAMEMETALMATERIAL, isBase ? 'ALUAN' : 'ALUPC');
        assert.equal(variant.fieldRoles.CFRAMEMETALCOLOR.editable, !isBase);
      }
      if (variant.mode === 'primitiveSwap') {
        assert(!variant.bindings?.length);
        assert.deepEqual(variant.removeOwnSelectors, group.ownedBaselineSelectors);
        const ref = variant.addOwnManufacturerAsset;
        assert.equal(ref.file, 'color-group-assets/' + ref.sha256 + '.glb');
        const part = fileAssets[ref.file];
        assert(part && part.assetSha256 === ref.sha256 && part.bytes === ref.bytes);
        assert(part.bytes! <= 25 * 1024 * 1024 && !extraAssets[ref.sha256]);
        extraAssets[ref.sha256] = part;
        patch.remove = variant.removeOwnSelectors;
        patch.assets = [part];
      } else {
        assert(!variant.removeOwnSelectors && !variant.addOwnManufacturerAsset);
        const bindings = variant.bindings || [];
        assert.equal(bindings.length, isBase ? 0 : localSelectors.size);
        const assigned = new Set<string>();
        for (const binding of bindings) {
          assert.equal(binding.assetSha256, pins.asset);
          assert(localSelectors.has(binding.selectorId) && !assigned.has(binding.selectorId));
          assert.equal(slots.find(slot => slot.selectorId === binding.selectorId)?.materialId, binding.baseMaterialId);
          assert(materials[binding.materialId] && binding.baseMaterialId !== binding.materialId);
          assigned.add(binding.selectorId);
          usedMaterials[binding.materialId] = materials[binding.materialId];
          patch.bindings.push(binding);
        }
      }
      const label = index === 0
        ? variant.fieldRoles.CCHASSISPLASTICCOLOR.text + ' · ' + variant.values.CCHASSISPLASTICCOLOR
        : (isBase ? 'Anoduotas aliuminis' : 'Dažytas aliuminis') + ' · ' + variant.fieldRoles.CFRAMEMETALCOLOR.text;
      return { id: hash(key), label, values: variant.values, patch };
    });
    assert(seen.has(baseTuple));
    return { id: group.id, label: definition.label, options, base: hash(baseTuple) };
  });
  assert.equal(Object.keys(extraAssets).length, 8);
  const qualified: ChairQualifiedData = {
    schema: 'chair-qualified-review-v1', code: pins.code, runtimeSha256: pins.runtime, version: pins.version,
    witnesses: [{
      id: hash(pins.runtime), label: 'GD · korpusas ir rėmas', context: 0, construction: context.dimensions,
      variants: [0], requiredAssets: [pins.asset], groups,
      singles: [], branches: [], fixed: fixedFinish, structural,
    }],
    legacyScopes: [], materials: usedMaterials, extraAssets, opaqueAssets: Object.keys(extraAssets),
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
