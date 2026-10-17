"""Prepare the Next.js seed from supplier exports and protected editorial pages."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from concurrent.futures import ThreadPoolExecutor
import json, hashlib, re, shutil, unicodedata
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'web'
PUBLIC = WEB / 'public'
CONTENT = WEB / 'content'
PUBLIC.mkdir(exist_ok=True)
CONTENT.mkdir(exist_ok=True)
source = json.loads((ROOT/'data/nextjs_catalog.json').read_text(encoding='utf-8'))
provenance = []
session = requests.Session()
session.headers['User-Agent'] = 'Ergonomic migration preparation (public assets)'

def slug(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-') or 'modelis'

def file_digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def fetch_asset(url, relative):
    target = PUBLIC/relative
    target.parent.mkdir(parents=True,exist_ok=True)
    if not target.exists():
        response = session.get(url,timeout=45)
        response.raise_for_status()
        if len(response.content)>20_000_000: raise ValueError('Asset too large')
        target.write_bytes(response.content)
    return {'path':'/'+relative.as_posix(), 'source':url, 'sha256':file_digest(target)}

def local_image(item):
    if item.get('local_path'):
        src = ROOT/'data'/item['local_path']
        if src.is_file():
            relative = Path('media')/src.name
            dst = PUBLIC/relative
            dst.parent.mkdir(exist_ok=True)
            shutil.copyfile(src,dst)
            provenance.append({'path':'/'+relative.as_posix(),'source':item.get('url'),'sha256':file_digest(dst)})
            return '/'+relative.as_posix()
    url = item.get('display_url') or item.get('url')
    return url if url and url.startswith('https://www.nowystyl.com/getmedia/') else None

assets = {a['id']:a for a in source['assets']}
categories = []
for c in source['categories']:
    icon = assets.get(c.get('icon_asset_id'),{})
    categories.append({'id':c['id'],'parentId':c['parent_id'],'name':c['name_lt'] or c['name_en'],
                       'nameEn':c['name_en'],'slug':slug(c['name_lt'] or c['name_en']),
                       'icon':local_image({'local_path':icon.get('local_path'),'url':c.get('icon_url')})})
cat_by_id = {c['id']:c for c in categories}
products = []
used_paths = set()
for p in source['products']:
    cat, sub = cat_by_id[p['category_id']],cat_by_id[p['subcategory_id']]
    product_slug = slug(p['name'])+'-'+sub['slug']
    path_key = cat['slug']+'/'+product_slug
    if path_key in used_paths: product_slug += '-'+p['id'][-8:]
    used_paths.add(cat['slug']+'/'+product_slug)
    # Page images describe a family overview. They must never be inherited by
    # individual examples; the runtime photo-attribution registry owns that step.
    images = [local_image(i) for i in p['images'] if i.get('role')!='document']
    images = list(dict.fromkeys(x for x in images if x))
    source_description = '\n\n'.join(s['text'].replace('\u200b','').strip() for s in p['sections']
        if s.get('source_module') and not s['text'].strip().lower().startswith(('gallery','functions and options')))
    # Lithuanian classification is factual; original narrative stays separately
    # available for translation, rather than invented technical claims.
    desc = f"{p['name']} – {sub['name'].lower()} iš {p['brand']} asortimento. Modelio variantą ir apdailą galite pasirinkti pagal gamintojo pavyzdines konfigūracijas. Dėl konkrečios komplektacijos ir kainos pateikite užklausą."
    products.append({'id':p['id'],'name':p.get('name_lt') or p['name'],'brand':p['brand'],
        'categoryId':p['category_id'],'subcategoryId':p['subcategory_id'],'categorySlug':cat['slug'],
        'slug':product_slug,'lineId':p['line_id'],'image':images[0] if images else None,'gallery':images,
        'description':desc,'sourceDescription':source_description,'sourceUrl':p['source_url'],
        'documents':p['documents'],'configurations':[{'id':x['id'],'name':f"Konfigūracija {n+1}",
            'description':x['description'],'image':x.get('image_url'),'gallery':[x['image_url']] if x.get('image_url') else [],'code':x.get('base_article_number'),
            'configurator':x.get('configurator_url')} for n,x in enumerate(p['configurations'])],
        'features':[],'isNew':p['is_new'],'published':False,'translationReviewed':False})
lines = []
detail_overrides=json.loads((CONTENT/'detail-image-overrides.json').read_text(encoding='utf8'))
for product in products:
    override=detail_overrides.get(product['id'])
    if override:
        provenance.append(fetch_asset(override['source'],Path(override['path'])))
        product['gallery'][0]='/'+override['path']
for line in source['lines']:
    related = [p for p in products if p['lineId']==line['id']]
    line_slug = slug(line['name'])
    if any(l['slug']==line_slug for l in lines): line_slug += '-'+line['id'][-8:]
    lines.append({'id':line['id'],'name':line['name'],'brand':line['brand'],'slug':line_slug,
                  'image':related[0]['image'] if related else local_image(line['images'][0]) if line['images'] else None,
                  'productIds':[p['id'] for p in related]})

handoff = ROOT/'legacy-content/islaikomi-8-puslapiai'
index = json.loads((handoff/'index.json').read_text(encoding='utf-8'))
legacy = []
old_asset_jobs = {}
allowed_tags = {'a','p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','b','i','blockquote','table','thead','tbody','tr','td','th','br','img','figure','figcaption','span','sup','sub','hr'}

def clean_editorial(raw, h1):
    soup = BeautifulSoup(raw,'html.parser')
    for node in list(soup.select('script,style,noscript,template,form,input,button,svg,iframe,select,textarea')): node.decompose()
    for node in list(soup.select('li.product,.products,.elementor-widget-woocommerce-products,.eael-product-grid')): node.decompose()
    for heading in list(soup.find_all('h1')):
        if heading.get_text(' ',strip=True)==h1: heading.decompose()
        else: heading.name='h2'
    for node in list(soup.find_all(True)):
        if node.name not in allowed_tags:
            node.unwrap(); continue
        original = dict(node.attrs)
        node.attrs = {key:original[key] for key in ('href','src','alt','title','id','colspan','rowspan') if key in original}
        if node.name=='a':
            href=node.get('href','')
            if href.startswith('https://ergonomic.lt/'): node['href']=href.replace('https://ergonomic.lt','',1)
            if href.lower().startswith(('javascript:','data:')): del node['href']
        if node.name=='img':
            image_url=next((original.get(k) for k in ('nitro-lazy-src','data-src','data-lazy-src','src') if original.get(k)), '')
            # Nitro CDN keeps the original WordPress path inside its URL.
            if '/ergonomic.lt/wp-content/uploads/' in image_url:
                image_url='https://ergonomic.lt/wp-content/uploads/'+image_url.split('/ergonomic.lt/wp-content/uploads/',1)[1]
            if image_url.startswith('//'): image_url='https:'+image_url
            if image_url.startswith('https://ergonomic.lt/wp-content/uploads/'):
                rel=unquote(urlsplit(image_url).path).lstrip('/')
                if '..' not in Path(rel).parts:
                    old_asset_jobs[image_url]=Path(rel)
                    node['src']='/'+rel
            elif image_url.startswith('https://'):
                node['src']=image_url
            node['loading']='lazy'
    return str(soup)

for item in index['pages']:
    folder=ROOT/item['folder']
    page=json.loads((folder/'page.json').read_text(encoding='utf-8'))
    headings=page['all_h1_h6']
    h1=next((h.get('text') for h in headings if h.get('level') in (1,'h1')), None)
    if not h1:
        original=BeautifulSoup((folder/'baseline.html').read_text(encoding='utf-8'),'html.parser')
        h1=original.find('h1').get_text(' ',strip=True)
    body='\n'.join(clean_editorial(b['html'],h1) for b in page['editorial_blocks'])
    body_soup=BeautifulSoup(body,'html.parser')
    if body_soup.select('a:has(img)'):
        # Retain the original text and illustrations in a compact category grid.
        image_links=[a for a in body_soup.select('a:has(img)') if a.find_next('h4') and a.find_next('h4').get_text(' ',strip=True) in {'Ergonominiai stalai','Ergonominės kėdės','Balansinės kėdės','Priedai'}]
        if image_links:
            grid=body_soup.new_tag('div',attrs={'class':'legacy-home-categories'})
            image_links[0].insert_before(grid)
            for image_link in image_links:
                heading=image_link.find_next('h4')
                if not heading: continue
                figure=body_soup.new_tag('figure')
                image_link['aria-label']=heading.get_text(' ',strip=True)
                figure.append(image_link.extract())
                figure.append(heading.extract())
                grid.append(figure)
            for link in grid.find_all('a',href='/shop/priedai/'):
                link['href']='/uzklausa/?tema=Priedai'
    toc=[]
    for n,h in enumerate(body_soup.find_all('h2')):
        h['id']=h.get('id') or slug(h.get_text(' ',strip=True))+'-'+str(n)
        toc.append({'id':h['id'],'text':h.get_text(' ',strip=True)})
    images=[{'url':n['src'],'alt':n.get('alt','')} for n in body_soup.find_all('img') if n.get('src')]
    legacy.append({'path':urlsplit(page['url']).path,'title':page['title'][0],
        'description':page['description'][0] if page['description'] else None,'h1':h1,
        'html':str(body_soup),'text':body_soup.get_text(' ',strip=True),'headings':toc,
        'image':images[0]['url'] if images else None,'sourceHash':page['source_html_sha256'],
        'expectedBlocks':[b['text'] for b in page['editorial_blocks']],'oldImages':images})

failures=[]
def download_old(job):
    url, relative = job
    try: return fetch_asset(url, relative)
    except Exception as e: return {'source':url,'error':str(e)}
with ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(download_old,old_asset_jobs.items()):
        (failures if 'error' in result else provenance).append(result)

# A genuine supplier interior photograph, not an invented Ergonomic project.
hero_url='https://www.nowystyl.com/getmedia/6a867ce7-c8af-4b8d-9761-c0ee447f194d/ns-britenet-poland-06-13021.jpg?width=1800'
provenance.append(fetch_asset(hero_url,Path('media/office-interior.jpg')))
provenance.append(fetch_asset('https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/Manrope%5Bwght%5D.ttf',Path('fonts/manrope.ttf')))
fetch_asset('https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt',Path('fonts/OFL.txt'))
seed={'categories':categories,'products':products,'lines':lines,'legacy':legacy,
      'hero':'/media/office-interior.jpg','provenance':provenance}
(CONTENT/'seed.json').write_text(json.dumps(seed,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(CONTENT/'asset-provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
(CONTENT/'asset-errors.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2),encoding='utf-8')
old_decisions=json.loads((ROOT/'legacy-content/senu-produktu-url-sprendimai.json').read_text(encoding='utf-8'))
(CONTENT/'legacy-product-paths.json').write_text(json.dumps([urlsplit(d['old_url']).path for d in old_decisions['decisions']],indent=2),encoding='utf-8')
assert len(products)==255 and len(legacy)==8 and len(categories)==28
print(json.dumps({'products':len(products),'categories':len(categories),'families':len(lines),'protected_pages':len(legacy),
                  'editorial_blocks':sum(len(p['expectedBlocks']) for p in legacy),'old_asset_failures':len(failures)}))
