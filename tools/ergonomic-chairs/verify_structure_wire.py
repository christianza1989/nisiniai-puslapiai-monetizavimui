"""Independent raw-response readback. Does not import the capture/parser class."""
import argparse, hashlib, json
from pathlib import Path
from xml.etree import ElementTree as ET
from structure_policy import closure,state_key,VERSION,require_transition


def sha(raw):return hashlib.sha256(raw).hexdigest()

def file_sha(path):
    digest=hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):digest.update(block)
    return digest.hexdigest()

def read(p):return json.loads(Path(p).read_bytes())
def require(value,message):
    if not value:raise ValueError(message)


def verify_initial_variant(insert,original):
    wire=[]
    for part in original.split(';'):
        if not part.strip():continue
        k,v=part.split('=',1)
        if len(v)>1 and v[0]=='_' and v[1].isdigit():v=v[1:]
        wire.append(k+'='+v)
    # No original variant means the manufacturer default insertion, whose
    # optional SOAP element is absent. It is not an invented empty preset.
    actual=insert.findtext('ofmlVariantCode')
    require((actual or '')==';'.join(wire),'ORIGINAL_INITIAL_VARIANT_BINDING')


def inside(root,relative):
    path=(root/relative).resolve();require(path.is_relative_to(root.resolve()),'PROOF_PATH_ESCAPE');return path


def parsed_snapshot(data,lists):
    d=ET.fromstring(data).find('.//return');require(d is not None,'NATIVE_ARTICLE_RESPONSE_REQUIRED')
    c=ET.fromstring(lists).findall('.//return')
    props={p.findtext('propClass')+'.'+p.findtext('propName'):{'label':p.findtext('propText'),'value':p.findtext('value/value'),
        'text':p.findtext('value/text'),'visible':p.findtext('visible')=='true','editable':p.findtext('editable')=='true'} for p in d.findall('properties')}
    choices={p.findtext('propClass')+'.'+p.findtext('propName'):[{'value':v.findtext('value'),'text':v.findtext('text'),
        'icon':v.findtext('smallIcon') or v.findtext('largeIcon'),'selectable':v.findtext('selectable')!='false'} for v in p.findall('values')] for p in c}
    return {'baseArticle':d.findtext('baseArticleNumber'),'properties':props,'choices':choices,
            'sourceDescription':{'short':d.findtext('shortText') or '','long':d.findtext('longText') or '','features':d.findtext('featureText') or ''},
            'sourceOrderText':d.findtext('variantCode') or ''}


