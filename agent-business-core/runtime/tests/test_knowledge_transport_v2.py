import copy
import json
import subprocess
from pathlib import Path

import pytest

from pinet_core import knowledge_index as index

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT.parents[2] / 'dovanos-memorycasting'


def node(source):
    process = subprocess.run(['node', '--input-type=module', '-e', source], capture_output=True,
        encoding='utf-8', timeout=30, check=True)
    return json.loads(process.stdout)


def test_js_python_full_inventory_unicode_and_multi_batch_hash_agree():
    helper = (ROOT / 'scripts/knowledge_transport_v2.mjs').as_uri()
    result = node(f"""
        import {{transport}} from {json.dumps(helper)};
        const metadata={{site_id:'fixture',canonical_host:'fixture.example',contact_email:'info@pinet.lt',
          operator:'MB Pinet',deployment_id:'full',generated_at:'2026-10-04T00:00:00.000Z'}};
        const pages=Array.from({{length:35}},(_,i)=>({{id:String(i),title:'Gidas '+i,
          url:'https://fixture.example/'+i,text:i===0?'🙂'.repeat(18001)+'ąžuolas':'Įžanga '+i,
          revision_hash:'a'.repeat(64),projection_hash:'b'.repeat(64)}}));
        console.log(JSON.stringify({{...transport(metadata,pages,0,'cross-language'),pages}}));
    """)
    header = index.Begin.model_validate(result['header']).model_dump(mode='json')
    fragments = {}
    for batch in result['batches']:
        checked = index.Batch.model_validate(batch)
        for fragment in checked.fragments:
            fragments[str(fragment.ordinal)] = fragment.model_dump(mode='json')
    assert len(result['batches']) > 1
    assert index.assemble(header, fragments) == result['pages']
    assert len(result['pages'][0]['text']) == 18008


def test_emitter_dispatches_actual_m2_public_projection_and_keeps_v1_format(tmp_path):
    # Isolated files only. Copy the actual accepted producer, not a second filter.
    core = tmp_path / 'core'
    (core / 'lib/generated').mkdir(parents=True)
    (core / 'config').mkdir()
    for name in ('niche-links.mjs', 'content-projection-v2.mjs'):
        (core / 'lib' / name).write_bytes((PUBLIC / 'lib' / name).read_bytes())
    fixture = ROOT.parents[1] / 'research/dovanos123-integration-2026-10-04/M1/content-package.v2.fixture.json'
    gift = json.loads(fixture.read_text(encoding='utf-8'))
    # The fixture's original approved revisions remain intact.
    v1 = {'schemaVersion': 1, 'siteId': 'legacy', 'canonicalHost': 'legacy.example',
        'site': {'contact': {'email': 'info@pinet.lt'}}, 'pages': [{
            'id': 'home', 'slug': '', 'title': 'Legacy page', 'publishAt': '2026-01-01T00:00:00Z',
            'revisionHash': 'a' * 64, 'approval': {'status': 'approved', 'revisionHash': 'a' * 64},
            'body': [{'type': 'paragraph', 'text': 'Legacy approved text.'}], 'links': [],
            'media': [], 'externalLinks': []}]}
    packages = [v1, gift]
    (core / 'lib/generated/content-packages.json').write_text(json.dumps(packages), encoding='utf-8')
    (core / 'config/niche-network.json').write_text(json.dumps({'defaultEmail': 'info@pinet.lt',
        'operatorName': 'MB Pinet'}), encoding='utf-8')
    (core / 'config/commerce-targets.json').write_text('{"targets":[]}', encoding='utf-8')
    output = tmp_path / 'projection'
    subprocess.run(['node', str(ROOT / 'scripts/network_manifest.mjs'), str(core), str(output)],
        capture_output=True, encoding='utf-8', timeout=30, check=True)
    legacy = json.loads((output / 'legacy.json').read_text(encoding='utf-8'))
    assert 'schema_version' not in legacy and legacy['pages'][0]['text'] == 'Legacy approved text.'
    assert not (output / 'v2-fixture.json').exists()
    result = json.loads((output / 'v2-fixture.v2.json').read_text(encoding='utf-8'))
    fragments = {str(p['ordinal']): p for b in result['batches'] for p in b['fragments']}
    pages = index.assemble(result['header'], fragments)
    expected = node(f"""
        import {{projectContentPagesV2,visibleContentTextV2}} from
          {json.dumps((PUBLIC / 'lib/content-projection-v2.mjs').as_uri())};
        const pkg={json.dumps(gift)};
        console.log(JSON.stringify(projectContentPagesV2(pkg,[pkg],{{}},{{targets:[]}},Date.now())
          .map(p=>({{id:p.id,text:visibleContentTextV2(p)}}))));
    """)
    assert [{'id': p['id'], 'text': p['text']} for p in pages] == expected
    assert pages[0]['revision_hash'] == gift['pages'][0]['revisionHash']
    assert '[object Object]' not in pages[0]['text'] and 'Redakcija:' in pages[0]['text']
    registry = json.loads((output / 'registry.json').read_text(encoding='utf-8'))
    assert not registry['sites'][1]['runtime_admitted']
    assert json.loads((core / 'lib/generated/content-packages.json').read_text(encoding='utf-8')) == packages


