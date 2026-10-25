"""Fetch each supplier example's actual angle photographs, preserving evidence."""
import json,time,urllib.request,urllib.parse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
ROOT=Path(__file__).resolve().parents[2];REPORT=ROOT/'research/full-product-galleries-2026-10-12';CACHE=REPORT/'configuration-responses';CACHE.mkdir(parents=True,exist_ok=True)
rows=json.loads((ROOT/'data/configurations.json').read_text(encoding='utf8'))
def fetch(row):
 cid=row['id'];path=CACHE/(cid+'.json');url=row['gallery_api_url']
 if not cid.isdigit() or not url.startswith('https://www.nowystyl.com/iapi/configurations/?'):raise ValueError('Unexpected supplier endpoint')
 if path.exists():data=json.loads(path.read_text(encoding='utf8'))
 else:
  for attempt in range(3):
   try:
    with urllib.request.urlopen(urllib.request.Request(url,data=b'',method='POST',headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.nowystyl.com/','Accept':'application/json','X-Requested-With':'XMLHttpRequest'}),timeout=25) as response:data=json.loads(response.read(3000000))
    path.write_text(json.dumps(data,ensure_ascii=False),encoding='utf8');break
   except Exception as e:
    if attempt==2:return {'id':cid,'error':str(e),'url':url}
    time.sleep(.5*(attempt+1))
 photos=[];evidence=[]
 for item in data.get('items',[]):
  src=item.get('picture',{}).get('src') or item.get('download');p=urllib.parse.urlsplit(src or '')
  if p.scheme=='https' and p.hostname=='www.nowystyl.com' and p.path.startswith('/getmedia/') and p.path.lower().endswith(('.jpg','.jpeg','.png','.webp')) and src not in photos:
   photos.append(src);evidence.append({'url':src,'caption':item.get('text',''),'configurationId':cid,'productId':row['product_id']})
 return {'id':cid,'productId':row['product_id'],'url':url,'images':photos,'photoEvidence':evidence,'success':data.get('success',False)}
results=[]
with ThreadPoolExecutor(max_workers=6) as pool:
 for future in as_completed([pool.submit(fetch,row) for row in rows]):
  results.append(future.result())
  if len(results)%100==0:print('Fetched',len(results),'/',len(rows),flush=True)
(REPORT/'configuration-galleries.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'web/content/configuration-galleries.json').write_text(json.dumps({r['id']:r['images'] for r in results if r.get('images')},ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(json.dumps({'configurations':len(results),'withGalleries':sum(bool(r.get('images')) for r in results),'images':sum(len(r.get('images',[])) for r in results),'errorCount':sum(bool(r.get('error')) for r in results)}),flush=True)
