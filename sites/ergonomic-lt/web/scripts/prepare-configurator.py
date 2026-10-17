"""Prepare only the two agreed pilot products from the existing public export.

Original CAD, source receipts and exact preset option strings are retained.
No vendor credential, cloud engine or arbitrary option combination is used.
Run from web: ../.venv/Scripts/python.exe scripts/prepare-configurator.py
"""
import hashlib
import json
import struct
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

WEB = Path(__file__).resolve().parents[1]
ROOT = WEB.parent
SOURCE = json.loads((ROOT / 'data/nextjs_catalog.json').read_text(encoding='utf-8'))
SEED = json.loads((WEB / 'content/seed.json').read_text(encoding='utf-8'))
RAW = ROOT / 'research/configurator/pilot-source'
MEDIA = WEB / 'public/media/configurator'
RAW.mkdir(parents=True, exist_ok=True)
MEDIA.mkdir(parents=True, exist_ok=True)

# The CAD filenames identify the same backrest, armrest, base and headrest
# family as the public preset. CAD is a visualization, not an OFML export.
PILOTS = {
 'product_xilium-swivel-chairs_0fe4091b': {
  '23636148': ('26385', 'duo', 'Duo-Back · balta · su galvos atrama'),
  '23636149': ('26391', 'mesh', 'Tinklinis · balta · be galvos atramos'),
  '23636150': ('26397', 'uph', 'Apmuštas · balta · be galvos atramos'),
  '23636151': ('26395', 'uph', 'Apmuštas · juoda · su galvos atrama'),
  '23636152': ('26383', 'duo', 'Duo-Back · juoda · be porankių'),
 },
 'product_souly-swivel-chairs_e1805fc7': {
  '16088654': ('3067', 'mesh', 'Tinklinis · juoda · be galvos atramos'),
  '16088657': ('3063', 'uph', 'Apmuštas · pilka · be galvos atramos'),
  '16088659': ('3072', 'uph', 'Apmuštas · juoda · su galvos atrama'),
  '23664986': ('3064', 'mesh', 'Tinklinis · pilka · be galvos atramos'),
  '23664987': ('3069', 'mesh', 'Tinklinis · pilka · su galvos atrama'),
 }
}

def read_receipt(product, kind):
 e = next(e for e in product['enrichment'] if e['kind'] == kind)
 return json.loads((ROOT / 'data' / e['response_path']).read_text(encoding='utf-8'))

def public_file(url, dest, cad=False):
 u = urlparse(url)
 if u.scheme != 'https' or u.hostname != 'www.nowystyl.com' or not u.path.startswith('/getmedia/'):
  raise ValueError('Only public supplier media is accepted')
 receipt_path = dest.with_suffix(dest.suffix + '.receipt.json')
 if dest.exists() and receipt_path.exists():
  previous = json.loads(receipt_path.read_text(encoding='utf-8'))
  if previous['source_url'] != url:
   raise ValueError('Cached asset belongs to a different source')
  if cad and hashlib.sha256(dest.read_bytes()).hexdigest() != previous['sha256']:
   raise ValueError('Cached original CAD has changed')
  # JPEG provenance is embedded after download. Preserve the original source
  # digest and retrieval date rather than hashing metadata as a new download.
  return previous
 if not dest.exists():
  response = requests.get(url, timeout=45, allow_redirects=False)
  response.raise_for_status()
  if 300 <= response.status_code < 400 or len(response.content) > 30_000_000:
   raise ValueError('Unexpected redirect or oversized asset')
  dest.write_bytes(response.content)
 b = dest.read_bytes()
 if cad and (len(b) < 6 or struct.unpack_from('<HI', b) != (0x4d4d, len(b))):
  raise ValueError('Invalid 3DS root')
 receipt = {'source_url': url, 'fetched_at': datetime.now(timezone.utc).isoformat(),
            'sha256': hashlib.sha256(b).hexdigest(), 'bytes': len(b),
            'source_product_ids': [p['id'] for p in SOURCE['products'] if p['id'] in PILOTS],
            'purpose': 'Two-product interactive 3D pilot; original supplier asset'}
 receipt_path.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
 return receipt

