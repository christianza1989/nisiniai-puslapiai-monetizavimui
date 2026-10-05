"""Render saved conversations and automatic learning decisions without rescoring."""
import argparse
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    directory = ROOT / 'artifacts/network-calibration' / args.run_id
    if not directory.resolve().is_relative_to((ROOT / 'artifacts/network-calibration').resolve()):
        raise ValueError('private_saved_report_required')
    summary = json.loads((directory / 'report.json').read_text(encoding='utf-8'))
    cards, sites, counts = [], [], {'primary_cli_calls': 0, 'saved_learning_cli_calls': 0,
        'emails': 0, 'learning_jobs': 0, 'activated': 0, 'rejected': 0, 'incomplete_jobs': 0}
    for result in sorted(summary['results'], key=lambda x: x['site_id']):
        site = result['site_id']
        report = json.loads((directory / site / 'evaluation/report.json').read_text(encoding='utf-8'))
        counts['primary_cli_calls'] += report['cli_calls']
        sites.append(f'<tr><td>{escape(site)}</td><td>{result["passed"]}/{result["completed"]}</td><td>{report["cli_calls"]}</td></tr>')
        for row in report['clients']:
            failed = [name for name, passed in row['checks'].items() if not passed]
            job = row.get('learning_job')
            if job:
                counts['learning_jobs'] += 1
                decision = job.get('decision', {})
                counts['activated'] += bool(decision.get('activated'))
                counts['rejected'] += decision.get('state') == 'rejected'
                counts['incomplete_jobs'] += job['state'] != 'succeeded'
                if job.get('evidence_directory'):
                    evidence = ROOT / job['evidence_directory']
                    for name in ['model-proposal.json', 'incumbent-report.json', 'candidate-report.json']:
                        path = evidence / name
                        if path.exists():
                            counts['saved_learning_cli_calls'] += json.loads(path.read_text(encoding='utf-8')).get('cli_calls', 0)
            email = row.get('actual_core_followup')
            counts['emails'] += bool(email)
            transcript = '\n\n'.join(f'{e["speaker"]}: {e["text"]}' for e in row['history'])
            tools = ', '.join(t['name'] for t in row.get('tools', [])) or 'Įrankių nekviesta'
            details = {'checks': row['checks'], 'quality': row.get('quality'), 'scores': row.get('scores'),
                'learning_job': job, 'received_release_hash': row.get('received_release_hash')}
            cards.append(f'<article><h2>{escape(site)} · {escape(row["id"])}</h2>'
                f'<p>{"PASS" if not failed else "FAIL: " + escape(", ".join(failed))} · {escape(row["split"])}</p>'
                f'<p>Įrankiai: {escape(tools)}</p><details><summary>Pokalbis</summary><pre>{escape(transcript)}</pre></details>'
                f'<h3>Laiškas klientui</h3><pre>{escape(email["body"] if email else "El. laiškas nerengiamas.")}</pre>'
                f'<details><summary>Kokybė ir mokymasis</summary><pre>{escape(json.dumps(details, ensure_ascii=False, indent=2))}</pre></details></article>')
    receipt = {'run_id': args.run_id, 'completed': summary['completed'], 'passed': summary['passed'],
        'all_complete': summary['sites_finished'] == 6 and summary['completed'] == 36,
        **counts, 'source_match': summary['source_hashes_still_match'],
        'corpus_match': summary['protected_corpus_still_matches'], 'knowledge_match': summary['knowledge_still_matches'],
        'smtp_sent': False, 'supplier_contacted': False, 'audio_verified': False}
    (directory / 'acceptance-summary.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    style = '<style>body{font:16px/1.6 system-ui;max-width:1100px;margin:40px auto;padding:0 20px;background:#f3f4ed;color:#24332c}article{background:#fff;padding:24px;margin:24px 0;border:1px solid #cdd5cd;border-radius:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.6 system-ui}td,th{padding:8px 20px;text-align:left}summary{cursor:pointer}</style>'
    html = '<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
    html += '<title>Agentų mokymosi ir aptarnavimo peržiūra</title>' + style + '<h1>Agentų mokymosi ir aptarnavimo peržiūra</h1>'
    html += f'<p>{summary["passed"]}/{summary["completed"]} užbaigtų scenarijų išlaikė vartus. 18 žinomų ir 18 naujų papildomų scenarijų; nepriklausomo žmogaus aklas vertinimas neatliktas.</p>'
    html += '<p>Tikri core įrankiai ir darbų eilė, tekstinis Codex modelis. Laiškai parengti vietoje, gavėjams nesiųsti; Gemini garso kokybė nematuota.</p>'
    html += '<table><thead><tr><th>Niša</th><th>Išlaikyta</th><th>Pagrindiniai CLI kvietimai</th></tr></thead><tbody>' + ''.join(sites) + '</tbody></table>'
    html += '<details><summary>Vykdymo suvestinė</summary><pre>' + escape(json.dumps(receipt, ensure_ascii=False, indent=2)) + '</pre></details>'
    (directory / 'index.html').write_text(html + ''.join(cards) + '</html>', encoding='utf-8')
    print(json.dumps(receipt))


if __name__ == '__main__':
    main()
