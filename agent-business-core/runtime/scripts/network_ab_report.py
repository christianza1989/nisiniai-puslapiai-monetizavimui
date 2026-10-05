"""Paired results with missing cohorts, failed gates and extra Jev cost kept visible."""
import json
import math
import statistics
from collections import Counter
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path

from pinet_core.agent_instructions import compose
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts/network-calibration'
DIRECTORY = ARTIFACTS / 'network-20261001-v3-paired'


def passed(row):
    return bool(row.get('checks')) and all(row['checks'].values())


def load(site, arm):
    path = ARTIFACTS / f'network-20261001-v3-{arm}' / site / 'blind/report.json'
    data = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    clients = data.get('clients', [])
    decisions = [d for row in clients for d in row.get('routing_decisions', [])]
    latencies = sorted(d['latency_ms'] for d in decisions if 'latency_ms' in d)
    usage = data.get('cli_usage', [])
    log = DIRECTORY / f'{site}-{arm}.log'
    stat = log.stat() if log.exists() else None
    result = {'expected': 8, 'completed': len(clients), 'passed': sum(map(passed, clients)),
        'complete': len(clients) == 8, 'cli_calls': data.get('cli_calls', 0),
        'cli_tokens': {key: sum(u.get(key,0) for u in usage)
            for key in ['input_tokens', 'cached_input_tokens', 'output_tokens']},
        'jev_provider_attempts': data.get('jev_provider_attempts',0),
        'jev_verified_receipts': sum(bool(d.get('live_provider_verified')) for d in decisions),
        'jev_attempts_without_saved_receipt': max(0, data.get('jev_provider_attempts',0)
            -sum(bool(d.get('live_provider_verified')) for d in decisions)),
        'jev_known_cost_microusd': sum(d.get('cost_microusd',0) for d in decisions),
        'jev_unknown_cost_reservations': sum(bool(d.get('reservation_retained')) for d in decisions),
        'routing_statuses': dict(Counter(d.get('status','unknown') for d in decisions)),
        'hints_supplied_to_model': sum(t['name']=='routing.hint' for row in clients for t in row.get('tools', [])),
        'p50_jev_ms': statistics.median(latencies) if latencies else None,
        'p95_jev_ms': latencies[math.ceil(.95*len(latencies))-1] if latencies else None,
        'cohort_log_wall_seconds': round(max(0,stat.st_mtime-getattr(stat,'st_birthtime',stat.st_ctime)),2) if stat else None,
        'failures': [{'id': c['id'], 'checks': [key for key,value in c.get('checks',{}).items() if not value],
            'failure': c.get('failure'), 'failure_reason': c.get('failure_reason')}
            for c in clients if not passed(c)],
        'mean_scores': {key: round(statistics.mean(c['scores'][key] for c in clients if 'scores' in c), 3)
            if any('scores' in c for c in clients) else None for key in [
                'relevance', 'factual_accuracy', 'listening', 'useful_next_step', 'email_quality']},
        'instruction_hash': data.get('instruction_hash'), 'corpus_hash': data.get('corpus_hash'),
        'view': str(path.with_name('index.html').relative_to(ARTIFACTS)).replace('\\','/')}
    return result, {c['id']:c for c in clients}


