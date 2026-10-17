"""Prepare factual Gemini inputs only. Does not author, import or accept prose."""
import argparse,json
from pathlib import Path
from capture_structure import read,save,sha,now


def main():
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path('D:/Core/output/ergonomic-chairs-structure-20261017'));a=p.parse_args()
    inventory=read(a.root/'INVENTORY.json');offline=read(a.root/'prepared/OFFLINE-STATUS.json')
    ready={r['job']:r for r in offline['rows'] if r['result']=='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY'}
    priorities=read(Path('D:/Core/output/ergonomic-admin-launch-20261017/PRIORITETAI.json')).get('order',[])
    rank={key:i for i,key in enumerate(priorities)}
    jobs=sorted(inventory['queue'],key=lambda j:min([rank.get(k,100000+i) for i,k in enumerate(j['modelKeys'])]))
    tasks=[]
    for job in jobs:
        row=ready.get(job['job'])
        if not row:continue
        directory=a.root/'prepared'/job['job'];facts=read(directory/'FACTS.private.json')
        options={};descriptions=[];dimensions={};finishes={}
        for state in facts['states']:
            if state['sourceDescription'] not in descriptions:descriptions.append(state['sourceDescription'])
            for field,value in state['properties'].items():
                cls=field.split('.')[0];record={k:value.get(k) for k in ['label','value','text','visible','editable']}
                if cls.endswith(('_OPTIONS','_DIMENSIONS')) or field.rsplit('.',1)[-1].startswith('D') and '_CLASSIFICATION' not in cls:
                    target=options if cls.endswith('_OPTIONS') else dimensions
                    if record not in target.setdefault(field,[]):target[field].append(record)
                elif cls.endswith('_FINISHES'):
                    if record not in finishes.setdefault(field,[]):finishes[field].append(record)
        source={'modelKey':job['modelKeys'][0],'code':job['code'],'descriptions':descriptions,'construction':options,'dimensions':dimensions,'actualFixedOrImplicitFinishes':finishes}
        task={'at':now(),'job':job['job'],'key':job['modelKeys'][0],'writer':{'provider':'Gemini App','model':'4 Argon','thinking':'low'},
            'sourceSha256':sha(json.dumps(source,sort_keys=True,ensure_ascii=False).encode()),'runtimeSha256':row['runtimeSha256'],
            'source':source,'generalCopyContract':{'summary':'string, iki700ženklų','paragraphs':'2–5pastraipos, tik originaliais faktais'},
            'instructions':'Rašyk lietuviškai pagal Core CONTENT_CORE ir kalbos kokybės procesą, kaip Xilium: konkretus modelio aprašymas, konstrukcijos skirtumai ir darbo vietai svarbūs tikri pasirinkimai. Gamintojų pavadinimų, netikrų kainų, sertifikatų, apkrovų ar nepatvirtintų privalumų nerodyk. Vartok linija, ne šeima. Spalvų konfigūratoriuje pasirinkti negalima; nežadėk apmušalų ar spalvų pasirinkimo. Kitos spalvos – tik teirautis. Išsaugok tikrus numatytos apdailos ir netiesioginių pokyčių faktus. Nepervadink originalių kodų. Atskirai paruošk realių konstrukcijos opcijų aprašymus ConfigurableArticle formatu pagal dabartinį Core kontraktą; jeigu opcijų nėra, jų nekurk. Bendrą JSON ir opcijų JSON rašyk atskirais atsakymais, kad liktų kiekvienas nepakeistas Gemini originalas. Prieš perduodamas pats patikrink faktus ir lietuvių kalbą.',
            'importNote':'sourceSha256 is a private factual receipt, not the admin baseRevisionHash. Obtain the current exact model revision from the protected admin task at authoring/import, retain each original Gemini response/conversation and perform revision-bound factual/language review.',
            'status':'AWAITING_REAL_GEMINI_AUTHORING','authoringComplete':False,'imported':False,'modelAccepted':False}
        output=a.root/'TEXT-TASKS'/(job['job']+'.json');save(output,task)
        tasks.append({'job':job['job'],'key':task['key'],'file':str(output),'sourceSha256':task['sourceSha256'],'runtimeSha256':task['runtimeSha256']})
    save(a.root/'TEXT-TASKS/QUEUE.json',{'at':now(),'tasks':tasks,'authored':0,'imported':0,'providerBlocked':True})
    print(json.dumps({'factualTasks':len(tasks),'authored':0,'nativeRequests':0}))


if __name__=='__main__':main()
