"""Read saved observation evidence and render a review, without changing scores."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'artifacts/network-calibration/network-20261003-v6-hard-clients-complete'
CONTROL = ROOT / 'artifacts/network-calibration/network-20261003-learning-negative-control-r3/report.json'


def pretty(value):
    return '<pre>' + escape(json.dumps(value, ensure_ascii=False, indent=2)) + '</pre>'


def main():
    report = json.loads((BASE / 'report.json').read_text(encoding='utf-8'))
    if report['completed'] != 18 or report['sites_finished'] != 6:
        raise ValueError('complete_observation_required')
    site_rows, rows = [], []
    summary = {'completed': report['completed'], 'original_gate_passed': report['passed'],
        'instruction_changed_files': report['changed_files'],
        'source_hashes_still_match': report['source_hashes_still_match'],
        'corpus_hashes_still_match': report['corpus_hashes_still_match'],
        'cli_calls_are_lower_bound': True, 'first_run_complete_exports': 17, 'continuation_complete_exports': 1,
        'cli_calls': 0, 'jev_calls': 0, 'emails_prepared': 0, 'followup_rejected_drafts': 0,
        'quality_issue_cases': 0, 'candidates': 0, 'activated_candidates': 0, 'timeout_recoveries': 0}
    for site in report['core_sites']:
        path = BASE / site / 'evaluation/report.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        summary['cli_calls'] += data['cli_calls']
        summary['jev_calls'] += data['jev_provider_attempts']
        summary['timeout_recoveries'] += len(data['cli_timeout_recoveries'])
        passed = sum(bool(r.get('checks')) and all(r['checks'].values()) for r in data['clients'])
        issues = sum(bool(r.get('quality', {}).get('issues')) for r in data['clients'])
        count = sum(len(r.get('learning_observation', {}).get('candidates', [])) for r in data['clients'])
        site_rows.append(f'<tr><td>{escape(site)}.lt</td><td>{passed}/3</td><td>{issues}</td><td>{count}</td></tr>')
        for row in data['clients']:
            observation = row.get('learning_observation', {})
            summary['emails_prepared'] += 'actual_core_followup' in row
            summary['followup_rejected_drafts'] += len(row.get('followup_corrections', []))
            summary['quality_issue_cases'] += bool(row.get('quality', {}).get('issues'))
            summary['candidates'] += len(observation.get('candidates', []))
            summary['activated_candidates'] += sum(bool(c['payload'].get('activated')) for c in observation.get('candidates', []))
            failed = [k for k, v in row.get('checks', {}).items() if not v]
            special = ('<p class="note">Atskira operatoriaus diagnozė: įrašas „Renkuosi marmurą“ '
                'teisingai pakeitė granitą. Tikrintuvas reikalavo tikslios eilutės „marmuras“. '
                'Originalus FAIL paliktas nepakeistas; tai palyginimo trūkumas.</p>') if site == 'akmenas' and row['id'] == 'correction_contact_and_language' else ''
            history = ''.join('<p class="speaker">' + escape(h['speaker']) + '</p><pre>' + escape(h['text']) + '</pre>' for h in row.get('history', []))
            email = row.get('actual_core_followup', {})
            letter = '<h3>' + escape(email.get('subject', 'Laiškas nerengiamas')) + '</h3><pre>' + escape(email.get('body', 'El. pašto kontakto nėra.')) + '</pre>'
            rows.append(f'<article><h2>{escape(site)} · {escape(row["id"])}</h2>'
                f'<p>Originalūs vartai: {"FAIL" if failed else "PASS"}. Nepraėję: {escape(", ".join(failed)) or "—"}.</p>'
                + special + '<details><summary>Pokalbis</summary>' + history + '</details>' + letter
                + '<details><summary>Kokybė ir automatinio mokymosi artefaktai</summary>'
                + pretty({'quality': row.get('quality'), 'scores': row.get('scores'),
                    'calibration_artifacts': row.get('calibration_artifacts'),
                    'changed_files': observation.get('changed_files'),
                    'local_adaptive_reader_selected': observation.get('local_adaptive_reader_selected'),
                    'followup_corrections': row.get('followup_corrections')}) + '</details></article>')
    if CONTROL.exists():
        control = json.loads(CONTROL.read_text(encoding='utf-8'))
        summary['separate_negative_control'] = {'cli_calls': control['cli_calls'],
            'quality': control['row'].get('quality'),
            'candidate_count': len(control['learning_observation']['candidates']),
            'static_evaluations': control['learning_observation']['static_evaluations'],
            'changed_files': control['changed_files'],
            'next_session_prompt_changed': control.get('next_session_prompt_changed'),
            'source_hashes_still_match': control['source_hashes_still_match']}
        manual = CONTROL.parent / 'manual-observation.json'
        if manual.exists():
            summary['separate_negative_control']['manual_observation'] = json.loads(manual.read_text(encoding='utf-8'))
    (BASE / 'observation-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    style = '<style>body{font:16px/1.55 system-ui;max-width:1100px;margin:36px auto;padding:0 20px;background:#f5f5ef;color:#22302b}article{background:white;padding:24px;margin:24px 0;border:1px solid #ccd2cd;border-radius:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.6 system-ui}summary{cursor:pointer;font-weight:600;padding:8px 0}table{border-collapse:collapse;width:100%}td,th{padding:10px;text-align:left;border-bottom:1px solid #ccd2cd}.note{background:#fff0cc;padding:14px}.speaker{font-weight:700}h1{line-height:1.2}</style>'
    html = '<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Agentų autonomijos stebėjimas · 2026-10-03</title>' + style
    html += '<h1>Sunkių klientų ir mokymosi stebėjimas</h1><p>2026-10-03 · 18 naujų pokalbių · 6 registruotos nišos. Tikros core sesijos, įrankiai, kontaktų kvitai ir po pokalbio darbai; tekstą generavo Codex CLI. Gemini garso kanalas čia nepatikrintas. Laiškai parengti vietoje, gavėjams nesiųsti.</p>'
    html += '<p>Agentai patys rengė laiškų pataisas ir instrukcijų kandidatus. MD failų ar aktyvių instrukcijų pakeitimų nenustatyta. Semantinio palyginimo ir aktyvavimo automatinė grandinė neprijungta.</p>'
    html += '<p class="note">Senos klaidos kontroliniame atkūrime vertintojas praleido kvietimą įvesti jau išsaugotą el. paštą ir skyrė aukštus balus. Originalūs balai išsaugoti, operatoriaus neatitikimo diagnozė pateikiama atskirai. Automatinis PASS nėra visų aptarnavimo klaidų nebuvimo įrodymas.</p>'
    html += '<table><thead><tr><th>Niša</th><th>Originalūs vartai</th><th>Kokybės klaidų atvejai</th><th>Kandidatai</th></tr></thead><tbody>' + ''.join(site_rows) + '</tbody></table>'
    html += '<p>Miniekskavatoriai.lt neįtrauktas: dar nėra registruoto šios nišos core profilio. Akmenas.lt vienas FAIL yra tikrintuvo tikslaus teksto palyginimo trūkumas; originalus rezultatas nekeičiamas.</p>'
    html += '<p>Suvestinėje 17 užbaigtų pirmo vykdymo pokalbių ir vienas po pertrūkio atskirai pakartotas paskutinis scenarijus. Originalūs failai bei balai išsaugoti. CLI kvietimų suma yra išsaugotų kvitų apatinė riba; neužbaigtų vykdymų kvietimų kiekis nežinomas.</p>'
    html += '<details><summary>Matavimų suvestinė ir atskiras senos klaidos kontrolinis atkūrimas</summary>' + pretty(summary) + '</details>'
    html += ''.join(rows) + '</html>'
    (BASE / 'index.html').write_text(html, encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == '__main__':
    main()
