import json,re,pathlib,sys
from html.parser import HTMLParser
sys.stdout.reconfigure(encoding='utf-8')
root=pathlib.Path('C:/Users/Lenovo/.codex/tmp/madbeauty-next60-20261009/sources-recheck')
class Visible(HTMLParser):
 def __init__(self):super().__init__();self.skip=0;self.parts=[]
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style','head','svg','nav','footer']:self.skip+=1
  if not self.skip and tag in ['p','div','h1','h2','h3','h4','li','br','article','main','section']:self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ['script','style','head','svg','nav','footer'] and self.skip:self.skip-=1
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
rows=json.load(open(root/'FETCH.json',encoding='utf-8'))
for row in rows:
 parser=Visible();parser.feed(pathlib.Path(row['file']).read_text(encoding='utf-8',errors='replace'))
 text='\n'.join(re.sub(r'\s+',' ',line).strip() for line in ''.join(parser.parts).splitlines() if line.strip());(root/(row['id']+'.txt')).write_text(text,encoding='utf-8')
 if len(sys.argv)>1 and row['id'] in sys.argv[1:]:
  print('\nSOURCE',row['id'])
  if row['id'].startswith('S5'):print(text[-2800:])
  else:
   lines=text.splitlines();patterns={'S01':'be dangos|su geliniu|nuėmimu|Maxi','S27':'Veido valymas|Ultragars|79|69','S38':'Ultragars|Hydra|LED|mechaninis|59|69|85','S34':'AirTouch|Balayage|220|280','S89':'Titan|papuošal|helix|Helix|Conch|Industr|kotelio|Koteli|Lobe','S90':'Studex|Inverness|75|30|40','S28':'negydom|gydom|asmens sveikatos|leidim','S29':'medic|licenc|grožio|higienos'}
   indices=[i for i,line in enumerate(lines) if re.search(patterns.get(row['id'],'.'),line,re.I)];shown=set()
   for i in indices:
    for k in range(max(0,i-1),min(len(lines),i+5)):
     if k not in shown:print(str(k+1)+': '+lines[k]);shown.add(k)
