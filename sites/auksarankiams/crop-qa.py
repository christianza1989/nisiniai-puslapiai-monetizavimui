from PIL import Image
from pathlib import Path
root=Path(__file__).parent/'qa'
for name in ['home-390','home-320','home-768','gidai-390','baldu-surinkimo-uzklausa-390','smulkiu-darbu-sarasas-390','darbu-ivertinimas-390','kontaktai-390','privatumas-390','redakcija-390','home-zoom200','gidai-zoom200','baldu-surinkimo-uzklausa-zoom200','smulkiu-darbu-sarasas-zoom200','darbu-ivertinimas-zoom200','kontaktai-zoom200']:
    im=Image.open(root/(name+'.png'));w,h=im.size
    for label,y in [('top',0),('middle',max(0,h//2-500)),('end',max(0,h-1100))]:
        im.crop((0,y,w,min(h,y+1100))).save(root/(name+'-'+label+'.png'))
print('Readable crops preserve actual screenshots; they are review evidence, not site assets.')
