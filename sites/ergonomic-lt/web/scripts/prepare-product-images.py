"""Prepare faithful, responsive supplier images; never overwrite source exports.

Keep all source pixels, including the original studio background and shadows.
Only a distinct, uniform outer frame may be cropped as one rectangle.
Original files, retrieval URLs, dimensions and digests remain in the report.
"""
from __future__ import annotations
import argparse, hashlib, io, json, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'web/public'
CONTENT = ROOT / 'web/content'
SOURCE_REPORT = ROOT / 'research/product-images-2026-10-11'
REPORT = ROOT / 'research/product-images-background-2026-10-11'
VERSION = 'original-background-frame-crop-v1-webp82'
WIDTHS = (160, 400, 800, 1600)
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'Accept': 'image/webp,image/*,*/*;q=0.8', 'Referer': 'https://www.nowystyl.com/'}

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

PRIOR = {row['key']: row for row in read(SOURCE_REPORT / 'manifest.json')['entries']}

def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    os.replace(temporary, path)

def canonical(url):
    parsed = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parsed.query) if k.lower() not in {'height', 'width', 'quality', 'mode', 'format'}]
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), ''))

def permitted(url):
    p = urlsplit(url)
    return p.scheme == 'https' and p.hostname in {'www.nowystyl.com', 'dam.nowystyl.com'} and (p.path.startswith('/getmedia/') or p.hostname == 'dam.nowystyl.com') and p.path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))

def collect():
    seed = read(CONTENT / 'seed.json')
    source = read(ROOT / 'data/nextjs_catalog.json')
    local_sources = {}
    for p in source['products']:
        for i in p['images']:
            if i.get('local_path') and i.get('url'):
                local_sources['/media/' + Path(i['local_path']).name] = i['url']
    for item in read(CONTENT / 'asset-provenance.json'):
        if item.get('path') and item.get('source'):
            local_sources.setdefault(item['path'], item['source'])
    for item in read(CONTENT / 'detail-image-overrides.json').values():
        local_sources['/' + item['path']] = item['source']
    pilot_images = set()
    products = {p['id']: p for p in seed['products']}
    for model in read(CONTENT / 'configurator-pilot.json')['models']:
        configurations = {c['id']: c for c in products[model['productId']]['configurations']}
        for variant in model['variants']:
            configuration = configurations.get(variant['id'])
            if configuration and configuration.get('image'):
                local_sources[variant['image']] = configuration['image']
                pilot_images.add(variant['image'])
    primary = {p['image'] for p in seed['products'] if p['image']} | {line['image'] for line in seed['lines'] if line.get('image')}
    # Souly's old primary is a small animation with an empty first frame. Use
    # the same product's supplier still photograph instead of freezing the GIF.
    for p in seed['products']:
        if p['image'] and p['image'].lower().endswith('.gif'):
            still = next((url for url in p['gallery'] if permitted(url)), None)
            if still:
                local_sources[p['image']] = still
    refs = primary | pilot_images | {url for p in seed['products'] for url in p['gallery'][:12]} | {c['image'] for p in seed['products'] for c in p['configurations'] if c.get('image')}
    # Home chair/category photos already downloaded in higher resolution.
    for folder in ('media/home', 'media/home-selected01'):
        refs.update('/' + p.relative_to(PUBLIC).as_posix() for p in (PUBLIC / folder).glob('*') if p.suffix.lower() in {'.jpg', '.png', '.webp'})
    jobs = {}
    for ref in sorted(refs):
        local = PUBLIC / ref.lstrip('/') if ref.startswith('/') else None
        url = local_sources.get(ref, ref if permitted(ref) else None)
        if url and not permitted(url):
            url = None
        if not url and (not local or not local.is_file()):
            continue
        key = canonical(url) if url else ref
        job = jobs.setdefault(key, {'key': key, 'source': url, 'aliases': set(), 'locals': [], 'primary': False})
        job['aliases'].add(ref)
        if url:
            job['aliases'].add(url)
        if local and local.is_file() and local not in job['locals']:
            job['locals'].append(local)
        job['primary'] |= ref in primary or ref.startswith('/media/home/')
    return sorted(jobs.values(), key=lambda j: (not j['primary'], j['key']))

