"""Aggregate frozen original cohorts; targeted repeats never replace their failures."""
import json
from datetime import UTC, datetime
from html import escape
from pathlib import Path

from network_report import phase

from pinet_core.agent_instructions import SITES

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts/network-calibration'
COHORTS = [('baseline', 'network-20261001-v1', 'baseline', 12),
    ('append_v1', 'network-20261001-v1', 'candidate', 2),
    ('append_v2', 'network-20261001-v2', 'candidate', 2),
    ('final_evaluation', 'network-20261001-final', 'evaluation', 6)]


def passed(row):
    return bool(row.get('checks')) and all(row['checks'].values())


def cohort(run, site, name, expected):
    summary = phase(ARTIFACTS / run, site, name, expected)
    summary['report'] = run + '/' + summary.get('report', f'{site}/{name}/report.json')
    path = ARTIFACTS / summary['report']
    blind = []
    if path.exists():
        value = json.loads(path.read_text(encoding='utf-8'))
        blind = [c for c in value.get('clients', []) if c.get('split') == 'blind']
    summary['unseen_scenarios'], summary['unseen_passed'] = len(blind), sum(map(passed, blind))
    return summary


def main():
    directory = ARTIFACTS / 'network-20261001-summary'
    directory.mkdir(exist_ok=True)
    rows = []
    for site in sorted(SITES):
        knowledge = json.loads((ARTIFACTS / 'knowledge' / (site + '.json')).read_text(encoding='utf-8'))
        rows.append({'site_id': site, 'host': knowledge['canonical_host'],
            'approved_pages': len(knowledge['pages']), 'knowledge_deployment_id': knowledge['deployment_id'],
            **{key: cohort(run, site, name, expected) for key, run, name, expected in COHORTS}})
    totals = {key: {'completed': sum(r[key]['completed'] for r in rows),
        'passed': sum(r[key]['passed'] for r in rows), 'expected': 6 * expected}
        for key, _, _, expected in COHORTS}
    final_unseen = {'completed': sum(r['final_evaluation']['unseen_scenarios'] for r in rows),
        'passed': sum(r['final_evaluation']['unseen_passed'] for r in rows), 'expected': 24}
    supplier = json.loads((ARTIFACTS / 'network-20261001-v1/suppliers/report.json').read_text(encoding='utf-8'))
    repair = json.loads((ARTIFACTS / 'network-20261001-v1/suppliers-repair/report.json').read_text(encoding='utf-8'))
    supplier_summary = {'initial_passed': sum(map(passed, supplier['clients'])), 'expected': 12,
        'repairs': [{'id': r['id'], 'passed': passed(r)} for r in repair['clients']],
        'http_get_receipts': sum(len(r.get('tools', [])) for r in supplier['clients']),
        'retrieved': sum(t['receipt']['status'] == 'retrieved'
            for r in supplier['clients'] for t in r.get('tools', [])),
        'source_discovery': 'operator_public_search', 'retrieval': 'assistant_selected_bounded_public_fetch',
        'smtp_sent': False, 'commercial_partnerships_verified': False}
    regressions = [{'run': run, 'site': site, **cohort(run, site, name, expected)} for run, site, name, expected in [
        ('network-20261001-diagnostic', 'greitossvetaines', 'baseline', 1),
        ('network-20261001-contract-repair', 'greitossvetaines', 'evaluation', 1),
        ('network-20261001-contract-repair', 'akmenas', 'evaluation', 1),
        ('network-20261001-count-repair', 'greitossvetaines', 'evaluation', 1)]]
    report = {'generated_at': datetime.now(UTC).isoformat(), 'sites': rows, 'totals': totals,
        'final_unseen': final_unseen, 'targeted_regressions': regressions, 'supplier_summary': supplier_summary,
        'planned_dialogue_cohorts_complete': all(r[key]['complete'] for r in rows for key, *_ in COHORTS),
        'evaluation': {'engine': 'codex_cli_local_default', 'real_core_state_tools_jobs': True,
            'dialogue_has_no_test_labels': True, 'administrative_artifacts_have_test_metadata': True,
            'same_provider_separate_review_calls': True, 'human_rubric_alignment_verified': False,
            'baseline_holdout_consumed_for_diagnosis': True, 'candidate_regression_is_unseen': False,
            'blind_supplied_to_patch_calibrator': False, 'blind_read_after_cohort_for_diagnosis': True,
            'gemini_live_verified': False, 'audio_verified': False, 'smtp_sent_this_campaign': False,
            'jev_provider_calls': 0, 'jev_routing_mounted': False, 'automatic_candidate_activation': False,
            'operator_core_instruction_repairs': True, 'real_profit_verified': False}}
    (directory / 'summary.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    notes = ('Naudotas Codex CLI ir tikri core būsenos, įrankių, UI ACK, kontaktų bei post-call jobs keliai. '
        '96 unikalūs klientų scenarijai: 72 baziniai ir 24 nauji blind; galutiniame rate papildomai '
        'kartota 12 jau diagnozuotų kalbos / telefono atvejų. Pirmų rezultatų klaidos išlieka. '
        'Dviejų append kandidatų aktyvavimo nėra. Bendras kalbos / formos instrukcijas pataisė vykdantis agentas. '
        'Po galutinio rato pataisyti count / evidence kontraktai, vertintojui pridėtas tikras kontakto laikas; '
        'pakartojimai yra regresija, ne naujas blind įrodymas. Gemini Live, garsas ir žmogaus vertinimo '
        'suderinimas nepatikrinti. Šios kampanijos laiškai išsaugoti vietoje, klientams ir tiekėjams nesiųsti. '
        'Jev adapteris paruoštas, tačiau prie pokalbių neprijungtas: 0 tikrų Jev API kvietimų.')
    lines = ['# Šešių nišų agentų kalibravimo rezultatai', '', f'Atnaujinta {report["generated_at"]}.', '', notes, '',
        '| Svetainė | Puslapiai | Bazinis ratas | Kandidatas 1 | Kandidatas 2 | Galutinis ratas | Nauji blind |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    html_rows = []
    for row in rows:
        cells, html_cells = [], []
        for key, *_ in COHORTS:
            p = row[key]
            label = f"{p['passed']}/{p['expected']}"
            view = p['report'].removesuffix('report.json') + 'index.html'
            cells.append(f'[{label}](../{view})')
            html_cells.append(f"<td><a href='../{view}'>{label}</a></td>")
        blind_label = f"{row['final_evaluation']['unseen_passed']}/4"
        lines.append(f"| {row['host']} | {row['approved_pages']} | " + ' | '.join(cells) + f' | {blind_label} |')
        html_rows.append('<tr><td>' + escape(row['host']) + '</td><td>' + str(row['approved_pages']) + '</td>' +
            ''.join(html_cells) + '<td>' + blind_label + '</td></tr>')
    lines += ['', f"Galutinio rato griežtas rezultatas: {totals['final_evaluation']['passed']}/36. "
        f"Nauji blind: {final_unseen['passed']}/24.", '', '## Tikslinės regresijos', '']
    for r in regressions:
        lines.append(f"- {r['run']} / {r['site']}: {r['passed']}/{r['expected']}; atlikta {r['completed']}. " +
            f"[JSON](../{r['report']}).")
    lines += ['', '## Viešų tiekėjų šaltinių skaitymas', '',
        f"Pradinis rezultatas {supplier_summary['initial_passed']}/12; vienas nepraėjęs atvejis "
        f"pakartotas atskirai: {supplier_summary['repairs']}. "
        f"Tikri HTTP GET kvitai {supplier_summary['http_get_receipts']}, sėkmingi {supplier_summary['retrieved']}.", '',
        '[RFQ juodraščiai](../network-20261001-v1/suppliers/index.html). '
        'Agentas pasirinko riboto katalogo šaltinius ir kvietė tikrą fetch įrankį; '
        'pradinį šaltinių katalogą atrinko vykdantis agentas. '
        'Tai nėra autonominės viso interneto paieškos, partnerystės, tiekėjo atsakymo ar sandorio įrodymas.', '',
        '## Išsaugotos originalių ratų klaidos', '']
    for row in rows:
        for key, *_ in COHORTS:
            for failure in row[key]['failures']:
                lines.append(f"- {row['host']} / {key} / {failure['id']}: " + ', '.join(failure['checks']) +
                    (f"; {failure['failure']} ({failure['failure_reason']})" if failure['failure'] else ''))
    (directory / 'REPORT.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    html = ('<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
        '<title>Nišų agentų kalibravimas</title><style>body{font:16px/1.6 system-ui;max-width:1200px;'
        'margin:32px auto;padding:20px;background:#f5f5ef;color:#183127}table{width:100%;border-collapse:collapse;'
        'background:white}td,th{padding:12px;text-align:left;border-bottom:1px solid #ddd}a{color:#146352}'
        '.scroll{overflow:auto}</style><h1>Šešių nišų agentų kalibravimas</h1><p>' + escape(notes) +
        '</p><div class="scroll"><table><thead><tr><th>Svetainė</th><th>Puslapiai</th><th>Bazinis</th>'
        '<th>Kandidatas 1</th><th>Kandidatas 2</th><th>Galutinis</th><th>Blind</th></tr></thead><tbody>' +
        ''.join(html_rows) + '</tbody></table></div><p>' +
        '<a href="REPORT.md">Visa ataskaita ir originalios klaidos</a> · <a href="summary.json">JSON įrodymai</a>'
        ' · <a href="../network-20261001-v1/suppliers/index.html">Tiekėjų juodraščiai</a></p></html>')
    (directory / 'index.html').write_text(html, encoding='utf-8')
    print(json.dumps({'path': str(directory / 'REPORT.md'), 'totals': totals, 'unseen': final_unseen,
        'supplier_summary': supplier_summary}, ensure_ascii=False))


if __name__ == '__main__':
    main()