def verify(root,job,session_path):
    from datetime import datetime,timezone
    cp=read(root/'CHECKPOINT.json');require(cp['job']==job['job'] and cp['policy']==VERSION,'EXACT_POLICY_AND_JOB_REQUIRED')
    session=ET.fromstring(session_path.read_bytes()).find('state').get('sessionId')
    receipts={};owned=set();finish_setters=0
    files=sorted((root/'wire').glob('*/RECEIPT.json'),key=lambda p:read(p)['at'])
    for file in files:
        r=read(file);intent=read(file.with_name('INTENT.json'));body=file.with_name('request.private').read_bytes();reply=file.with_name('response.private');url=file.with_name('url.private').read_text(encoding='utf8')
        require(sha(body)==r['requestSha256']==intent['requestSha256'] and file_sha(reply)==r['responseSha256'],'RAW_NATIVE_BYTES_CHANGED')
        require(sha(url.encode())==r['urlSha256']==intent['urlSha256'],'WIRE_URL_CHANGED')
        require(r['complete'] is True and r['status']==200,'INCOMPLETE_NATIVE_RESPONSE')
        if intent['method']=='POST':
            require(url=='https://s1.eaiws.pcon-solutions.com/4.19.1-002/EAI/Basket','NATIVE_SERVICE_IDENTITY')
            b=ET.fromstring(body).find('{http://schemas.xmlsoap.org/soap/envelope/}Body')[0]
            require(b.findtext('sessionId')==session,'ORIGINAL_SESSION_IDENTITY')
            method=b.tag.rsplit('}',1)[-1];require(method==r['action'],'RPC_ACTION_CHANGED')
            if method=='insertOFMLArticle':
                insert=b.find('insertInfo');require(insert.findtext('baseArticleNumber')==job['code'] and insert.findtext('seriesId')==job['series'],'ORIGINAL_ARTICLE_SERIES_BINDING')
                verify_initial_variant(insert,job['originalVariant'])
                item=ET.fromstring(reply.read_bytes()).findtext('.//return');require(bool(item),'REAL_INSERT_ITEM_REQUIRED');owned.add(item)
            else:
                require(b.findtext('itemId') in owned,'UNOWNED_SOURCE_ITEM')
                if method=='setPropertyValue':
                    require((b.findtext('propClass') or '').endswith(('_OPTIONS','_DIMENSIONS')),'FINISHES_SETTER_FOUND')
        else:require(url.startswith('https://s1.eaiws.pcon-solutions.com/4.19.1-002/session-cache/'+session+'/'),'EXACT_SESSION_GEOMETRY_URL')
        receipts[str(file.relative_to(root)).replace('\\','/')]=(r,reply,url)
    # Retain receipt metadata and response paths, never the entire model's
    # binary bodies. Graph policy needs these three snapshot fields only;
    # every complete original snapshot is still independently hashed below.
    states={}
    for key,ref in cp['states'].items():
        snapshot=read(inside(root,ref['file']))
        states[key]={field:snapshot[field] for field in ('baseArticle','properties','choices')}
    observations=list((root/'observations').glob('*.json'))
    for file in observations:
        s=read(file);require(s['stateKey']==state_key(s) and s['baseArticle']==job['code'],'SOURCE_SNAPSHOT_IDENTITY')
        chain=[receipts[p] for p in s['sourceWireProof']]
        actions=[r[0]['action'] for r in chain]
        end=len(chain);require(actions[-2:]==['getExportedGeometry','download'],'RAW_GEOMETRY_ORIGIN_REQUIRED')
        data=next(r for r in reversed(chain[:-2]) if r[0]['action']=='getArticleData')
        choices=next(r for r in reversed(chain[:-2]) if r[0]['action']=='getAllChoiceLists')
        parsed=parsed_snapshot(data[1].read_bytes(),choices[1].read_bytes())
        for key,value in parsed.items():require(s[key]==value,'NATIVE_SNAPSHOT_READBACK_'+key)
        exported=ET.fromstring(chain[-2][1].read_bytes()).findtext('.//return');require(exported==chain[-1][2]==s['geometry']['sourceUrl'],'EXPORTED_GEOMETRY_URL_BINDING')
        require(file_sha(inside(root,s['geometry']['file']))==s['geometry']['sha256']==file_sha(chain[-1][1]),'ORIGINAL_GEOMETRY_BYTES_CHANGED')
    for key,ref in cp['states'].items():require(sha(inside(root,ref['file']).read_bytes())==ref['sha256'] and state_key(states[key])==key,'SEALED_STATE_CHANGED')
    for edge in cp['edges']:
        require(edge.get('measured') is True and edge['from'] in states and edge['to'] in states,'REAL_EDGE_ENDPOINTS_REQUIRED')
        require_transition(states[edge['from']],edge['field'],edge['requested'])
        chain=[receipts[p] for p in edge['wireProof']];setters=[p for p in edge['wireProof'] if receipts[p][0]['action']=='setPropertyValue']
        require(setters,'RAW_SETTER_REQUIRED')
        b=ET.fromstring(inside(root,setters[-1]).with_name('request.private').read_bytes()).find('{http://schemas.xmlsoap.org/soap/envelope/}Body')[0]
        require(b.findtext('propClass')+'.'+b.findtext('propName')==edge['field'] and b.findtext('value')==edge['requested'],'EXACT_CONSTRUCTION_SETTER_BINDING')
        data=next(r for r in reversed(chain) if r[0]['action']=='getArticleData');choices=next(r for r in reversed(chain) if r[0]['action']=='getAllChoiceLists')
        require(state_key(parsed_snapshot(data[1].read_bytes(),choices[1].read_bytes()))==edge['to'],'ACTUAL_EDGE_TARGET_READBACK')
    closed=closure(cp,states);require(closed['closed'],'INCOMPLETE_CONSTRUCTION_GRAPH')
    result={'at':datetime.now(timezone.utc).isoformat(),'result':'PASS','job':job['job'],'code':job['code'],'states':len(states),'measuredEdges':len(cp['edges']),
            'rawResponses':len(receipts),'observations':len(observations),'finishSetters':finish_setters,'nativeRequests':0,'geometryAndRuntimeAcceptanceImplied':False}
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--inventory',type=Path,required=True);p.add_argument('--job',required=True);p.add_argument('--root',type=Path,required=True);p.add_argument('--session',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    job=next(j for j in read(a.inventory)['queue'] if j['job']==a.job);r=verify(a.root,job,a.session);a.output.write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(json.dumps(r))
