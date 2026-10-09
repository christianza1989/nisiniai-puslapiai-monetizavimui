import json,re,pathlib
from html.parser import HTMLParser
root=pathlib.Path('C:/Users/Lenovo/.codex/tmp/madbeauty-next60-20261009/sources-next60')
class Visible(HTMLParser):
 def __init__(self):super().__init__();self.skip=0;self.parts=[]
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style','head','svg','nav','footer']:self.skip+=1
  if not self.skip and tag in ['p','div','h1','h2','h3','h4','li','br','article','main','section']:self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ['script','style','head','svg','nav','footer'] and self.skip:self.skip-=1
  if not self.skip and tag in ['p','div','h1','h2','h3','h4','li','article','main','section']:self.parts.append('\n')
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
records=json.load(open(root/'FETCH.json',encoding='utf-8'))
for record in records:
 p=pathlib.Path(record['file'])
 if p.suffix=='.pdf':
  from pypdf import PdfReader
  text='\n'.join(page.extract_text() for page in PdfReader(p).pages)
 else:
  parser=Visible();parser.feed(p.read_text(encoding='utf-8',errors='replace'));text=''.join(parser.parts)
 text='\n'.join(re.sub(r'\s+',' ',line).strip() for line in text.splitlines() if line.strip())
 (root/(record['id']+'.txt')).write_text(text,encoding='utf-8')
 print(record['id'],len(text))