def main():
    manifest = json.loads((DIRECTORY/'frozen-contract.json').read_text(encoding='utf-8'))
    rows = []
    for site in manifest['sites']:
        off, off_cases = load(site,'off')
        on, on_cases = load(site,'on')
        ids = set(off_cases)&set(on_cases)
        pairs = Counter('both_pass' if passed(off_cases[i]) and passed(on_cases[i]) else
            'on_only_pass' if passed(on_cases[i]) else 'off_only_pass' if passed(off_cases[i]) else
            'neither_pass' for i in ids)
        rows.append({'site_id':site,'off':off,'on':on,'paired_scenarios':len(ids),'pairs':dict(pairs)})
    source_checks = {name: digest((ROOT/name).read_text(encoding='utf-8')) == expected
        for name, expected in manifest['source_hashes'].items()}
    instruction_checks = {site: {role: compose(site, role).hash == expected for role, expected in roles.items()}
        for site, roles in manifest['instructions'].items()}
    corpus_checks = {row['site_id']: {arm: row[arm]['corpus_hash'] == digest(
        (ROOT/manifest['corpus_dir']/(row['site_id']+'.json')).read_text(encoding='utf-8'))
        if row[arm]['completed'] else None for arm in ['off','on']} for row in rows}
    # This campaign is dated 2026-10-01, when Vilnius uses UTC+03:00.
    report = {'generated_at':datetime.now(timezone(timedelta(hours=3))).isoformat(),
        'timezone':'Europe/Vilnius', 'campaign_utc_offset':'+03:00',
        'sites':rows,'planned_unique_scenarios':8*len(rows),'planned_runs':16*len(rows),
        'freeze_verification': {'source_hashes':source_checks, 'instructions':instruction_checks,
            'corpus_vs_saved_runs':corpus_checks},
        'complete':all(row[arm]['complete'] for row in rows for arm in ['off','on']),
        'totals':{arm:{'completed':sum(row[arm]['completed'] for row in rows),
            'passed':sum(row[arm]['passed'] for row in rows),
            'jev_attempts':sum(row[arm]['jev_provider_attempts'] for row in rows),
            'jev_known_cost_microusd':sum(row[arm]['jev_known_cost_microusd'] for row in rows),
            'jev_attempts_without_saved_receipt':sum(row[arm]['jev_attempts_without_saved_receipt'] for row in rows),
            'hints_supplied':sum(row[arm]['hints_supplied_to_model'] for row in rows)} for arm in ['off','on']},
        'boundaries':{'same_frozen_corpus':all(value is not False for checks in corpus_checks.values() for value in checks.values()),
            'same_instruction_versions':all(all(checks.values()) for checks in instruction_checks.values()),
            'frozen_source_unchanged':all(source_checks.values()),
            'balanced_arm_order':True,'one_run_per_case_per_arm':True,'model_stochasticity_controlled':False,
            'human_rubric_alignment_verified':False,'audio_gemini_verified':False,
            'cli_cost_usd_verified':False,'jev_cost_from_provider_receipts':True,
            'per_turn_end_to_end_latency_instrumented':False,'hard_router_actions':False,
            'smtp_sent':False,'real_profit_verified':False}}
    (DIRECTORY/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    notes = ('48 nauji scenarijai, tie patys atvejai abiem režimams. Įvestys / faktai / instrukcijos '
        'užfiksuoti prieš ratą; neišjungti kokybės vartai. Tai vienas stokastinio Codex CLI paleidimas kiekvienam '
        'atvejui ir režimui, ne statistinis ar Gemini balso pranašumo įrodymas. '
        'Jev užuomina perduota modeliui nereiškia, kad jis ja pasinaudojo; tiesioginių Jev veiksmų nėra. '
        'Kainą skaičiuojame iš tikrų Jev kvitų; CLI turi tokenų kvitus, bet USD kainos nepatvirtintos. '
        'Jev p50/p95 nėra viso pokalbio delsa; cohort wall iš log failų yra bendro vykdymo apytikslis matas. '
        'Šio rato laiškai liko vietiniais klientų juodraščiais, SMTP nesiųsti.')
    lines = ['# Jev ON/OFF palyginimas', '', report['generated_at'], '',
        '**Baigta**' if report['complete'] else '**Vyksta – ne visi rezultatai gauti**', '', notes, '',
        '| Niša | OFF praėjo / atlikta | ON praėjo / atlikta | Tik ON PASS | Tik OFF PASS | ON hint paketai | ON API kvietimai |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    html_rows=[]
    for row in rows:
        off,on=row['off'],row['on']
        lines.append(f"| {row['site_id']} | {off['passed']}/{off['completed']} | {on['passed']}/{on['completed']} | "
            f"{row['pairs'].get('on_only_pass',0)} | {row['pairs'].get('off_only_pass',0)} | "
            f"{on['hints_supplied_to_model']} | {on['jev_provider_attempts']} |")
        html_rows.append('<tr><td>'+escape(row['site_id'])+'</td>'+''.join(
            f"<td><a href='../{row[arm]['view']}'>{row[arm]['passed']}/{row[arm]['completed']}</a></td>"
            for arm in ['off','on'])+f"<td>{on['hints_supplied_to_model']}</td><td>{on['jev_provider_attempts']}</td></tr>")
    total = report['totals']
    total_text = (f"OFF {total['off']['passed']}/{total['off']['completed']}; "
        f"ON {total['on']['passed']}/{total['on']['completed']}. "
        f"ON Jev žinoma kaina ${total['on']['jev_known_cost_microusd']/1_000_000:.6f}; "
        f"OFF API kvietimai {total['off']['jev_attempts']}; "
        f"ON API kvietimai {total['on']['jev_attempts']}, modeliui perduoti hint paketai {total['on']['hints_supplied']}.")
    total_text += (f" ON kvietimai be išsaugoto patikrinamo kvito: {total['on']['jev_attempts_without_saved_receipt']}; "
        'jų faktinė kaina neįtraukta, todėl žinoma suma nėra visų API kvietimų sąskaita.')
    lines += ['', total_text, '', '## Jev providerio matavimai', '',
        '| Niša | Patikrinti kvitai | p50 ms | p95 ms | Žinoma kaina USD |',
        '| --- | ---: | ---: | ---: | ---: |']
    for row in rows:
        on = row['on']
        lines.append(f"| {row['site_id']} | {on['jev_verified_receipts']} | {on['p50_jev_ms']} | "
            f"{on['p95_jev_ms']} | {on['jev_known_cost_microusd']/1_000_000:.6f} |")
    lines+=['','## Išsaugotos klaidos','']
    for row in rows:
        for arm in ['off','on']:
            for failure in row[arm]['failures']:
                lines.append(f"- {row['site_id']} / {arm} / {failure['id']}: "+', '.join(failure['checks'])+
                    (f"; {failure['failure']} / {failure['failure_reason']}" if failure['failure'] else ''))
    (DIRECTORY/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    html='<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Jev ON/OFF</title><style>body{font:16px/1.6 system-ui;margin:32px auto;padding:20px;max-width:1100px;background:#f5f5ef;color:#183127}table{width:100%;border-collapse:collapse;background:white}th,td{padding:14px;text-align:left;border-bottom:1px solid #ddd}a{color:#146352}</style><h1>Jev ON/OFF</h1><p>'+('Baigta' if report['complete'] else 'Vyksta')+'</p><p>'+escape(total_text)+'</p><p>'+escape(notes)+'</p><table><tr><th>Niša</th><th>OFF</th><th>ON</th><th>Hint paketai</th><th>API kvietimai</th></tr>'+''.join(html_rows)+'</table><p><a href="REPORT.md">Visos klaidos ir delsa</a> · <a href="report.json">Detalūs kvitai JSON</a> · <a href="OPERATOR_REVIEW.md">Operatoriaus peržiūra</a></p></html>'
    (DIRECTORY/'index.html').write_text(html,encoding='utf-8')
    print(json.dumps({'complete':report['complete'],'totals':report['totals']}))


if __name__=='__main__':
    main()