def backdrop_color(image):
    rgba = image.convert('RGBA')
    if rgba.getextrema()[3][0] < 255:
        return None
    pixels = np.asarray(rgba.convert('RGB')).astype(np.int16)
    h, w = pixels.shape[:2]
    edge = np.concatenate((pixels[0, ::max(1,w//80)], pixels[-1, ::max(1,w//80)], pixels[::max(1,h//80),0], pixels[::max(1,h//80),-1]))
    bg = np.median(edge, axis=0).astype(np.int16)
    if min(bg) >= 225 and max(bg)-min(bg) <= 8 and np.mean(np.max(np.abs(edge-bg),axis=1)<=4) >= .94:
        return '#' + ''.join(f'{int(c):02x}' for c in bg)
    return None

def preserve_background(image):
    """Crop only a four-sided, distinct frame; never classify furniture pixels."""
    original = image.convert('RGBA')
    w,h = original.size
    full = (0,0,w,h)
    if original.getextrema()[3][0] < 255:
        return original, 'source-alpha-preserved', full
    pixels = np.asarray(original.convert('RGB')).astype(np.int16)
    bg = np.median(np.stack([pixels[0,0],pixels[0,-1],pixels[-1,0],pixels[-1,-1]]),axis=0)
    if min(bg)<225 or max(bg)-min(bg)>8:
        return original.convert('RGB'), 'source-background-preserved', full
    same = np.max(np.abs(pixels-bg),axis=2)<=2
    rows = same.mean(axis=1)>=.999
    columns = same.mean(axis=0)>=.999
    def thickness(flags):
        stops = np.flatnonzero(~flags)
        return int(stops[0]) if len(stops) else len(flags)
    top,bottom,left,right = thickness(rows),thickness(rows[::-1]),thickness(columns),thickness(columns[::-1])
    if not all((top,bottom,left,right)) or max(top,bottom)>h*.12 or max(left,right)>w*.12:
        return original.convert('RGB'), 'source-background-preserved', full
    rectangle = (left,top,w-right,h-bottom)
    cropped = original.crop(rectangle)
    inner = backdrop_color(cropped)
    if inner is None or max(abs(int(inner[i:i+2],16)-bg[n]) for n,i in enumerate((1,3,5)))<6:
        return original.convert('RGB'), 'source-background-preserved', full
    return cropped.convert('RGB'), 'outer-frame-cropped-background-preserved', rectangle


def prepare(job):
    digest = hashlib.sha256((VERSION + '\n' + job['key']).encode()).hexdigest()[:20]
    report_file = REPORT / 'entries' / (digest + '.json')
    if report_file.exists():
        prior = read(report_file)
        if all((PUBLIC / f['path'].lstrip('/')).is_file() for f in prior['files']):
            prior['aliases'] = sorted(job['aliases'])
            return prior
    raw_file = REPORT / 'sources' / (digest + '.image')
    data = None
    selected_local = None
    for path in job['locals']:
        with Image.open(path) as original:
            if original.width >= 1400 or not job['source']:
                data = path.read_bytes()
                selected_local = str(path)
                break
    error = None
    fetched = None
    if data is None and raw_file.exists():
        data = raw_file.read_bytes()
    if data is None and job['key'] in PRIOR:
        prior = PRIOR[job['key']]
        old_digest = Path(prior['default']).parent.name.split('-')[0]
        cached = SOURCE_REPORT / 'sources' / (old_digest + '.image')
        if cached.exists():
            data = cached.read_bytes()
            if hashlib.sha256(data).hexdigest() != prior['sourceSha256']:
                raise ValueError('Cached source digest does not match original evidence')
    if data is None and job['source']:
        p = urlsplit(canonical(job['source']))
        fetched = urlunsplit((p.scheme, p.netloc, p.path, (p.query + '&' if p.query else '') + 'width=1600', ''))
        for attempt in range(3):
            try:
                with urllib.request.urlopen(urllib.request.Request(fetched, headers=HEADERS), timeout=30) as response:
                    if urlsplit(response.url).hostname not in {'www.nowystyl.com', 'dam.nowystyl.com'}:
                        raise ValueError('Unexpected asset redirect')
                    data = response.read(25_000_001)
                    if len(data) > 25_000_000:
                        raise ValueError('Supplier asset exceeds 25 MB')
                break
            except Exception as exc:
                error = str(exc)
                if attempt < 2:
                    time.sleep(.3 * (attempt+1))
        if data:
            raw_file.parent.mkdir(parents=True, exist_ok=True)
            raw_file.write_bytes(data)
    if data is None and job['locals']:
        selected_local = str(job['locals'][0])
        data = job['locals'][0].read_bytes()
    if not data:
        return {'key': job['key'], 'aliases': sorted(job['aliases']), 'error': error or 'No image source'}
    with Image.open(io.BytesIO(data)) as opened:
        if opened.width * opened.height > 30_000_000:
            raise ValueError('Supplier image exceeds 30 megapixels')
        source = ImageOps.exif_transpose(opened).convert('RGBA')
    source_size = source.size
    prepared, treatment, rectangle = preserve_background(source)
    maximum = min(1600, prepared.width)
    height = round(prepared.height * maximum / prepared.width)
    widths = sorted({width for width in WIDTHS if width <= maximum} | {maximum})
    directory = PUBLIC / 'media/products-v2' / f'{digest}-{maximum}x{height}'
    directory.mkdir(parents=True, exist_ok=True)
    files = []
    for width in widths:
        image = prepared.resize((width, round(prepared.height * width / prepared.width)), Image.Resampling.LANCZOS)
        path = directory / f'{width}.webp'
        image.save(path, 'WEBP', quality=82, method=4, exact=True)
        files.append({'path': '/' + path.relative_to(PUBLIC).as_posix(), 'width': image.width, 'height': image.height, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    default = next((f for f in files if f['width'] >= 800), files[-1])
    result = {'key': job['key'], 'aliases': sorted(job['aliases']), 'source': job['source'], 'retrieved': fetched, 'localSource': selected_local, 'sourceDimensions': source_size, 'sourceBytes': len(data), 'sourceSha256': hashlib.sha256(data).hexdigest(), 'treatment': treatment, 'cropRectangle': rectangle, 'backdrop': backdrop_color(prepared), 'default': default['path'], 'files': files}
    if error:
        result['retrievalWarning'] = error
    atomic_json(report_file, result)
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int)
    parser.add_argument('--workers', type=int, default=6)
    args = parser.parse_args()
    jobs = collect()
    if args.limit:
        jobs = jobs[:args.limit]
    print('Preparing', len(jobs), 'unique supplier/local images', flush=True)
    rows = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(prepare, job): job for job in jobs}
        for future in as_completed(futures):
            job = futures[future]
            try:
                rows.append(future.result())
            except Exception as error:
                rows.append({'key': job['key'], 'aliases': sorted(job['aliases']), 'error': str(error)})
            if len(rows) % 50 == 0:
                print('Prepared', len(rows), '/', len(jobs), 'failures', sum('error' in r for r in rows), flush=True)
    mapping = {alias: row['default'] for row in rows if row.get('default') for alias in row['aliases']}
    atomic_json(CONTENT / 'optimized-product-images.json', dict(sorted(mapping.items())))
    # Small client alias map for local/home images and saved quote thumbnails.
    # The full supplier source index
    # stays in the server catalog instead of entering every visitor's JS bundle.
    atomic_json(CONTENT / 'home-product-images.json', {key: value for key, value in sorted(mapping.items()) if key.startswith('/media/')})
    atomic_json(CONTENT / 'product-image-backdrops.json', {Path(row['default']).parent.name.split('-')[0]: row['backdrop'] for row in rows if row.get('backdrop')})
    revisions = {Path(PRIOR[row['key']]['default']).parent.name.split('-')[0]: Path(row['default']).parent.name for row in rows if row.get('default') and row['key'] in PRIOR}
    atomic_json(CONTENT / 'product-image-revisions.json', revisions)
    atomic_json(REPORT / 'manifest.json', {'version': VERSION, 'entries': sorted(rows, key=lambda row: row['key'])})
    summary = {'images': len(rows), 'optimized': sum('default' in r for r in rows), 'failures': [r for r in rows if 'error' in r], 'treatments': {t: sum(r.get('treatment') == t for r in rows) for t in sorted({r['treatment'] for r in rows if 'treatment' in r})}, 'sourceBytes': sum(r.get('sourceBytes', 0) for r in rows), 'webp800Bytes': sum(next((f['bytes'] for f in r.get('files', []) if f['width'] == 800), 0) for r in rows), 'files': sum(len(r.get('files', [])) for r in rows)}
    atomic_json(REPORT / 'summary.json', summary)
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    if summary['failures']:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
