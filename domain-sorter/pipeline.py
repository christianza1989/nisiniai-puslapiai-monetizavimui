"""Screen every domain, then develop the strongest candidates; one resumable writer."""
import argparse
from contextlib import closing
from dataclasses import replace
import json
from pathlib import Path
import signal
import sqlite3
import threading

from classifier import (Options, AppError, CodexError, DEFAULT_INPUT, DEFAULT_OUTPUT,
                        configured_model, extract_domains, signature_for, ranked,
                        run_lock, _run, utc_now)
from priority import rank_domain_names, write_priority


def read_cache(path, signature):
    if not Path(path).exists():
        return {}
    with closing(sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro', uri=True)) as conn:
        return {domain: json.loads(payload) for domain, payload in conn.execute(
            'SELECT domain,payload FROM analysis WHERE signature=?', (signature,))}


def atomic_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name+'.tmp')
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
        temporary.replace(path)
    except OSError:
        raise AppError('Nepavyko išsaugoti dviejų etapų eigos; patikrinkite laisvą vietą ir failų prieigą.') from None
    finally:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass


def run_pipeline(options, report=print, stop=None, top_n=1000, strategy_batch=6):
    if not 1 <= top_n <= 10000 or not 1 <= strategy_batch <= 300:
        raise AppError('Finalistų skaičius turi būti 1–10 000, strategijų grupė 1–300.')
    stop = stop or threading.Event()
    root = Path(options.output).parent
    cache = root / 'analysis.sqlite3'
    model = options.model or configured_model()
    source = extract_domains(options.input)
    if not source.domains:
        raise AppError('Faile nerasta domenų.')
    source_domains = set(source.domains)
    screen_signature = signature_for(model, 'screen')
    strategy_signature = signature_for(model, 'strategy')
    selected = []
    phase = 'screen'
    stop_file = root / '.stop.request'

    def publish(current_phase, status='running'):
        screen = read_cache(cache, screen_signature)
        strategy = read_cache(cache, strategy_signature)
        done = sum(domain in screen for domain in source_domains)
        detailed = sum(domain in strategy for domain in selected)
        state = dict(phase=current_phase, status=status, categorized=done, total=len(source.domains),
                     strategy_categorized=detailed, strategy_total=len(selected), top_n=top_n,
                     model=model, screening_signature=screen_signature, strategy_signature=strategy_signature,
                     source_sha256=source.stats['source_sha256'], updated_at=utc_now(),
                     screening_batch=options.batch_size, strategy_batch=strategy_batch,
                     workers=options.workers)
        atomic_json(root / 'pipeline_status.json', state)
        return state

    def stage_report(message):
        report(('Atranka: ' if phase == 'screen' else 'Strategijos: ')+message)
        if message.startswith('AI: '):
            publish(phase)

    with run_lock(root):
        stop_file.unlink(missing_ok=True)
        try:
            publish(phase)
            priority_file = options.priority_file
            if priority_file is None:
                screened = read_cache(cache, screen_signature)
                previous = list(read_cache(cache, strategy_signature).values()) + list(screened.values())
                priorities = rank_domain_names(source.domains, previous)
                priority_file = write_priority(root, priorities, source.stats['source_sha256'],
                                               source_domains.intersection(screened))
                report(f'Visi {len(priorities):,} domenai surikiuoti pagal pavadinimą. '
                       'Tai preliminari AI apdorojimo eilė, ne galutinis AI balas.')
                first = [item.domain for item in priorities if item.domain not in screened][:5]
                if first:
                    report('Pirmi dar neįvertinti: ' + ', '.join(first))
            screening = replace(options, stage='screen', cache_file=cache, selected_domains=None,
                                stop_file=stop_file, owner_lock_directory=root, priority_file=priority_file)
            screen_result = _run(screening, stage_report, stop)
            if screen_result['categorized'] != len(source.domains):
                return publish('screen', screen_result['status'])
            if stop.is_set() or stop_file.exists():
                stop.set()
                return publish('screen', 'stopped')
            if options.extract_only:
                return publish('screen', 'partial')
            if extract_domains(options.input).stats['source_sha256'] != source.stats['source_sha256']:
                raise AppError('Šaltinis pakeistas analizės metu; paleiskite tęsimą su nauja šaltinio kopija.')
            candidates = ranked([item for domain, item in read_cache(cache, screen_signature).items()
                                 if domain in source_domains])
            selected = [item['domain'] for item in candidates[:top_n]]
            atomic_json(root / 'shortlist.json', dict(domains=selected, source_sha256=source.stats['source_sha256'],
                        screening_signature=screen_signature, strategy_signature=strategy_signature,
                        top_n=top_n, selected_at=utc_now()))
            phase = 'strategy'
            publish(phase)
            report(f'Pirminė atranka baigta. Išsamiai vertinami {len(selected):,} stipriausių; '
                   'ankstesnės tos pačios strategijos išvados naudojamos pakartotinai.')
            strategy_options = replace(options, stage='strategy', output=root/'finalists/domenai_finalistai.xls',
                                       cache_file=cache, selected_domains=selected, batch_size=strategy_batch,
                                       limit=0, priority_file=None, stop_file=stop_file, owner_lock_directory=root)
            strategy_result = _run(strategy_options, stage_report, stop)
            return publish(phase, strategy_result['status'])
        except Exception:
            publish(phase, 'error')
            raise


def main():
    parser = argparse.ArgumentParser(description='100 domenų pirminė atranka → TOP išsamios strategijos.')
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--model', default=None)
    parser.add_argument('--batch-size', type=int, default=100)
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--top', type=int, default=1000)
    parser.add_argument('--strategy-batch', type=int, default=6)
    parser.add_argument('--priority-file', type=Path, default=None)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--export-only', action='store_true')
    parser.add_argument('--extract-only', action='store_true')
    args = vars(parser.parse_args())
    top = args.pop('top')
    strategy_batch = args.pop('strategy_batch')
    stop = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    try:
        result = run_pipeline(Options(**args), stop=stop, top_n=top, strategy_batch=strategy_batch)
        return 0 if result['status'] == 'complete' or args['limit'] or args['export_only'] or args['extract_only'] else 2
    except (AppError, CodexError) as exc:
        print(f'Klaida: {exc}', flush=True)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