result = {'schemaVersion': 1, 'status': 'pilot', 'models': []}
for pid, selections in PILOTS.items():
 p = next(p for p in SOURCE['products'] if p['id'] == pid)
 seed = next(p for p in SEED['products'] if p['id'] == pid)
 downloads = read_receipt(p, 'downloads')
 cad_urls = [i['download'] for t in downloads['data']['tabs'] for i in t['items']
             if i.get('download', '').lower().endswith('.3ds')]
 finishes = read_receipt(p, 'finishes')
 swatches = {}
 for finish in finishes['finishes']:
  for group in finish.get('priceGroups', []):
   for collection in group.get('nameGroups', []):
    for item in collection.get('items', []):
     swatches[item['code']] = {**item, 'collection': collection['name']}
 model = {'productId': pid, 'name': p['name'],
          'path': f"/produktai/{seed['categorySlug']}/{seed['slug']}/", 'variants': []}
 for cid, (cad_id, backrest, label) in selections.items():
  c = next(c for c in p['configurations'] if c['id'] == cid)
  cad_url = next(u for u in cad_urls if urlparse(u).path.lower().endswith('-' + cad_id + '.3ds'))
  cad_name = Path(urlparse(cad_url).path).name
  receipt = public_file(cad_url, RAW / cad_name, cad=True)
  photo = c['image_url'].split('?')[0] + '?height=1000'
  public_file(photo, MEDIA / (cid + '.jpg'))
  options = {s.split('=', 1)[0].split('.')[-1]: s.split('=', 1)[1] for s in c['configuration_options']}
  material_codes = {
   'seat': options.get('CUPHSEATCOLOR') or options.get('CUPHCOLOR'),
   'backrest': options.get('CMESHCOLOR') or options.get('CUPHBACKRESTCOLOR') or options.get('CUPHCOLOR'),
   'side': options.get('CSEBASIDEPROFILUPHCOLOR') or options.get('CUPHSIDECOLORSEAT'),
   'headrest': options.get('CHEADRESTUPHCHCOLOR') or options.get('CUPHCOLOR'),
  }
  samples = {}
  for role, code in material_codes.items():
   if code and code in swatches:
    item = swatches[code]
    sample_url = item['download'].split('?')[0] + '?width=256'
    public_file(sample_url, MEDIA / (code.lower() + '.jpg'))
    samples[role] = {'code': code, 'name': item['collection'], 'image': '/media/configurator/' + code.lower() + '.jpg'}
  model['variants'].append({'id': cid, 'label': label, 'backrest': backrest,
    'sourceCad': cad_name, 'sourceCadUrl': cad_url, 'sourceCadSha256': receipt['sha256'],
    'asset': '/models/configurator/' + cid + '.glb',
    'image': '/media/configurator/' + cid + '.jpg', 'materialCodes': material_codes,
    'samples': samples, 'plastic': 'white' if options.get('CPLASTICCOLORVERSION2') == 'WHITEEDITION'
      else 'grey' if options.get('CPLASTICCOLORVERSION') == 'LIGHTGREY' else 'black',
    'metalBase': options.get('CBASE', '').startswith('ST'),
    'supplierCode': c['base_article_number'], 'supplierOptions': c['configuration_options'],
    'visualizationNote': 'CAD dalys ir apdailų spalvos pritaikytos 3D peržiūrai. Tiksli komplektacija nustatoma pagal gamintojo kodus ir pavyzdžio nuotrauką.'})
  print(p['name'], cid, cad_name, flush=True)
 result['models'].append(model)
(WEB / 'content/configurator-pilot.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print('Prepared exactly 2 products and 10 published preset recipes.')
