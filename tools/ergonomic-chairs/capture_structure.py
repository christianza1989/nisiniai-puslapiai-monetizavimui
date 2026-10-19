"""Finite chair source capture using the existing SOAP adapter and session.

Stores complete raw exchanges before interpreting them. No FINISHES setter,
new Native session, guessed edge or publication is implemented here.
"""
import argparse, hashlib, json, os, shutil, time, uuid
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET
from structure_policy import VERSION, state_key, frontier, require_transition, finish_changes, closure
from immutable_payloads import ImmutablePayloadStore
from proven_routes import shortest_proven_path


def now():return datetime.now(timezone.utc).isoformat()
def sha(raw):return hashlib.sha256(raw).hexdigest()
def read(path):return json.loads(Path(path).read_bytes())
def save(path,value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_name(path.name+'.tmp-'+uuid.uuid4().hex)
    with temp.open('xb') as stream:
        stream.write((json.dumps(value,sort_keys=True,ensure_ascii=False,indent=2)+'\n').encode());stream.flush();os.fsync(stream.fileno())
    temp.replace(path)


class Boundary(Exception):pass
class UnknownOutcome(Exception):pass


class JournalHTTP:
    def __init__(self,session,root,guard,payload_store=None):
        self.session,self.root,self.guard=session,root,guard
        self.payload_store=payload_store
        self.receipts=[]
    def write_payload(self,path,raw):
        if self.payload_store:self.payload_store.write(path,raw)
        else:path.write_bytes(raw)
    def __getattr__(self,name):return getattr(self.session,name)
    def request(self,method,url,**kwargs):
        self.guard()
        payload=kwargs.get('data',b'')
        if isinstance(payload,str):payload=payload.encode()
        action='download'
        if method=='POST':
            body=ET.fromstring(payload).find('{http://schemas.xmlsoap.org/soap/envelope/}Body')
            if body is None or len(body)!=1:raise ValueError('INVALID_EXISTING_SOAP_ENVELOPE')
            action=body[0].tag.rsplit('}',1)[-1]
            if action not in {'insertOFMLArticle','setPropertyValue','getArticleData','getAllChoiceLists','getExportedGeometry'}:
                raise ValueError('UNREVIEWED_NATIVE_METHOD')
            if action=='setPropertyValue':
                cls=body[0].findtext('propClass') or ''
                if not cls.endswith(('_OPTIONS','_DIMENSIONS')):raise ValueError('FINISHES_SETTER_FORBIDDEN')
        ident=uuid.uuid4().hex;folder=self.root/'wire'/ident;folder.mkdir(parents=True)
        self.write_payload(folder/'request.private',payload)
        self.write_payload(folder/'url.private',url.encode('utf8'))
        save(folder/'INTENT.json',{'at':now(),'method':method,'action':action,'requestSha256':sha(payload),'urlSha256':sha(url.encode()),'outcome':'PENDING','pid':os.getpid()})
        start=time.perf_counter()
        try:
            response=self.session.request(method,url,**kwargs)
            raw=response.content
            self.write_payload(folder/'response.private',raw)
            receipt={'at':now(),'action':action,'requestSha256':sha(payload),'responseSha256':sha(raw),'status':response.status_code,
                     'urlSha256':sha(url.encode()),'seconds':time.perf_counter()-start,'bytes':len(raw),'complete':True,'response':'wire/'+ident+'/response.private'}
            save(folder/'RECEIPT.json',receipt);self.receipts.append('wire/'+ident+'/RECEIPT.json')
            response.raise_for_status()
            return response
        except Exception as error:
            save(folder/'ERROR.json',{'at':now(),'action':action,'errorClass':type(error).__name__,'seconds':time.perf_counter()-start,
                 'remoteMutationOutcome':'UNKNOWN' if action in {'insertOFMLArticle','setPropertyValue'} else 'READ_FAILED','oldRequestMayBeReplayed':False})
            raise UnknownOutcome('PRESERVED_HTTP_ERROR_'+type(error).__name__) from error
    def post(self,url,**kwargs):return self.request('POST',url,**kwargs)
    def get(self,url,**kwargs):return self.request('GET',url,**kwargs)


def capture(job,root,grant,seconds=900,max_states=120,max_edges=800):
    pin=read(Path(__file__).with_name('SOURCE-PINS.json'))
    if sha(Path(__file__).with_name('legacy_capture.py').read_bytes())!=pin['sha256']:raise ValueError('EXISTING_CAPTURE_ADAPTER_CHANGED')
    from legacy_capture import Capture
    manifest=read(grant)
    if manifest['job']!=job['job'] or manifest['workerPid']!=os.getpid() or manifest['createsSessions'] is not False:
        raise ValueError('EXACT_JOB_WORKER_GRANT_REQUIRED')
    session=Path(manifest['sessionPath']);raw=session.read_bytes()
    if sha(raw)!=manifest['sessionSha256']:raise ValueError('EXISTING_SESSION_SOURCE_CHANGED')
    xml=ET.fromstring(raw);sid=xml.find('state').get('sessionId');item=xml.find('items/bskArticle').get('basketId')
    root.mkdir(parents=True,exist_ok=True);deadline=time.monotonic()+seconds
    checkpoint=root/'CHECKPOINT.json'
    cp=read(checkpoint) if checkpoint.exists() else {'policy':VERSION,'job':job['job'],'initial':None,'states':{},'paths':{},'edges':[],'chunks':0}
    if cp['job']!=job['job'] or cp['policy']!=VERSION:raise ValueError('WRONG_CONSTRUCTION_CHECKPOINT')
    states={key:read(root/ref['file']) for key,ref in cp['states'].items()}
    for key,s in states.items():
        if state_key(s)!=key or sha((root/cp['states'][key]['file']).read_bytes())!=cp['states'][key]['sha256']:raise ValueError('CHECKPOINT_SOURCE_CHANGED')
    before_states,before_edges=len(states),len(cp['edges'])
    def guard():
        current=read(grant)
        if current!=manifest:raise Boundary('GRANT_CHANGED')
        if Path(manifest['pausePath']).exists():raise Boundary('OWNER_PAUSE')
        global_state=read(manifest['globalOwnershipPath'])
        if global_state.get('leaseId')!=manifest['leaseId'] or global_state.get('status')!='RESERVED':raise Boundary('MATCHING_GLOBAL_RESERVATION_REQUIRED')
        if time.monotonic()>=deadline:raise Boundary('FINITE_TIME_BOUNDARY')
        if shutil.disk_usage(root).free<101000000000:raise Boundary('DISK_RESERVE')
    client=Capture(sid,item,output=root,allowed_articles={(job['series'],job['code'])})
    payload_store=ImmutablePayloadStore(root.parent.parent/'objects/sha256')
    wire=JournalHTTP(client.http,root,guard,payload_store);client.http=wire
    def persist(phase):
        cp.update(at=now(),phase=phase,chunks=cp['chunks']+1 if phase=='RETURNED' else cp['chunks'])
        save(checkpoint,cp)
    def insert_initial():
        guard();client.insert(job['code'],job['series'],job['originalVariant']);s=client.state()
        if s['baseArticle']!=job['code']:raise ValueError('ORIGINAL_ARTICLE_MISMATCH')
        return s
    def keep(s,path):
        key=state_key(s)
        observation=uuid.uuid4().hex
        geometry=client.geometry('observations/'+observation)
        payload_store.adopt_existing(root/geometry['file'],geometry['sha256'])
        observed={**s,'geometry':geometry,'capturedAt':now(),'stateKey':key,'policy':VERSION,'sourceWireProof':list(wire.receipts)}
        save(root/('observations/'+observation+'.json'),observed)
        if key not in states:
            s=observed
            file='states/'+key+'.json';save(root/file,s)
            cp['states'][key]={'file':file,'sha256':sha((root/file).read_bytes())};cp['paths'][key]=path;states[key]=s
        return key
    def restore(key):
        route=shortest_proven_path(cp['initial'],key,cp['edges'],states)
        if route is None or len(route)>=len(cp['paths'][key]):route=cp['paths'][key]
        started=time.perf_counter()
        s=insert_initial()
        for step in route:
            require_transition(s,step['field'],step['requested'])
            client.set(step['field'],step['requested']);s=client.state()
            if state_key(s)!=step['to']:raise ValueError('REPLAYED_CONSTRUCTION_CHANGED')
        if state_key(s)!=key:raise ValueError('ORIGINAL_PATH_RESTORE_CHANGED')
        save(root/('route-proofs/'+uuid.uuid4().hex+'.json'),{'at':now(),'initial':cp['initial'],'target':key,
             'originalSteps':len(cp['paths'][key]),'actualSteps':len(route),'shorter':len(route)<len(cp['paths'][key]),
             'path':route,'stateIdentityVerified':True,'seconds':time.perf_counter()-started,
             'historicalRpcReplayed':False,'newInvocation':True})
        return s
    stop=None
    try:
        start_receipts=len(wire.receipts)
        initial=insert_initial();initial_key=keep(initial,[])
        if cp['initial'] and cp['initial']!=initial_key:raise ValueError('ORIGINAL_INITIAL_VARIANT_CHANGED')
        cp['initial']=initial_key;cp.setdefault('initialProof',wire.receipts[start_receipts:]);persist('CAPTURING')
        current=initial_key
        while True:
            status=closure(cp,states)
            if not status['missingEdges']:break
            if len(states)-before_states>=max_states or len(cp['edges'])-before_edges>=max_edges:raise Boundary('FINITE_GRAPH_BUDGET')
            edge=next((e for e in status['missingEdges'] if e['from']==current),status['missingEdges'][0]);source=edge['from']
            start_receipts=len(wire.receipts)
            before=states[source] if source==current else restore(source)
            require_transition(before,edge['field'],edge['requested']);client.set(edge['field'],edge['requested']);after=client.state()
            target=keep(after,cp['paths'][source]+[dict(edge,to=state_key(after))])
            applied=after['properties'].get(edge['field'],{}).get('value')==edge['requested']
            measured={**edge,'to':target,'measured':True,'requestedApplied':applied,'implicitFinishChanges':finish_changes(before,after),
                      'wireProof':wire.receipts[start_receipts:],'at':now()}
            cp['edges'].append(measured)
            if not applied:cp.setdefault('unreachableWithDefaultFinish',[]).append(measured)
            current=target;persist('CAPTURING')
    except Boundary as error:stop=str(error)
    except Exception as error:
        stop='SESSION_NOT_AVAILABLE' if isinstance(error,RuntimeError) and 'session' in str(error).lower() else type(error).__name__+':'+str(error)
        save(root/('ERROR-'+uuid.uuid4().hex+'.json'),{'at':now(),'reason':stop,'checkpointPreserved':True,'oldRequestMayBeReplayed':False})
    finally:
        persist('RETURNED');status=closure(cp,states)
        result={'at':now(),'job':job['job'],'code':job['code'],'graph':status,'stopReason':stop,
                'newStates':len(states)-before_states,'newEdges':len(cp['edges'])-before_edges,'states':len(states),'edges':len(cp['edges']),
                'sourceDataPrepared':False,'acceptance':False,'createsSessions':False,'finishSetterCount':0,'pid':os.getpid()}
        save(root/'RESULT.json',result);wire.session.close()
    return result


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--inventory',type=Path,required=True);ap.add_argument('--job',required=True);ap.add_argument('--root',type=Path,required=True);ap.add_argument('--grant',type=Path,required=True);ap.add_argument('--ready',type=Path,required=True)
    args=ap.parse_args();job=next(j for j in read(args.inventory)['queue'] if j['job']==args.job)
    save(args.ready,{'pid':os.getpid(),'job':job['job'],'at':now(),'nativeRequests':0})
    until=time.monotonic()+60
    while not args.grant.exists():
        if time.monotonic()>until:raise ValueError('GRANT_NOT_RECEIVED_NO_NATIVE_REQUEST')
        time.sleep(.2)
    if read(args.grant)['inventorySha256']!=sha(args.inventory.read_bytes()):raise ValueError('GRANTED_INVENTORY_CHANGED')
    result=capture(job,args.root,args.grant);print(json.dumps(result,ensure_ascii=True))


if __name__=='__main__':main()
