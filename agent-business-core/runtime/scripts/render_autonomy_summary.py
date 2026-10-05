"""Read saved evidence; do not rerun judges or change historical scores."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NETWORK = ROOT / 'artifacts/network-calibration'
MAIN = NETWORK / 'network-20261003-v9-autonomous-all-niches'
OUTPUT = NETWORK / 'autonomy-20261003-summary'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def link(path, label):
    import os
    relative = os.path.relpath(path, OUTPUT).replace('\\', '/')
    return '<a href="' + escape(relative, quote=True) + '">' + escape(label) + '</a>'


def main():
    OUTPUT.mkdir(exist_ok=True)
    original = read(MAIN / 'report.json')
    photo_path = NETWORK / 'network-20261003-v12-photo-learning/report.json'
    photo = read(photo_path) if photo_path.exists() else {}
    regression_path = NETWORK / 'network-20261003-v12-photo-regression/greitossvetaines/evaluation/report.json'
    regression = read(regression_path) if regression_path.exists() else {}
    background_path = ROOT / 'artifacts/learning-verification/network-20261003-background-http-postcall/report.json'
    background = read(background_path) if background_path.exists() else {}
    sites = []
    for result in sorted(original['results'], key=lambda value: value['site_id']):
        note = 'Pagrindiniai vartai išlaikyti.'
        if result['site_id'] == 'akmenas':
            note = 'Automatinė instrukcija; žinomos klaidos vėlesnė regresija 1/1.'
        if result['site_id'] == 'greitossvetaines':
            note = 'Foto reikalavimo patikra: '
            note += ('1/1 vėlesnė regresija.' if regression.get('all_checks_pass') else 'vėlesnės regresijos rezultatas dar laukiamas.')
        sites.append('<tr><td>' + escape(result['site_id']) + '</td><td>' +
            str(result['passed']) + '/' + str(result['completed']) + '</td><td>' + escape(note) + '</td></tr>')
    jobs = []
    for job_id in ['4e8045b1-44ed-491b-a54c-bc0347cd76a5', '18838df7-5329-4cc9-b6fa-7c045e61c772',
            'ac130646-ad7b-4c89-a070-ae4a458d69ef', '4524179d-f6d7-4741-9e26-bf439b215b6c']:
        directory = ROOT / 'artifacts/learning-jobs' / job_id / '1'
        path = directory / 'decision.json'
        if not path.exists():
            continue
        decision = read(path)
        contract = read(directory / 'contract.json')
        rows = []
        for variant in ['incumbent', 'candidate']:
            report_path = directory / (variant + '-report.json')
            if report_path.exists():
                report = read(report_path)
                for row in report['clients']:
                    transcript = '\n\n'.join(event['speaker'] + ': ' + event['text'] for event in row['history'])
                    email = row.get('actual_core_followup')
                    rows.append('<details><summary>' + escape(variant + ' · ' + row['id']) +
                        ' · ' + ('PASS' if all(row['checks'].values()) else 'FAIL') + '</summary><pre>' +
                        escape(transcript) + '</pre><h4>Laiškas klientui</h4><pre>' +
                        escape(email['body'] if email else 'El. laiškas nerengiamas.') +
                        '</pre><pre>' + escape(json.dumps(row['checks'], ensure_ascii=False, indent=2)) + '</pre></details>')
        jobs.append('<article><h3>' + escape(contract['site_id']) + '</h3><p>' +
            escape(str(decision.get('incumbent_pass', '?')) + ' → ' + str(decision.get('candidate_pass', '?')) +
                ' · ' + decision['state'] + ' · activated=' + str(decision.get('activated', False))) +
            '</p><p>' + link(path, 'Originalus sprendimas') + ' · ' + link(directory / 'contract.json', 'Kontraktas') +
            '</p><details><summary>Sprendimo įrodymai</summary><pre>' + escape(json.dumps(decision, ensure_ascii=False, indent=2)) +
            '</pre></details><details><summary>Visi palyginimo dialogai ir laiškai</summary>' + ''.join(rows) + '</details></article>')
    receipt = {'original_completed': original['completed'], 'original_passed': original['passed'],
        'original_reports_rewritten_by_renderer': False, 'photo_learning': photo.get('learning_job'),
        'photo_regression_complete': regression.get('complete', False),
        'photo_regression_pass': regression.get('all_checks_pass', False),
        'smtp_sent': False, 'supplier_contacted': False, 'gemini_audio_verified': False,
        'source': 'saved_evidence_only', 'background_http_checks': background.get('checks'),
        'runtime_proof': read(ROOT / 'artifacts/local-processes/final-runtime-proof.json')}
    (OUTPUT / 'summary.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding='utf-8')
    style = '<style>body{font:16px/1.65 system-ui;background:#eef2ef;color:#20372b;max-width:1120px;margin:40px auto;padding:0 24px}article{background:white;border:1px solid #c8d4ca;border-radius:12px;padding:24px;margin:24px 0}td,th{text-align:left;padding:12px;border-bottom:1px solid #bbc9c1}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.65 system-ui}details{padding:12px 0}summary{cursor:pointer;font-weight:600}a{color:#176844}table{width:100%}</style>'
    html = '<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Agentų autonomijos patikra</title>' + style
    html += '<h1>Agentų aptarnavimas ir savarankiškas mokymasis</h1><p>2026-10-03 · Šešios prijungtos nišos · Tikri core tools / DB / jobs · Tekstinis Codex kanalas</p>'
    html += '<article><h2>Rezultatai ir jų ribos</h2><p>Pagrindinis ratas 34/36. Vėlesnės pataisų regresijos pateikiamos atskirai; pradiniai FAIL neperrašyti. Miniekskavatoriai dar neturi agentų core profilio.</p><p>Laiškų turinys profesionalus ir skirtas klientui, tačiau šio rato laiškai gavėjams nesiųsti. Gemini garso, tiekėjų derybų ir apmokėjimo patikra neatlikta.</p><p>'
    html += link(MAIN / 'index.html', 'Visi 36 pagrindinio rato dialogai ir laiškai') + '</p><table><tr><th>Niša</th><th>Pradinis ratas</th><th>Po radinio</th></tr>' + ''.join(sites) + '</table></article>'
    html += '<article><h2>Kaip mokomasi</h2><p>Kokybės klaida → modelio elgesio kandidatas → apsaugotas dabartinės ir kandidato versijų palyginimas → tik pagerėjus aktyvuojama nišos instrukcija → kitas pokalbis gauna naują versiją.</p><p>Nauji darbai: septyni unikalūs scenarijai, po du pakartojimus kiekvienai versijai, bent trys nematyti holdout. Visi 14 kandidato stebėjimų turi išlaikyti vartus. Modelis negali redaguoti faktų, įrankių leidimų ar vertintojo.</p><p>Žinių helperis kas 60s iš naujo projektuoja dabartinį patvirtintą viešo core turinį; šešios nišos turi šviežias vietines žinias.</p></article>'
    html += '<h2>Automatiniai sprendimai ir originalūs palyginimai</h2>' + ''.join(jobs)
    if background.get('complete'):
        history = '\n\n'.join(event['speaker'] + ': ' + event['text'] for event in background['row']['history'])
        email = background['artifacts']['followup']
        html += '<article><h2>Veikiančios API ir foninės eilės bandymas</h2><p>9/9 patikrų. Pokalbis per tikrą vietinę HTTP API; postcall darbus atliko paleistas worker, be kalibratoriaus pakeitimo. SMTP išjungtas.</p>'
        html += '<details><summary>Pokalbis ir kontaktų kvitai</summary><pre>' + escape(history) + '</pre></details>'
        html += '<h3>' + escape(email['subject']) + '</h3><pre>' + escape(email['body']) + '</pre><p>' + link(background_path, 'Originalus foninės eilės įrodymas') + '</p></article>'
    html += '<details><summary>Suvestinės JSON ir runtime patikra</summary><pre>' + escape(json.dumps(receipt, ensure_ascii=False, indent=2)) + '</pre></details></html>'
    (OUTPUT / 'index.html').write_text(html, encoding='utf-8')
    print(json.dumps({'directory': str(OUTPUT), 'jobs': len(jobs), 'original': str(original['passed']) + '/' + str(original['completed'])}))


if __name__ == '__main__':
    main()
