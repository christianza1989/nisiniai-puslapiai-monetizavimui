"""Fetch real Ahrefs DR without passing credentials to AI or logs."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from classifier import AppError, utc_now, run_lock
from pipeline import atomic_json

ENDPOINT = 'https://api.ahrefs.com/v3/public/domain-rating-free'
DOCUMENTATION = 'https://docs.ahrefs.com/en/api/reference/public/post-domain-rating-free'
LICENSE = 'https://ahrefs.com/legal/domain-rating-license'
DEFAULT_DIRECTORY = Path(__file__).resolve().parent/'output/top200-research-20261001/selected'


def api_key(env_path):
    """Only read the requested key; never evaluate shell/document instructions."""
    value = os.environ.get('AHREFS_API_KEY', '').strip()
    if not value:
        for line in Path(env_path).read_text(encoding='utf-8-sig').splitlines():
            match = re.match(r'^\s*(?:export\s+)?AHREFS_API_KEY\s*=\s*(.*)$', line)
            if match:
                value = match.group(1).strip()
                if value.startswith(('"', "'")):
                    quote = value[0]
                    end = value.find(quote, 1)
                    value = value[1:end] if end >= 1 else ''
                else:
                    value = re.split(r'\s+#', value, maxsplit=1)[0].strip()
                break
    if not value or '\r' in value or '\n' in value:
        raise AppError('Nerastas tinkamas AHREFS_API_KEY.')
    return value


def normalize_target(value):
    if not isinstance(value, str) or not value.strip():
        raise AppError('Ahrefs atsakyme nėra domeno.')
    parsed = urlsplit(value if '://' in value else '//'+value)
    host = parsed.hostname
    if not host or parsed.path not in ('', '/') or parsed.query or parsed.fragment:
        raise AppError('Ahrefs atsakymo domenas neatitinka domeno užklausos.')
    return host.rstrip('.').lower().encode('idna').decode('ascii')


def parse_response(payload, domains):
    """Join by returned domain, never by API row order; zero is a valid DR."""
    data = payload.get('domain_rating') if isinstance(payload, dict) else None
    targets = data.get('targets') if isinstance(data, dict) else None
    if not isinstance(targets, list):
        raise AppError('Ahrefs atsakymas neatitinka DR API schemos.')
    wanted = {normalize_target(domain): domain for domain in domains}
    found = {}
    for row in targets:
        if not isinstance(row, dict):
            raise AppError('Netinkama Ahrefs DR eilutė.')
        target = normalize_target(row.get('target'))
        if target not in wanted or target in found:
            raise AppError('Ahrefs grąžino svetimą arba pasikartojantį domeną.')
        rating = row.get('domain_rating')
        if isinstance(rating, bool) or not isinstance(rating, (int, float)) or not math.isfinite(rating) or not 0 <= rating <= 100:
            raise AppError('Ahrefs grąžino netinkamą DR; reikšmė nekeičiama į nulį.')
        found[target] = float(rating)
    if set(found) != set(wanted):
        raise AppError('Ahrefs atsakyme trūksta užsakytų domenų DR.')
    return {wanted[target]: rating for target, rating in found.items()}


def request_batch(domains, key):
    request = Request(ENDPOINT, data=json.dumps({'targets': domains}).encode('utf-8'),
                      headers={'Authorization': 'Bearer '+key, 'Accept': 'application/json',
                               'Content-Type': 'application/json'}, method='POST')
    for attempt in range(3):
        try:
            with urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode('utf-8'))
                ratings = parse_response(payload, domains)
                return ratings, payload
        except HTTPError as error:
            # Never log request headers or untrusted response bodies containing secrets.
            status = error.code
            error.close()
            if status == 429 or status >= 500:
                if attempt < 2:
                    time.sleep(2**attempt * 3)
                    continue
            raise AppError(f'Ahrefs API HTTP {status}; DR negautas.') from None
        except (URLError, TimeoutError):
            if attempt < 2:
                time.sleep(2**attempt * 3)
                continue
            raise AppError('Ahrefs API ryšio klaida; DR negautas.') from None
        except (ValueError, UnicodeError):
            raise AppError('Ahrefs API atsakymas nėra tinkamas JSON.') from None


def load_cache(directory, manifest):
    path = Path(directory)/'ahrefs_dr.json'
    if not path.exists():
        return {}
    cache = json.loads(path.read_text(encoding='utf-8'))
    if cache.get('source_sha256') != manifest['source']['source_sha256']:
        raise AppError('DR cache priklauso kitam domenų šaltiniui.')
    records = cache.get('records', {})
    if not isinstance(records, dict) or not set(records).issubset(manifest['domains']):
        raise AppError('DR cache domenai neatitinka atrankos.')
    for domain, record in records.items():
        rating = record.get('domain_rating') if isinstance(record, dict) else None
        if (not isinstance(record, dict) or record.get('domain') != domain or record.get('status') != 'ok'
                or isinstance(rating, bool) or not isinstance(rating, (int, float))
                or not math.isfinite(rating) or not 0 <= rating <= 100 or not record.get('checked_at')):
            raise AppError('DR cache rodiklis ar jo domenas netinkamas.')
    return cache


def fetch(directory, env_path, refresh=False):
    directory = Path(directory)
    manifest = json.loads((directory/'selection.json').read_text(encoding='utf-8'))
    domains = manifest['domains']
    if len(domains) != 200 or len(set(domains)) != 200:
        raise AppError('Reikia užfiksuotos 200 unikalių domenų atrankos.')
    cache = load_cache(directory, manifest)
    records = cache.get('records', {}) if not refresh else {}
    pending = [domain for domain in domains if records.get(domain, {}).get('status') != 'ok']
    key = api_key(env_path) if pending else None
    calls = list(cache.get('calls', []))
    for start in range(0, len(pending), 100):
        batch = pending[start:start+100]
        print(f'Ahrefs DR: užklausa {len(batch)} domenų; jau gauta {sum(records.get(d, {}).get("status") == "ok" for d in domains)}/200.', flush=True)
        ratings, payload = request_batch(batch, key)
        observed = utc_now()
        for domain, rating in ratings.items():
            records[domain] = {'domain': domain, 'domain_rating': rating, 'status': 'ok',
                               'checked_at': observed, 'endpoint': ENDPOINT}
        response_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode('utf-8')).hexdigest()
        calls.append({'checked_at': observed, 'targets': batch, 'http_status': 200,
                      'response_sha256': response_hash, 'response': payload})
        cache = {'source_sha256': manifest['source']['source_sha256'], 'endpoint': ENDPOINT,
                 'attribution': 'Domain Rating by Ahrefs', 'source': 'https://ahrefs.com/',
                 'documentation': DOCUMENTATION, 'license': LICENSE,
                 'updated_at': observed, 'records': records, 'calls': calls}
        atomic_json(directory/'ahrefs_dr.json', cache)
    print(f'Ahrefs DR: gauta {sum(records.get(d, {}).get("status") == "ok" for d in domains)}/200.', flush=True)
    return manifest, cache


def export_and_follow(directory, follow=False):
    """Refresh a separate DR-enriched report without stopping the AI worker."""
    from niche_research import export, SIGNATURE
    from pipeline import read_cache
    from status import run_active
    directory = Path(directory)
    manifest = json.loads((directory/'selection.json').read_text(encoding='utf-8'))
    last_revision = None
    while True:
        results = read_cache(directory/'research.sqlite3', SIGNATURE)
        active = run_active(directory)
        current_manifest = json.loads((directory/'selection.json').read_text(encoding='utf-8'))
        revision = (len(results), active, current_manifest.get('priority_sha256'))
        if revision != last_revision:
            progress_path = directory/'research_status.json'
            source_state = json.loads(progress_path.read_text(encoding='utf-8')) if progress_path.exists() else {}
            failures = source_state.get('failures',[])
            source_status = 'running' if active else source_state.get('status','complete' if len(results)==200 else 'snapshot')
            state = export(directory, manifest, source_status, failures, dr_snapshot=True)
            for key in ('stop_after_total','run_baseline_count','remaining_in_run'):
                if key in source_state:
                    state[key] = source_state[key]
            atomic_json(directory/'top200_dr_status.json',state)
            print(f'DR failai atnaujinti: {state["dr_count"]}/200 DR; {state["categorized"]}/200 rinkos analizių.', flush=True)
            last_revision = revision
        if not follow or not active:
            return state
        time.sleep(15)


def main():
    parser = argparse.ArgumentParser(description='TOP200 Ahrefs DR su tikru API ir tęsiamu cache.')
    parser.add_argument('--directory', type=Path, default=DEFAULT_DIRECTORY)
    parser.add_argument('--env', type=Path, default=Path(__file__).resolve().parents[1]/'.env')
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--export-only', action='store_true')
    parser.add_argument('--follow-research', action='store_true', help='Atnaujinti DR ataskaitą po naujų AI analizių; API nekartojama.')
    args = parser.parse_args()
    try:
        lock_directory = args.directory/'dr-runtime'
        lock_directory.mkdir(exist_ok=True)
        with run_lock(lock_directory):
            if not args.export_only:
                fetch(args.directory, args.env, args.refresh)
            export_and_follow(args.directory, args.follow_research)
    except AppError as error:
        print(str(error), flush=True)
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
