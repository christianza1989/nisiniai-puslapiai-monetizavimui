"""Read saved progress and probe the actual OS lock; never start AI or write data."""
from contextlib import closing
import argparse
import errno
import json
import os
from pathlib import Path
import sqlite3
import sys

from classifier import DEFAULT_OUTPUT


def run_active(directory):
    path = Path(directory) / '.run.lock'
    try:
        lock = path.open('r+b')
    except FileNotFoundError:
        return False
    with lock:
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            if exc.errno in (errno.EACCES, errno.EAGAIN, errno.EBUSY, errno.EDEADLK):
                return True
            raise
        if os.name == 'nt':
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            fcntl.flock(lock, fcntl.LOCK_UN)
    return False


def read_status(directory):
    directory = Path(directory)
    summary = json.loads((directory / 'run_summary.json').read_text(encoding='utf-8-sig'))
    active = run_active(summary.get('owner_lock_directory', directory))
    clean_path = directory / 'domenai_clean.txt'
    domains = set(clean_path.read_text(encoding='utf-8').splitlines()) if clean_path.exists() else None
    cache_file = Path(summary.get('cache_file', directory / 'analysis.sqlite3'))
    with closing(sqlite3.connect(cache_file.resolve().as_uri() + '?mode=ro', uri=True)) as conn:
        rows = [(domain, when) for domain, when in conn.execute(
            'SELECT domain,analyzed_at FROM analysis WHERE signature=?', (summary['signature'],))
            if domains is None or domain in domains]
    count = len(rows)
    total = summary['total']
    try:
        pipeline = json.loads((directory / 'pipeline_status.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        pipeline = {}
    if (pipeline.get('screening_signature') != summary['signature'] or
            pipeline.get('source_sha256') != summary.get('source', {}).get('source_sha256')):
        pipeline = {}
    saved_status = pipeline.get('status', summary['status'])
    status = 'running' if active else 'interrupted' if saved_status == 'running' else saved_status
    return dict(status=status, process_active=active, saved_status=saved_status,
                categorized=count, total=total, pending=max(total-count, 0),
                percent=round(count/max(total, 1)*100, 2),
                last_saved_utc=max((when for _, when in rows), default=None),
                summary_updated_utc=summary.get('updated_at'),
                worker_pid=summary.get('worker_pid'), model=summary['model'],
                reasoning_effort=summary.get('reasoning_effort'),
                export_errors=summary.get('export_errors', []),
                deferred_count=len(summary.get('deferred_domains', [])),
                phase=pipeline.get('phase', summary.get('evaluation_stage', 'strategy')),
                strategy_categorized=pipeline.get('strategy_categorized'),
                strategy_total=pipeline.get('strategy_total'))


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description='Faktinė domenų analizės būsena; AI nekviečiamas.')
    parser.add_argument('--directory', type=Path, default=DEFAULT_OUTPUT.parent)
    args = parser.parse_args()
    try:
        print(json.dumps(read_status(args.directory), ensure_ascii=False, indent=2))
    except (OSError, ValueError, KeyError, sqlite3.Error):
        print('Nepavyko patikrinti būsenos; patikrinkite išvesties katalogą ir failų prieigą.', file=sys.stderr)
        raise SystemExit(1)
