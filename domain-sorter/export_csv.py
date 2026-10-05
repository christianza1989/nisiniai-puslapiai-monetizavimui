"""Read-only CSV export alongside an already running classifier; never calls AI."""
import argparse
from contextlib import closing
import json
from pathlib import Path
import signal
import sqlite3
import threading

from classifier import (DEFAULT_INPUT, DEFAULT_OUTPUT, AppError, configured_model,
                        extract_domains, signature_for, write_csv, Extraction, SCREEN_VERSION, VERSION)
from codex_provider import REASONING_EFFORT


def export_snapshot(source=DEFAULT_INPUT, directory=DEFAULT_OUTPUT.parent, model=None):
    source, directory = Path(source), Path(directory)
    extraction = extract_domains(source)
    if not extraction.domains:
        raise AppError('Faile nerasta domenų.')
    model = model or configured_model()
    try:
        summary = json.loads((directory / 'run_summary.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        summary = {}
    stage = summary.get('evaluation_stage', 'strategy')
    signature = signature_for(model, stage)
    if summary.get('source', {}).get('selection_total'):
        try:
            selected = (directory / 'domenai_clean.txt').read_text(encoding='utf-8').splitlines()
        except OSError as exc:
            raise AppError('Nepavyko perskaityti finalistų sąrašo.') from exc
        if len(selected) != len(set(selected)) or not set(selected).issubset(extraction.domains):
            raise AppError('Finalistų sąrašas neatitinka šaltinio.')
        extraction = Extraction(selected, extraction.occurrences, extraction.first_lines, extraction.stats)
    db = Path(summary.get('cache_file', directory / 'analysis.sqlite3'))
    try:
        with closing(sqlite3.connect(db.resolve().as_uri() + '?mode=ro', uri=True, timeout=10)) as connection:
            analyses = {domain: json.loads(payload) for domain, payload in connection.execute(
                'SELECT domain,payload FROM analysis WHERE signature=?', (signature,))}
    except sqlite3.Error as exc:
        raise AppError('Nepavyko perskaityti išsaugotos AI eigos; analizės DB nekeičiama.') from exc
    same_run = (summary.get('signature') == signature and
                summary.get('source', {}).get('source_sha256') == extraction.stats['source_sha256'])
    meta = {'model': model, 'reasoning_effort': REASONING_EFFORT, 'signature': signature,
            'evaluation_stage': stage, 'evaluation_version': SCREEN_VERSION if stage == 'screen' else VERSION,
            'status': summary.get('status', 'partial') if same_run else 'partial'}
    try:
        return write_csv(directory, extraction, analyses, meta)
    except OSError as exc:
        raise AppError('CSV failo negalima įrašyti; patikrinkite katalogo prieigą ir failų užraktus.') from exc


def main():
    parser = argparse.ArgumentParser(description='Eksportuoti CSV iš SQLite be naujų AI kvietimų.')
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--directory', type=Path, default=DEFAULT_OUTPUT.parent)
    parser.add_argument('--model', default=None)
    parser.add_argument('--watch', action='store_true', help='Atnaujinti CSV maždaug kas minutę.')
    parser.add_argument('--interval', type=int, default=60)
    args = parser.parse_args()
    if args.interval < 5:
        parser.error('Intervalas turi būti bent 5 sekundės.')
    stop = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    previous = None
    while not stop.is_set():
        try:
            status = export_snapshot(args.input, args.directory, args.model)
            if status:
                current = (status['categorized'], status['analysis_status'])
                if current != previous:
                    print(f"CSV: {status['categorized']:,}/{status['total']:,}; "
                          f"būsena {status['analysis_status']}.", flush=True)
                    previous = current
                if not args.watch or status['analysis_status'] != 'running':
                    return 0
        except AppError as exc:
            print(f'CSV: {exc}', flush=True)
            if not args.watch:
                return 1
        if not args.watch:
            return 1
        stop.wait(args.interval)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
