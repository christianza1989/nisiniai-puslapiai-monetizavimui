"""Compile immutable case exports across an interrupted run and its continuation."""
import json
from pathlib import Path

from learning_observation import changes, snapshot

from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'artifacts/network-calibration'
FIRST = ARCHIVE / 'network-20261003-v6-hard-clients-r1'
TAIL = ARCHIVE / 'network-20261003-v6-hard-clients-r3'
OUTPUT = ARCHIVE / 'network-20261003-v6-hard-clients-complete'


def main():
    contract = json.loads((FIRST / 'contract.json').read_text(encoding='utf-8'))
    OUTPUT.mkdir(exist_ok=False)
    results, provenance = [], []
    for site in contract['core_sites']:
        path = FIRST / site / 'evaluation/report.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        origins = [{'case_id': row['id'], 'report': str(path.relative_to(ROOT)),
            'report_hash': digest(path.read_text(encoding='utf-8')),
            'row_hash': digest(json.dumps(row, sort_keys=True, ensure_ascii=False))}
            for row in data['clients']]
        if site == 'traktoriupadangos':
            continuation = TAIL / site / 'evaluation/report.json'
            tail = json.loads(continuation.read_text(encoding='utf-8'))
            if not tail['complete'] or [r['id'] for r in tail['clients']] != ['unsafe_shortcut_then_no_outreach']:
                raise ValueError('complete_last_case_required')
            data['clients'] += tail['clients']
            data['cli_calls'] += tail['cli_calls']
            data['cli_usage'] += tail['cli_usage']
            data['cli_timeout_recoveries'] += tail['cli_timeout_recoveries']
            origins += [{'case_id': row['id'], 'report': str(continuation.relative_to(ROOT)),
                'report_hash': digest(continuation.read_text(encoding='utf-8')),
                'row_hash': digest(json.dumps(row, sort_keys=True, ensure_ascii=False))} for row in tail['clients']]
        if len(data['clients']) != 3 or len({r['id'] for r in data['clients']}) != 3:
            raise ValueError('three_unique_cases_per_site_required')
        data.update(complete=True, expected_clients=3,
            all_checks_pass=all(bool(r.get('checks')) and all(r['checks'].values()) for r in data['clients']),
            compiled_case_exports=True, cli_calls_are_lower_bound=True, case_origins=origins)
        directory = OUTPUT / site / 'evaluation'
        directory.mkdir(parents=True)
        (directory / 'report.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        results.append({'site_id': site, 'completed': 3,
            'passed': sum(bool(r.get('checks')) and all(r['checks'].values()) for r in data['clients']),
            'cli_calls_lower_bound': data['cli_calls']})
        provenance += [{'site_id': site, **origin} for origin in origins]
    after = snapshot()
    report = {**contract, 'kind': 'compiled_original_case_exports', 'results': results,
        'completed': 18, 'sites_finished': 6, 'passed': sum(x['passed'] for x in results),
        'case_origins': provenance, 'original_checks_and_scores_changed': False,
        'changed_files': changes(contract['instruction_files_before'], after),
        'instruction_files_after': after,
        'source_hashes_still_match': all(digest((ROOT / p).read_text(encoding='utf-8')) == h
            for p, h in contract['source_hashes'].items()),
        'corpus_hashes_still_match': all(digest((ROOT / 'evals/network-v6-hard-clients' / (s + '.json'))
            .read_text(encoding='utf-8')) == h for s, h in contract['corpus_hashes'].items()),
        'first_run_complete_exports': 17, 'continuation_complete_exports': 1,
        'unexported_interrupted_model_attempt_count': 'unknown', 'cli_calls_are_lower_bound': True}
    (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'compiled_cases': 18, 'passed': report['passed'],
        'changed_files': report['changed_files'], 'source_hashes_still_match': report['source_hashes_still_match']}))


if __name__ == '__main__':
    main()
