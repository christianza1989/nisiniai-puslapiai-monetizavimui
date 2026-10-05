"""Evidence-based campaign report. Pending/failed phases never become a 100% claim."""
import argparse
import json
import re
from datetime import UTC, datetime
from html import escape
from pathlib import Path

from pinet_core.agent_instructions import SITES

ROOT = Path(__file__).resolve().parents[1]


def phase(directory, site, name, expected):
    path = directory / site / name / 'report.json'
    if not path.exists():
        return {'expected': expected, 'completed': 0, 'passed': 0, 'complete': False, 'failures': []}
    value = json.loads(path.read_text(encoding='utf-8'))
    clients = value.get('clients', [])
    return {'expected': expected, 'completed': len(clients),
        'passed': sum(bool(c.get('checks')) and all(c['checks'].values()) for c in clients),
        'complete': len(clients) == expected,
        'cli_calls': value.get('cli_calls', 0), 'instruction_hash': value.get('instruction_hash'),
        'corpus_hash': value.get('corpus_hash'), 'patch_hash': value.get('candidate_model_patch_hash'),
        'contact_acks': sum(sum(t['name'] == 'ui.open_contact_form' and 'ui_ack' in t.get('result', {})
            for t in c.get('tools', [])) for c in clients),
        'email_drafts': sum(bool(c.get('actual_core_followup')) for c in clients),
        'writer_corrections': sum(len(c.get('followup_corrections', [])) for c in clients),
        'calibration_artifacts': [a['kind'] for c in clients for a in c.get('calibration_artifacts', [])],
        'failures': [{'id': c['id'], 'checks': [k for k,v in c.get('checks', {}).items() if not v],
            'failure': c.get('failure'), 'failure_reason': c.get('failure_reason')}
            for c in clients if not c.get('checks') or not all(c['checks'].values())],
        'scores': {k: round(sum(c.get('scores', {}).get(k, 0) for c in clients if c.get('scores')) /
            max(1, sum(bool(c.get('scores')) for c in clients)), 2)
            for k in ['relevance', 'factual_accuracy', 'listening', 'useful_next_step', 'email_quality']},
        'report': str(path.relative_to(directory)).replace('\\', '/')}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9-]{1,80}', args.run_id):
        raise ValueError('bounded_run_required')
    directory = ROOT / 'artifacts/network-calibration' / args.run_id
    rows = []
    for site in sorted(SITES):
        knowledge = json.loads((ROOT / 'artifacts/network-calibration/knowledge' / (site + '.json')).read_text(encoding='utf-8'))
        rows.append({'site_id': site, 'host': knowledge['canonical_host'], 'approved_pages': len(knowledge['pages']),
            'knowledge_deployment_id': knowledge['deployment_id'],
            'baseline': phase(directory, site, 'baseline', 12),
            'candidate_regression': phase(directory, site, 'candidate', 2),
            'blind': phase(directory, site, 'blind', 4)})
    supplier_path = directory / 'suppliers/report.json'
    suppliers = json.loads(supplier_path.read_text(encoding='utf-8')) if supplier_path.exists() else {}
    repair_path = directory / 'suppliers-repair/report.json'
    repairs = json.loads(repair_path.read_text(encoding='utf-8')) if repair_path.exists() else {}
    supplier_summary = {'expected': 12, 'completed': len(suppliers.get('clients', [])),
        'initial_passed': sum(all(r['checks'].values()) for r in suppliers.get('clients', [])),
        'repairs': [{'id': r['id'], 'passed': all(r['checks'].values())} for r in repairs.get('clients', [])],
        'actual_get_receipts': sum(len(r.get('tools', [])) for r in suppliers.get('clients', [])),
        'retrieved_get_receipts': sum(t['receipt']['status'] == 'retrieved'
            for r in suppliers.get('clients', []) for t in r.get('tools', [])),
        'discovery': 'operator_public_search', 'retrieval': 'assistant_selected_bounded_public_fetch',
        'smtp_sent': False, 'commercial_partnerships_verified': False}
    report = {'generated_at': datetime.now(UTC).isoformat(), 'run_id': args.run_id, 'sites': rows,
        'all_planned_dialogue_phases_complete': all(r[p]['complete'] for r in rows
            for p in ['baseline', 'candidate_regression', 'blind']), 'supplier_summary': supplier_summary,
        'evaluation': {'engine': 'codex_cli_local_default', 'real_core_state_tools_jobs': True,
            'customer_sees_lab_labels': False, 'same_provider_separate_review_calls': True,
            'human_rubric_alignment_verified': False, 'baseline_holdout_consumed_for_diagnosis': True,
            'candidate_regression_is_not_unseen_evidence': True, 'blind_not_supplied_to_calibrator': True,
            'gemini_live_verified': False, 'audio_verified': False, 'smtp_sent_this_campaign': False,
            'jev_provider_calls': 0, 'jev_routing_activated': False,
            'production_skills_promotion': False, 'real_profit_verified': False}}
    (directory / 'summary.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    table = []
    lines = ['# Nišų aptarnavimo kalibravimas', '', f'Būsena atnaujinta: {report["generated_at"]}.', '',
        '| Svetainė | Patvirtintų puslapių | Pirmas ratas | Tikslinė regresija | Nauji scenarijai |',
        '| --- | ---: | ---: | ---: | ---: |']
    for row in rows:
        cells = []
        for key, folder in [('baseline', 'baseline'), ('candidate_regression', 'candidate'), ('blind', 'blind')]:
            p = row[key]
            text = f"{p['passed']}/{p['expected']}" + (f" · atlikta {p['completed']}" if not p['complete'] else '')
            linestr = f'[{text}]({row["site_id"]}/{folder}/index.html)' if p['completed'] else text
            cells.append(linestr)
        lines.append(f"| {row['host']} | {row['approved_pages']} | " + ' | '.join(cells) + ' |')
        table.append('<tr><td>' + escape(row['host']) + '</td><td>' + str(row['approved_pages']) + '</td>' +
            ''.join(f"<td><a href='{row['site_id']}/{folder}/index.html'>{row[key]['passed']}/{row[key]['expected']}"
                + (f" · atlikta {row[key]['completed']}" if not row[key]['complete'] else '') + '</a></td>'
                for key, folder in [('baseline','baseline'), ('candidate_regression','candidate'), ('blind','blind')]) + '</tr>')
    notes = ('Šešios nišos naudoja tą patį core, atskirus instrukcijų fragmentus ir užšaldytas patvirtintų puslapių projekcijas. '
        'Pirmo rato holdout po diagnozės laikomas panaudotu kalibravimui. Tiksliniai pakartojimai yra regresijos; '
        'nauji blind scenarijai kalibratoriui nepateikti. Dar nebaigta fazė ir nepraėjęs atvejis išlieka matomi. '
        'Čia naudojamas Codex CLI ir tikri core būsenos/įrankių/jobs keliai. Gemini, garsas, žmogaus vertinimo suderinimas, '
        'autonominės tiekėjų derybos ir tikras pelnas neįrodyti. Laiškų juodraščiai šiame rate gavėjams nesiųsti. '
        'Jev adapteris paruoštas, 0 actual provider calls, aktyvaus routerio nėra.')
    lines += ['', notes, '', '## Tiekėjai', '',
        f"Pirmas ratas: {supplier_summary['initial_passed']}/12. HTTP kvitų: {supplier_summary['actual_get_receipts']}, "
        f"sėkmingų: {supplier_summary['retrieved_get_receipts']}. Pakartojimai: {supplier_summary['repairs']}.", '',
        '[Privatūs RFQ juodraščiai](suppliers/index.html). Tiekėjai nekontaktuoti; vieša kaina nėra patvirtintas pasiūlymas.', '',
        '## Išsaugotos pirmo rato klaidos', '']
    for row in rows:
        for key in ['baseline', 'candidate_regression', 'blind']:
            for failure in row[key]['failures']:
                lines.append(f"- {row['host']} / {key} / {failure['id']}: "
                    + ', '.join(failure['checks']) + (f"; {failure['failure']}" if failure['failure'] else ''))
    (directory / 'REPORT.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    html = ('<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
        '<title>Aptarnavimo kalibravimas</title><style>body{font:16px/1.6 system-ui;max-width:1180px;margin:40px auto;'
        'padding:20px;color:#183127;background:#f5f5ef}table{border-collapse:collapse;width:100%;background:white}'
        'td,th{padding:14px;text-align:left;border-bottom:1px solid #d4dbd6}a{color:#146352}.scroll{overflow:auto}'
        'h1{line-height:1.1;font-size:38px}</style><h1>Nišų aptarnavimo kalibravimas</h1>'
        f'<p>{escape(report["generated_at"])}</p><div class="scroll"><table><thead><tr><th>Svetainė</th><th>Puslapiai</th>'
        '<th>Pirmas ratas</th><th>Tikslinė regresija</th><th>Nauji scenarijai</th></tr></thead><tbody>'
        + ''.join(table) + '</tbody></table></div><p>' + escape(notes) + '</p><p>'
        f"Tiekėjų pirmas ratas {supplier_summary['initial_passed']}/12; HTTP kvitų {supplier_summary['actual_get_receipts']}. "
        '<a href="suppliers/index.html">RFQ peržiūra</a> · <a href="suppliers-repair/index.html">Pataisų peržiūra</a>'
        ' · <a href="summary.json">Įrodymai JSON</a></p></html>')
    (directory / 'index.html').write_text(html, encoding='utf-8')
    print(json.dumps({'sites': len(rows), 'complete': report['all_planned_dialogue_phases_complete'],
        'path': str(directory / 'REPORT.md')}))


if __name__ == '__main__':
    main()