def emit_again(core, output):
    return subprocess.run(['node', str(ROOT / 'scripts/network_manifest.mjs'), str(core), str(output)],
        capture_output=True, encoding='utf-8', timeout=30)


def test_v2_operator_override_is_bound_to_snapshot_and_hash_but_v1_stays_global(tmp_path):
    test_emitter_dispatches_actual_m2_public_projection_and_keeps_v1_format(tmp_path)
    core = tmp_path / 'core'
    first = json.loads((tmp_path / 'projection/v2-fixture.v2.json').read_text(encoding='utf-8'))
    legacy = json.loads((tmp_path / 'projection/legacy.json').read_text(encoding='utf-8'))
    cfg = {'defaultEmail': 'info@pinet.lt', 'operatorName': 'Other default operator',
        'contactsBySite': {'v2-fixture': {'operatorName': 'MB Pinet'},
            'legacy': {'operatorName': 'V1 override does not change legacy behaviour'}}}
    (core / 'config/niche-network.json').write_text(json.dumps(cfg), encoding='utf-8')
    output = tmp_path / 'override'
    response = emit_again(core, output)
    assert response.returncode == 0, response.stderr
    result = json.loads((output / 'v2-fixture.v2.json').read_text(encoding='utf-8'))
    assert result['header']['metadata']['operator'] == 'MB Pinet'
    assert result['header']['metadata']['deployment_id'] == first['header']['metadata']['deployment_id']
    parts = {str(p['ordinal']): p for b in result['batches'] for p in b['fragments']}
    assert index.assemble(result['header'], parts)
    v1 = json.loads((output / 'legacy.json').read_text(encoding='utf-8'))
    assert v1['operator'] == cfg['operatorName']
    assert v1['deployment_id'] == legacy['deployment_id'] and v1['pages'] == legacy['pages']


@pytest.mark.parametrize('override,snapshot,has_override', [
    ('Other operator', 'MB Pinet', True), ('', 'MB Pinet', True), (123, 'MB Pinet', True),
    (None, 'MB Pinet', True), (None, 'Changed package operator', False), ('MB Pinet', None, True)])
def test_v2_operator_mismatch_and_invalid_override_fail_before_v2_export(
        tmp_path, override, snapshot, has_override):
    test_emitter_dispatches_actual_m2_public_projection_and_keeps_v1_format(tmp_path)
    core = tmp_path / 'core'
    path = core / 'lib/generated/content-packages.json'
    packages = json.loads(path.read_text(encoding='utf-8'))
    if snapshot is None:
        packages[1]['site'].pop('operatorName')
    else:
        packages[1]['site']['operatorName'] = snapshot
    path.write_text(json.dumps(packages), encoding='utf-8')
    cfg = {'defaultEmail': 'info@pinet.lt', 'operatorName': 'MB Pinet', 'contactsBySite': {}}
    if has_override:
        cfg['contactsBySite']['v2-fixture'] = {'operatorName': override}
    (core / 'config/niche-network.json').write_text(json.dumps(cfg), encoding='utf-8')
    output = tmp_path / 'rejected'
    response = emit_again(core, output)
    assert response.returncode != 0 and 'operator_mismatch:v2-fixture' in response.stderr
    assert not (output / 'v2-fixture.v2.json').exists() and not (output / 'registry.json').exists()


def test_missing_fragment_and_duplicate_parts_are_rejected():
    metadata = {'site_id': 'fixture'}
    page = {'id': '1', 'title': 'One', 'url': 'https://fixture.example/', 'text': 'ab',
        'revision_hash': 'a' * 64, 'projection_hash': 'b' * 64}
    header = {'metadata': metadata, 'page_count': 1, 'fragment_count': 2,
        'content_hash': index.content_hash(metadata, [page])}
    parts = {str(i): {**page, 'text': 'ab'[i], 'ordinal': i, 'page_ordinal': 0, 'part': i, 'parts': 2}
        for i in range(2)}
    assert index.assemble(header, parts) == [page]
    malformed = copy.deepcopy(parts)
    malformed['1']['part'] = 0
    from fastapi import HTTPException
    with pytest.raises(HTTPException, match='knowledge_page_fragments_conflict'):
        index.assemble(header, malformed)
