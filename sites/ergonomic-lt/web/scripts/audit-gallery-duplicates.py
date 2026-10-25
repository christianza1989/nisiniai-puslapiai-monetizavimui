"""Compare actual supplier pixels; never use fuzzy similarity to remove views."""
import json,hashlib,io,time,urllib.parse,http.client,threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from collections import defaultdict
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'research/gallery-duplicates-2026-10-12'
CACHE=REPORT/'fingerprints';CACHE.mkdir(parents=True,exist_ok=True)
sources=[r['source'] for r in json.loads((ROOT/'research/full-product-galleries-2026-10-12/gallery-photo-audit.json').read_text(encoding='utf8'))['metrics']]
connections=threading.local()
def fingerprint(source,width):
    cache=CACHE/(hashlib.sha256(source.encode()).hexdigest()[:24]+f'-{width}.json')
    if cache.exists():return json.loads(cache.read_text(encoding='utf8'))
    parsed=urllib.parse.urlsplit(source)
    url=urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path,urllib.parse.urlencode(urllib.parse.parse_qsl(parsed.query)+[('width',width)]),''))
    for attempt in range(3):
        try:
            if not getattr(connections,'current',None):connections.current=http.client.HTTPSConnection('www.nowystyl.com',timeout=30)
            connections.current.request('GET',urllib.parse.urlsplit(url).path+'?'+urllib.parse.urlsplit(url).query,headers={'User-Agent':'Mozilla/5.0','Referer':'https://ergonomic-preview.pinet-azprekyba.workers.dev/'})
            response=connections.current.getresponse();data=response.read()
            if response.status!=200:raise RuntimeError(f'HTTP {response.status}')
            with Image.open(io.BytesIO(data)) as image:
                pixels=image.convert('RGBA');size=pixels.size
                digest=hashlib.sha256(str(size).encode()+pixels.tobytes()).hexdigest()
            result={'source':source,'width':width,'size':size,'pixelSha256':digest,'bytes':len(data)}
            cache.write_text(json.dumps(result),encoding='utf8');return result
        except Exception as e:
            if getattr(connections,'current',None):connections.current.close();connections.current=None
            if attempt==2:return {'source':source,'error':str(e)}
            time.sleep(.5*(attempt+1))
def batch(urls,width):
    rows=[]
    with ThreadPoolExecutor(max_workers=48) as pool:
        for future in as_completed([pool.submit(fingerprint,src,width) for src in urls]):
            rows.append(future.result())
            if len(rows)%500==0:print(f'{width}px {len(rows)}/{len(urls)}',flush=True)
    errors=[r for r in rows if 'error' in r]
    if errors:
        (REPORT/f'errors-{width}.json').write_text(json.dumps(errors,indent=2),encoding='utf8')
        raise RuntimeError(f'{len(errors)} fingerprint failures; metadata was not written')
    groups=defaultdict(list)
    for row in rows:groups[row['pixelSha256']].append(row['source'])
    return [sorted(group) for group in groups.values() if len(group)>1]

candidates=batch(sources,400)
groups=batch(sorted({src for group in candidates for src in group}),800)
identities={src:hashlib.sha256(group[0].encode()).hexdigest()[:24] for group in groups for src in group}
manifest=json.loads((ROOT/'research/product-images-background-2026-10-11/manifest.json').read_text(encoding='utf8'))
for row in manifest['entries']:
    identity=identities.get(row['key'])
    if identity:
        for alias in [row['default'],*row['aliases'],*[f['path'] for f in row['files']]]:identities[alias]=identity
(ROOT/'web/content/duplicate-product-photographs.json').write_text(json.dumps(identities,separators=(',',':')),encoding='utf8')
result={'sources':len(sources),'candidateGroups400':len(candidates),'verifiedGroups800':len(groups),'duplicateSourceCopies':sum(len(group)-1 for group in groups),'metadataKeys':len(identities),'groups':groups}
(REPORT/'duplicate-audit.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in result.items() if k!='groups'}),flush=True)
