"""Apply the agent's explicitly reviewed research priority to the fixed TOP200 set."""
import argparse
import hashlib
import json
from pathlib import Path

from classifier import AppError, utc_now, run_lock
from pipeline import atomic_json
from niche_research import export

ROOT = Path(__file__).resolve().parent
DEFAULT_DIRECTORY = ROOT/'output/top200-research-20261001/selected'
PRIORITY_FILE = ROOT/'priority_top200.tsv'
METHOD = ('Agento individualiai peržiūrėta preliminari 1–200 tyrimo eilė pagal domeno '
          'raktažodį ir pirkimo ketinimą, galimą mūsų mokėtoją, atlygio/maržos hipotezę, '
          'kartotines pajamas, partnerių/vykdymo sudėtingumą, automatizavimą ir išsiskyrimą. '
          'Neišmatuotos apimtys, maržos, DR ir mūsų partnerystės nėra patvirtinti faktai. '
          'Tai nėra baigtų tyrimų balų reitingas; jau baigta analizė neperkeliama į viršų.')


def apply(manifest, priority_text):
    entries = [line.split('\t',1) for line in priority_text.splitlines() if line.strip()]
    if (len(entries)!=200 or any(len(entry)!=2 or len(entry[1].strip())<30 for entry in entries)
            or len({entry[0] for entry in entries})!=200
            or {entry[0] for entry in entries}!=set(manifest['domains'])):
        raise AppError('Prioritetai turi apimti tuos pačius 200 unikalių domenų su argumentais.')
    manifest = json.loads(json.dumps(manifest,ensure_ascii=False))
    manifest.setdefault('initial_top200_order',list(manifest['domains']))
    first = {item['domain']:item for item in manifest['screening']}
    details = manifest.setdefault('selection_details',{})
    for rank,(domain,reason) in enumerate(entries,1):
        detail = details.setdefault(domain,{})
        detail.setdefault('initial_research_priority',detail.get('research_priority'))
        detail.setdefault('original_selection_reason',detail.get('reason',''))
        detail.update(research_priority=rank,priority_reason=reason,reason=reason,
                      potential_tier='P1 — pirmiausia tirti' if rank<=50 else
                      'P2 — aukštas prioritetas' if rank<=100 else
                      'P3 — vidutinis prioritetas' if rank<=150 else 'P4 — vėliau tirti')
    manifest['domains'] = [domain for domain,_ in entries]
    manifest['screening'] = [first[domain] for domain in manifest['domains']]
    manifest['priority_method'] = METHOD
    manifest['priority_updated_at'] = utc_now()
    manifest['priority_sha256'] = hashlib.sha256(priority_text.encode('utf-8')).hexdigest()
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',type=Path,default=DEFAULT_DIRECTORY)
    args = parser.parse_args()
    with run_lock(args.directory):
        path = args.directory/'selection.json'
        manifest = apply(json.loads(path.read_text(encoding='utf-8')),PRIORITY_FILE.read_text(encoding='utf-8'))
        snapshot = args.directory/'selection-before-priority-20261001.json'
        if not snapshot.exists():
            snapshot.write_bytes(path.read_bytes())
        atomic_json(path,manifest)
        state = export(args.directory,manifest,'prepared')
        print(json.dumps({'selected':len(manifest['domains']),'research_saved':state['categorized'],
                          'first10':manifest['domains'][:10],'priority_sha256':manifest['priority_sha256']},
                         ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
