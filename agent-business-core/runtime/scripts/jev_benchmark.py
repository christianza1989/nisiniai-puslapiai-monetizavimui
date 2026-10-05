"""Labelled local intent pilot. Labels never enter the Jev request."""
import asyncio
import json
import math
import statistics
from pathlib import Path

import httpx

from pinet_core.config import settings
from pinet_core.jev_router import JevShadow, Snapshot

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = [
    ('information', 'traktoriupadangos', 'Kuo radialinė padanga skiriasi nuo diagonalinės?', ''),
    ('information', 'akmenas', 'Kuo skiriasi granito ir marmuro priežiūra?', ''),
    ('information', 'roletaiklaipedoje', 'Explain blackout fabric and light gaps around a blind.', ''),
    ('specification', 'traktoriupadangos', 'Pataisau žymėjimą: 380/85 R24, ankstesnis dydis buvo klaidingas.', 'Minėjau 420/85 R28.'),
    ('specification', 'greitossvetaines', 'Puslapių reikia šešių, ne keturių.', 'Planavau keturis puslapius.'),
    ('specification', 'akmenas', 'Medžiaga bus granitas, marmuro atsisakau.', 'Svarstėme marmurą.'),
    ('contact_request', 'auksarankiams', 'Parodykite telefono įvedimo lauką dabar.', ''),
    ('contact_request', 'laiptucentras', 'Open the email field on my screen so I can enter my address.', ''),
    ('contact_request', 'traktoriupadangos', 'Noriu palikti el. paštą ekrane santraukai, atidarykite formą.', ''),
    ('price_objection', 'greitossvetaines', 'Per brangu, galiu mokėti tik 350 eurų. Ką galima sumažinti?', 'Aptarėme pasiūlymo kainą.'),
    ('price_objection', 'traktoriupadangos', 'Your quoted price is too high. Can you suggest a lower-cost suitable alternative?', 'A quote was discussed.'),
    ('price_objection', 'akmenas', 'Į biudžetą netelpame, norėčiau pigesnės darbų apimties.', ''),
    ('order_confirmation', 'traktoriupadangos', 'Patvirtinu pasiūlymą R1: dvi padangos už bendrą nurodytą 1308,28 sumą.', 'Aptartas R1 pasirinkimas, 2 vienetai.'),
    ('order_confirmation', 'greitossvetaines', 'I accept the specific four-page proposal you sent, at its stated total.', 'A specific proposal was discussed.'),
    ('order_confirmation', 'roletaiklaipedoje', 'Noriu priimti paskutinį konkretų pasiūlymą trims roletams.', 'Aptartas pasiūlymas P3.'),
    ('supplier_offer', 'akmenas', 'Esu akmens apdirbimo įmonė, norime pasiūlyti jums tiekimą.', ''),
    ('supplier_offer', 'greitossvetaines', 'Esu programuotojas, ieškau partnerystės su jūsų įmone.', ''),
    ('supplier_offer', 'traktoriupadangos', 'We manufacture tractor tyres and want to become your supplier.', ''),
    ('opt_out', 'auksarankiams', 'Daugiau man laiškų ir priminimų nesiųskite.', 'Anksčiau prašiau pasiūlymo.'),
    ('opt_out', 'laiptucentras', 'Do not contact me again. Withdraw my request.', ''),
    ('opt_out', 'traktoriupadangos', 'Atsiimu užklausą, nenoriu jokio tolimesnio bendravimo.', ''),
    ('out_of_scope', 'greitossvetaines', 'Noriu nusipirkti traktoriaus padangas iš jūsų svetainių kūrimo įmonės.', ''),
    ('out_of_scope', 'akmenas', 'Atvykite remontuoti elektros skydelio.', ''),
    ('out_of_scope', 'traktoriupadangos', 'Please build a website for my café.', ''),
    ('unclear', 'roletaiklaipedoje', 'Na, tada tą kitą, kažkaip taip.', ''),
    ('unclear', 'laiptucentras', 'Galbūt, bet dar nežinau, ką tiksliai turiu omenyje.', ''),
    ('unclear', 'akmenas', 'That one maybe, I have not explained what I want yet.', ''),
]


async def main():
    cfg = settings()
    directory = ROOT / 'artifacts/jev-pilot/intent-benchmark'
    directory.mkdir(exist_ok=False)
    rows, semaphore = [], asyncio.Semaphore(2)
    async with httpx.AsyncClient(timeout=cfg.jev_timeout_seconds, follow_redirects=False) as client:
        router = JevShadow(api_key=cfg.jev_api_key.get_secret_value(), enabled=True, max_calls=len(EXAMPLES),
            budget_microusd=3000*len(EXAMPLES), timeout_seconds=cfg.jev_timeout_seconds, client=client)
        async def example(index, example):
            expected, site, message, prior = example
            snapshot = Snapshot(site, 1, 0, message, prior,
                ('knowledge.resolve', 'need.patch', 'ui.open_contact_form', 'memory.recall'), True)
            async with semaphore:
                result = await router.observe(snapshot, lambda: (1, 0))
            rows.append({'index': index, 'site': site, 'expected': expected, 'input': message,
                'result': result, 'correct': result.get('status') == 'observed' and result.get('intent') == expected})
            (directory / 'progress.json').write_text(json.dumps(sorted(rows,key=lambda r:r['index']),
                ensure_ascii=False, indent=2), encoding='utf-8')
        await asyncio.gather(*(example(index, item) for index,item in enumerate(EXAMPLES)))
    latencies = sorted(r['result']['latency_ms'] for r in rows if r['result'].get('status') == 'observed')
    report = {'examples': len(EXAMPLES), 'provider_attempts': router.calls, 'correct': sum(r['correct'] for r in rows),
        'observed': len(latencies), 'known_cost_microusd': sum(r['result'].get('cost_microusd',0) for r in rows),
        'unknown_cost_reservations': sum(r['result'].get('reservation_retained',False) for r in rows),
        'p50_ms': statistics.median(latencies) if latencies else None,
        'p95_ms': latencies[math.ceil(len(latencies)*.95)-1] if latencies else None,
        'labels_hidden_from_provider': True, 'confidence_calibration_verified': False,
        'automatic_actions': False, 'rows': sorted(rows,key=lambda r:r['index'])}
    (directory / 'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='rows'}))


if __name__ == '__main__':
    asyncio.run(main())
