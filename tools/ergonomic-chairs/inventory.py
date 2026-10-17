"""Read-only chair scope and observed initial construction domains.

This is an inventory, not acceptance: cached source without wire provenance is
never declared a completed construction graph.
"""
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def structural(key):
    return key.rsplit('.', 1)[0].endswith(('_OPTIONS', '_DIMENSIONS'))


def inventory(web, sources, priorities):
    seed = json.loads((web / 'content/seed.json').read_text(encoding='utf8'))
    consolidation = json.loads((web / 'content/catalog-consolidation.json').read_text(encoding='utf8'))
    hidden = {(g['productId'], m['id']) for g in consolidation['groups'] for m in g['members'] if m['id'] != g['keeperId']}
    refs = {}
    for source in sources:
        for manifest in sorted(source.glob('*/seed-reference-manifest.json')):
            data = json.loads(manifest.read_text(encoding='utf8'))
            for ref in data.get('references', []):
                file = manifest.parent / ref['file']
                if not file.exists():
                    continue
                for sample in ref['samples']:
                    refs.setdefault((sample['productId'], sample['sample']), file)
    order = json.loads(priorities.read_text(encoding='utf8')).get('order', []) if priorities.exists() else []
    rows, excluded = [], []
    for product in seed['products']:
        if product.get('categorySlug') != 'kedes':
            continue
        for sample in product['configurations'] or [{'id': 'product', 'code': None}]:
            row = dict(productId=product['id'], configurationId=sample['id'], code=sample.get('code'),
                       name=product['name'], active=(product['id'], sample['id']) not in hidden)
            row['key'] = product['id'] + ':' + sample['id']
            if 'xilium' in product['id'].lower():
                excluded.append(row)
                continue
            params = parse_qs(urlparse(sample.get('configurator', '')).fragment, keep_blank_values=True)
            row.update(series=params.get('sid', [None])[0], originalVariant=params.get('ovc', [None])[0],
                       sourceUrl=sample.get('configurator'), phase='INVENTORIED', acceptance=False)
            row['job'] = digest([row['series'], row['code'], row['originalVariant']])[:24] if row['series'] and row['code'] and row['originalVariant'] is not None else None
            file = refs.get((product['id'], sample['id']))
            row.update(initialSource=None, initialSelectableConstructionTransitions=None, constructionFields=[], unboundedDimensions=[])
            if file:
                raw = file.read_bytes()
                state = json.loads(raw)
                fields = []
                for key, prop in state.get('properties', {}).items():
                    if not structural(key) or not prop.get('visible') or not prop.get('editable'):
                        continue
                    domain = state.get('choices', {}).get(key)
                    if domain is None:
                        row['unboundedDimensions'].append(key)
                        continue
                    fields.append(dict(key=key, value=prop.get('value'), values=[v['value'] for v in domain if v.get('selectable', True)]))
                row.update(initialSource=str(file), initialSourceSha256=hashlib.sha256(raw).hexdigest(),
                           constructionFields=fields, initialSelectableConstructionTransitions=sum(sum(v != f['value'] for v in f['values']) for f in fields))
            rows.append(row)
    jobs = {}
    for row in rows:
        if row['job']:
            jobs.setdefault(row['job'], []).append(row)
    def rank(item):
        _, members = item
        ranks = [order.index(m['key']) for m in members if m['key'] in order]
        known = [m['initialSelectableConstructionTransitions'] for m in members if m['initialSelectableConstructionTransitions'] is not None]
        return (min(ranks) if ranks else len(order), min(known) if known else 10**12, members[0]['name'], members[0]['configurationId'])
    queue = [dict(job=job, modelKeys=[m['key'] for m in members], series=members[0]['series'], code=members[0]['code'],
                  originalVariant=members[0]['originalVariant'], observedInitialDegree=min((m['initialSelectableConstructionTransitions'] for m in members if m['initialSelectableConstructionTransitions'] is not None), default=None)) for job, members in sorted(jobs.items(), key=rank)]
    known_jobs = [j for j in queue if j['observedInitialDegree'] is not None]
    return dict(at=datetime.now(timezone.utc).isoformat(), policy='original-variant-default-finishes-options-dimensions-only-v1',
                counts=dict(originalChairs=len(rows)+len(excluded), excludedXilium=len(excluded), scopedOriginalModels=len(rows),
                            scopedActiveCards=sum(r['active'] for r in rows), distinctInitialVariantJobs=len(jobs),
                            exactInitialSources=sum(r['initialSource'] is not None for r in rows),
                            jobsWithInitialDomains=len(known_jobs), observedInitialTransitions=sum(j['observedInitialDegree'] for j in known_jobs),
                            missingOriginalVariant=sum(r['job'] is None for r in rows)),
                estimate=dict(totalTransitions=None, nativeTransitionsPerHour=None, totalDurationHours=None,
                              explanation='Initial degree is an observed lower bound only. Reachable dependencies and full closure require true Native measurement.'),
                priorityFile=str(priorities), queue=queue, models=rows, excludedXilium=excluded)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--web', type=Path, required=True)
    parser.add_argument('--source', type=Path, action='append', required=True)
    parser.add_argument('--priorities', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = inventory(args.web, args.source, args.priorities)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps(dict(counts=result['counts'], estimate=result['estimate'], firstJobs=result['queue'][:5]), ensure_ascii=True))
