"""Apply the owner's DR threshold to the live, fixed TOP200 research queue."""
import argparse
import hashlib
import json
import math
from pathlib import Path

from ahrefs_dr import load_cache, DEFAULT_DIRECTORY, ENDPOINT
from classifier import AppError, utc_now, run_lock
from pipeline import atomic_json, read_cache
from niche_research import SIGNATURE, research_queue


def apply_dr_priority(manifest, cache, minimum=10):
    if not math.isfinite(minimum) or not 0 <= minimum <= 100:
        raise AppError('DR slenkstis turi būti tarp 0 ir 100.')
    original = manifest['domains']
    if len(original) != 200 or len(set(original)) != 200:
        raise AppError('DR prioritetui reikia tų pačių 200 unikalių domenų.')
    if cache.get('source_sha256') != manifest['source']['source_sha256']:
        raise AppError('DR duomenys priklauso kitam šaltiniui.')
    updated = json.loads(json.dumps(manifest, ensure_ascii=False))
    base_order = updated.setdefault('potential_order_before_dr', list(original))
    if len(base_order) != 200 or set(base_order) != set(original):
        raise AppError('Pradinė potencialo eilė neatitinka TOP200.')
    base_rank = {domain: rank for rank, domain in enumerate(base_order, 1)}
    records = cache.get('records', {})
    ratings = {domain: value['domain_rating'] for domain, value in records.items()
               if domain in base_rank and value.get('status') == 'ok'}
    high = sorted((domain for domain in original if ratings.get(domain, -1) >= minimum),
                  key=lambda domain: (-ratings[domain], base_rank[domain]))
    high_set = set(high)
    order = high + [domain for domain in base_order if domain not in high_set]
    first = {item['domain']: item for item in updated['screening']}
    details = updated['selection_details']
    for rank, domain in enumerate(order, 1):
        detail = details[domain]
        detail.setdefault('potential_priority', base_rank[domain])
        detail.setdefault('potential_priority_reason', detail.get('priority_reason', detail.get('reason', '')))
        previous_reason = detail['potential_priority_reason']
        # Keep the original commercial band, but remove old "research later"
        # wording that contradicts the owner's new DR processing order.
        tier = detail.get('potential_tier', '')
        if tier.startswith(('P1 —', 'P2 —', 'P3 —', 'P4 —')):
            detail.setdefault('potential_tier_before_dr', tier)
            band = (base_rank[domain]-1)//50+1
            detail['potential_tier'] = f'P{band} — potencialo vietos {(band-1)*50+1}–{band*50}'
        prefix = (f'Savininko prioritetas: Ahrefs DR {ratings[domain]:g} ≥ {minimum:g}; tirti pirmiausia. '
                  if domain in high_set else '')
        detail.update(research_priority=rank, priority_reason=prefix+previous_reason,
                      reason=prefix+previous_reason, dr_priority=domain in high_set,
                      ahrefs_dr=ratings.get(domain),
                      ahrefs_dr_checked_at=records.get(domain, {}).get('checked_at'),
                      ahrefs_dr_source=ENDPOINT if domain in ratings else None)
    updated['domains'] = order
    updated['screening'] = [first[domain] for domain in order]
    updated.setdefault('potential_priority_method', manifest.get('priority_method', ''))
    updated['priority_method'] = (
        f'Savininko nurodymu pirmiausia tiriami domenai su išmatuotu Ahrefs DR ≥ {minimum:g}. '
        'Šios grupės tvarka: DR mažėjimo kryptimi, vienodo DR atveju ankstesnis nišos potencialo prioritetas. '
        'Likę domenai išlaiko ankstesnę potencialo eilę. Potencialo grupės ir baigtų tyrimų balai nekeisti. '
        'Jau pradėti tyrimai užbaigiami, nauji imami pagal šią eilę; baigtos analizės nekartojamos. '
        'DR nepatvirtina backlink kokybės, domeno istorijos, paklausos ar Google pozicijų.')
    updated['dr_priority_minimum'] = minimum
    updated['priority_updated_at'] = utc_now()
    policy = dict(version='dr-priority-v2', minimum=minimum, order=order, ratings=ratings)
    updated['priority_sha256'] = hashlib.sha256(json.dumps(policy, sort_keys=True, ensure_ascii=False).encode('utf-8')).hexdigest()
    return updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=DEFAULT_DIRECTORY)
    parser.add_argument('--minimum', type=float, default=10)
    args = parser.parse_args()
    directory = args.directory.resolve()
    # Independent atomic manifest mutation: do not take the AI worker's long lock.
    with run_lock(directory/'priority-runtime'):
        path = directory/'selection.json'
        manifest = json.loads(path.read_text(encoding='utf-8'))
        cache = load_cache(directory, manifest)
        updated = apply_dr_priority(manifest, cache, args.minimum)
        snapshot = directory/'selection-before-dr-priority-20261001.json'
        if not snapshot.exists():
            atomic_json(snapshot, manifest)
        atomic_json(path, updated)
        saved = read_cache(directory/'research.sqlite3', SIGNATURE)
        queue = research_queue(updated, saved)
        print(json.dumps({'selected': len(updated['domains']), 'research_saved': len(saved),
                          'dr_threshold': args.minimum,
                          'next_unfinished': [{'domain': domain, 'dr': updated['selection_details'][domain]['ahrefs_dr']}
                                              for _, domain, _ in queue[:5]],
                          'priority_sha256': updated['priority_sha256']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
