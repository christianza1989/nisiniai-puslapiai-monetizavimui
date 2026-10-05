"""Freeze three regression archetypes and three independent variants per niche."""
import copy
import json
from pathlib import Path

from pinet_core.agent_instructions import SITES
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]
ENGLISH = {
    'akmenas': 'I am comparing a kitchen countertop for everyday use. I do not know the final measurements or exact surface yet.',
    'auksarankiams': 'I need to clarify assembling a chest of drawers in Kaunas. The instructions are available, but no booking yet.',
    'greitossvetaines': 'I am comparing a small website for a painting business. I have real work photos and do not want an online shop.',
    'laiptucentras': 'I want to clarify renovating existing wooden stair treads. I have photos but no technical assessment yet.',
    'roletaiklaipedoje': 'I am comparing roller blinds for an apartment in Klaipeda. Evening privacy matters and measurements are preliminary.',
    'traktoriupadangos': 'I am comparing two 420/85 R28 tractor tyres for a 4WD tractor. The rim and load index are not yet confirmed.'}


def main():
    directory = ROOT / 'evals/learning-v1'
    directory.mkdir(exist_ok=False)
    hashes = {}
    for site in sorted(SITES):
        original = json.loads((ROOT / 'evals/network-v6-hard-clients' / (site + '.json')).read_text(encoding='utf-8'))
        rows = copy.deepcopy(original['clients'])
        for row in rows:
            row['split'] = 'train'
        initial = rows[0]['messages'][0]
        rows += [
            {'id': 'english_first_saved_contact', 'label': 'English from first turn', 'split': 'holdout',
                'contact': True, 'contact_at': 'during', 'expected_need': {}, 'messages': [ENGLISH[site],
                    'Open the email field now. I want a preparation summary in English only. No order, supplier contact, callback or booking.']},
            {'id': 'phone_saved_without_delivery_promise', 'label': 'Phone is a valid contact', 'split': 'holdout',
                'contact': True, 'contact_at': 'during', 'contact_channels': ['phone'], 'phone': '+37060000007',
                'expected_need': {}, 'messages': [initial + ' Dabar parodykite telefono lauką, el. pašto neturiu.',
                    'Telefoną jau įrašiau. Nekvieskite jo vėl įvesti. Nieko nepirkite ir nežadėkite automatinio skambučio ar SMS; užtenka tikslaus pasiruošimo žingsnio.']},
            {'id': 'refusal_without_losing_helpfulness', 'label': 'Refusal with useful comparison', 'split': 'holdout',
                'contact': False, 'refusal': True, 'refusal_at': 1, 'expected_need': {}, 'messages': [initial,
                    'Pašto ir telefono neduosiu, daugiau kontaktų neprašykite. Nenoriu užsakymo ar laiško, bet pateikite tris konkrečius palyginimo kriterijus pagal mano poreikį.']}]
        value = {**original, 'version': 'protected-learning-v1-2026-10-03', 'clients': rows}
        content = json.dumps(value, ensure_ascii=False, indent=2)
        (directory / (site + '.json')).write_text(content, encoding='utf-8')
        hashes[site] = digest(content)
    (directory / 'registry.json').write_text(json.dumps({'as_of': '2026-10-03', 'cases_per_site': 6,
        'train': 3, 'holdout': 3, 'model_may_edit_corpus': False, 'corpus_hashes': hashes}, indent=2), encoding='utf-8')
    print(json.dumps({'sites': len(SITES), 'protected_cases': len(SITES) * 6, 'holdout_cases': len(SITES) * 3}))


if __name__ == '__main__':
    main()
