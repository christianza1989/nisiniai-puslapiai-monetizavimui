from pathlib import Path
from PIL import Image
import hashlib,json,datetime
root=Path(__file__).resolve().parents[2];site=Path(__file__).parent
families=json.loads((site/'media-handyman/assets.json').read_text(encoding='utf-8'));records=[]
for f in families:
    original=json.loads((root/'content-studio/data/media-originals/auksarankiams'/(f['groupId']+'.json')).read_text(encoding='utf-8'))
    source=root/'content-studio/data/media-originals/auksarankiams'/original['filename'];im=Image.open(source);im.load()
    assert hashlib.sha256(source.read_bytes()).hexdigest()==original['sourceSha256']
    row={'name':f['name'],'groupId':f['groupId'],'source':original,'sourceDecoded':True,'sourceFormat':im.format,'sourceSize':im.size,'sourcePrivate':True,'variants':[]}
    for v in f['variants']:
        dest=root/'output/auksarankiams-production/public/content-assets/auksarankiams'/Path(v['src']).name
        data=dest.read_bytes();vm=Image.open(dest);vm.load()
        assert vm.format=='WEBP';assert vm.size==(v['width'],v['height']);assert v['width']<=im.width;assert len(data)==v['bytes'];assert hashlib.sha256(data).hexdigest()==v['sha256'];assert not vm.getexif()
        row['variants'].append({'path':v['src'],'size':vm.size,'bytes':len(data),'sha256':v['sha256'],'decoded':True,'exif':False,'noUpscale':True})
    assert [v['width'] for v in f['variants']]==[1536,1200,800,640,360]
    records.append(row)
(site/'qa/MEDIA-BINARY-VERIFICATION.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sharedImporter':'content-studio/src/model.mjs saveResponsiveAsset → image-pipeline.mjs','families':records},ensure_ascii=False,indent=2),encoding='utf-8')
print('Four originals decoded; 20 public WebP sizes, hashes, EXIF absence and no-upscale verified.')
