"""Verify generated files and coverage without modifying the catalog."""
import hashlib, json, statistics
from pathlib import Path
from urllib.parse import urlsplit
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
PUBLIC=ROOT/'web/public'
CONTENT=ROOT/'web/content'
REPORT=ROOT/'research/product-images-background-2026-10-11'
seed=json.loads((CONTENT/'seed.json').read_text(encoding='utf8'))
mapping=json.loads((CONTENT/'optimized-product-images.json').read_text(encoding='utf8'))
manifest=json.loads((REPORT/'manifest.json').read_text(encoding='utf8'))
entries=[row for row in manifest['entries'] if 'default' in row]
previous=json.loads((ROOT/'research/product-images-2026-10-11/manifest.json').read_text(encoding='utf8'))
originals={row['key']:row for row in previous['entries']}
assert all(row['sourceSha256']==originals[row['key']]['sourceSha256'] for row in entries if row['key'] in originals), 'Original source bytes changed'
lookup={alias:row for row in entries for alias in row['aliases']}
assert not [row for row in manifest['entries'] if row.get('error')], 'Supplier download failures'
references={p['image'] for p in seed['products'] if p['image']}
references|={line['image'] for line in seed['lines'] if line.get('image')}
references|={src for p in seed['products'] for src in p['gallery'][:12]}
references|={c['image'] for p in seed['products'] for c in p['configurations'] if c.get('image')}
preserved=sorted(src for src in references if src not in mapping and urlsplit(src).path.lower().endswith(('.svg','.gif')))
missing=sorted(src for src in references if src not in mapping and src not in preserved)
assert not missing, f'Unprepared catalog images: {missing}'
count=0
for row in entries:
    for file in row['files']:
        path=PUBLIC/file['path'].lstrip('/')
        assert path.is_file(), str(path)
        data=path.read_bytes()
        assert hashlib.sha256(data).hexdigest()==file['sha256'], str(path)
        with Image.open(path) as image:
            assert image.size==(file['width'],file['height'])
            assert image.format=='WEBP'
            assert image.width<=row['sourceDimensions'][0], 'Upscaled source'
            if row['treatment'] != 'source-alpha-preserved':
                assert image.convert('RGBA').getextrema()[3][0] == 255, 'New transparency damaged the supplier background'
            assert row['cropRectangle'][0]>=0 and row['cropRectangle'][1]>=0
            assert row['cropRectangle'][2]<=row['sourceDimensions'][0] and row['cropRectangle'][3]<=row['sourceDimensions'][1]
        count+=1
primaries=[lookup[p['image']] for p in seed['products'] if p['image']]
assert len(primaries)==255
assert all(row['sourceDimensions'][0]>=1600 for row in primaries), 'Low resolution primary photo'
sizes=[next(file['bytes'] for file in row['files'] if file['width']==400) for row in primaries]
result={'products':len(primaries),'catalogReferences':len(references),'uniquePreparedImages':len(entries),'verifiedWebpFiles':count,'primarySourceMinimumWidth':min(row['sourceDimensions'][0] for row in primaries),'primary400MedianBytes':statistics.median(sizes),'primary400MaximumBytes':max(sizes),'primary400TotalBytes':sum(sizes),'clientAliasBytes':(CONTENT/'home-product-images.json').stat().st_size,'fullServerIndexBytes':(CONTENT/'optimized-product-images.json').stat().st_size}
result['preservedVectorAndAnimationReferences']=preserved
result['backgroundsPreserved']=sum(row['treatment']=='source-background-preserved' for row in entries)
result['sourceAlphaPreserved']=sum(row['treatment']=='source-alpha-preserved' for row in entries)
result['outerFramesCropped']=sum(row['treatment']=='outer-frame-cropped-background-preserved' for row in entries)
result['introducedTransparency']=0
(REPORT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(result,ensure_ascii=False,indent=2))
