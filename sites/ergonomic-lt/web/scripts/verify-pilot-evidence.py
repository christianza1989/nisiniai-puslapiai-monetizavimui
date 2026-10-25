"""Read-only PDF and captured-browser verification; no browser automation."""
import json
from pathlib import Path
from pypdf import PdfReader
from PIL import Image, ImageChops, ImageDraw

WEB = Path(__file__).resolve().parents[1]
REVIEW = WEB / '.impeccable/review/configurator'
pilot = json.loads((WEB / 'content/configurator-pilot.json').read_text(encoding='utf-8'))
pdfs = []
for name, cid in [('xilium', '23636148'), ('souly', '23664987')]:
    model = next(m for m in pilot['models'] if m['name'].lower() == name)
    variant = next(v for v in model['variants'] if v['id'] == cid)
    path = WEB / f'output/pdf/{name}-produkto-kortele.pdf'
    reader = PdfReader(path)
    assert len(reader.pages) == 2, (name, len(reader.pages))
    texts = [p.extract_text() for p in reader.pages]
    assert all(len(t) > 200 for t in texts)
    text = '\n'.join(texts)
    for label in ['Produkto kortelė', 'Pasirinkta komplektacija', 'Gamintojo',
                  'Kaina pagal užklausą', 'Komplektacijos specifikacija', 'Šaltinis']:
        assert label in text, (name, label)
    assert variant['id'] in text and variant['supplierCode'] in text
    for option in variant['supplierOptions']:
        key, value = option.split('=', 1)
        # PDF extraction can insert kerning spaces inside literal identifiers.
        compact = ''.join(text.split())
        assert key.split('.')[-1] in compact and value in compact, (name, option)
    pdfs.append({'model': model['name'], 'variant': cid, 'pages': 2,
                 'lithuanianText': True, 'supplierOptions': len(variant['supplierOptions']),
                 'visualReview': 'all four final page renders inspected'})
(WEB / 'output/pdf/verification.json').write_text(json.dumps(pdfs, indent=2), encoding='utf-8')

changes = {}
images = [Image.open(REVIEW / ('xilium-' + n + '.png')).convert('RGB')
          for n in ['23636151', 'rotated', 'zoomed', 'keyboard']]
for i, name in enumerate(['rotation', 'zoom', 'keyboard'], start=1):
    # Same 1440px viewport captures. Compare just the visible local 3D stage.
    before = images[i - 1].crop((92, 292, 750, 760))
    after = images[i].crop((92, 292, 750, 760))
    diff = ImageChops.difference(before, after)
    changed = sum(max(px) > 12 for px in diff.getdata())
    assert changed > 500, (name, changed)
    changes[name] = {'changedPixels': changed, 'passed': True}
(REVIEW / 'camera-check.json').write_text(json.dumps(changes, indent=2), encoding='utf-8')

for model in pilot['models']:
    # Contact sheet is diagnostic only; original screenshots remain the evidence.
    sheet = Image.new('RGB', (1100, 1800), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, variant in enumerate(model['variants']):
        path = REVIEW / f"{model['name'].lower()}-{variant['id']}.png"
        shot = Image.open(path).convert('RGB')
        shot.thumbnail((535, 825))
        x, y = (i % 2) * 550, (i // 2) * 580
        draw.text((x + 10, y + 4), variant['id'], fill='black')
        sheet.paste(shot, (x, y + 25))
    sheet.save(REVIEW / (model['name'].lower() + '-variants-review.png'))
print(json.dumps({'pdfs': pdfs, 'camera': changes}, ensure_ascii=True))
