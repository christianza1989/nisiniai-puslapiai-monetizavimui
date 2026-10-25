import hashlib
import json
import os
from pathlib import Path
import tempfile
import tracemalloc
import unittest

from structure_policy import state_key, VERSION
from verify_structure_wire import verify, parsed_snapshot


BASE='https://s1.eaiws.pcon-solutions.com/4.19.1-002/'
SOAP='http://schemas.xmlsoap.org/soap/envelope/'


def sha(raw):return hashlib.sha256(raw).hexdigest()
def write(path,value):path.write_text(json.dumps(value),encoding='utf8')
def envelope(action,fields):
    return ('<s:Envelope xmlns:s="'+SOAP+'"><s:Body><b:'+action+' xmlns:b="http://basket.ws.eai.egr/">'+fields+'</b:'+action+'></s:Body></s:Envelope>').encode()


def fixture(root,observations=1,geometry_bytes=64):
    (root/'wire').mkdir();(root/'observations').mkdir();(root/'states').mkdir()
    session=root/'session.xml';session.write_text('<root><state sessionId="fixture-session"/></root>')
    job={'job':'fixture','code':'TEST','series':'TST','originalVariant':''}
    payload=root/'payload';payload.write_bytes(b'G'*geometry_bytes)
    url=BASE+'session-cache/fixture-session/original.glb'
    data=b'<root><return><baseArticleNumber>TEST</baseArticleNumber><properties><propClass>TEST_OPTIONS</propClass><propName>ARM</propName><propText>Armrest</propText><visible>false</visible><editable>false</editable><value><value>NONE</value><text>None</text></value></properties></return></root>'
    lists=b'<root/>';refs=[]

    def receipt(action,reply,fields='',method='POST',response_url=None):
        folder=root/'wire'/str(len(refs)).zfill(5);folder.mkdir()
        body=envelope(action,'<sessionId>fixture-session</sessionId>'+fields) if method=='POST' else b''
        address=response_url or BASE+'EAI/Basket'
        (folder/'request.private').write_bytes(body);(folder/'url.private').write_text(address,encoding='utf8')
        if isinstance(reply,Path):os.link(reply,folder/'response.private');response_sha=sha(reply.read_bytes())
        else:(folder/'response.private').write_bytes(reply);response_sha=sha(reply)
        write(folder/'INTENT.json',{'method':method,'requestSha256':sha(body),'urlSha256':sha(address.encode())})
        write(folder/'RECEIPT.json',{'at':str(len(refs)).zfill(8),'action':action,'requestSha256':sha(body),'responseSha256':response_sha,'urlSha256':sha(address.encode()),'complete':True,'status':200})
        ref=(folder/'RECEIPT.json').relative_to(root).as_posix();refs.append(ref);return ref

    receipt('insertOFMLArticle',b'<root><return>item</return></root>','<insertInfo><baseArticleNumber>TEST</baseArticleNumber><seriesId>TST</seriesId></insertInfo>')
    receipt('getArticleData',data,'<itemId>item</itemId>');receipt('getAllChoiceLists',lists,'<itemId>item</itemId>')
    state=parsed_snapshot(data,lists);key=state_key(state)
    for i in range(observations):
        exported=receipt('getExportedGeometry',('<root><return>'+url+'</return></root>').encode(),'<itemId>item</itemId>')
        downloaded=receipt('download',payload,method='GET',response_url=url)
        file='observations/'+str(i)+'.glb';os.link(payload,root/file)
        snapshot={**state,'stateKey':key,'geometry':{'file':file,'sha256':sha(payload.read_bytes()),'sourceUrl':url},'sourceWireProof':refs[:3]+[exported,downloaded]}
        write(root/'observations'/(str(i)+'.json'),snapshot)
        if i==0:write(root/'states/state.json',snapshot)
    cp={'job':'fixture','policy':VERSION,'initial':key,'states':{key:{'file':'states/state.json','sha256':sha((root/'states/state.json').read_bytes())}},'edges':[]}
    write(root/'CHECKPOINT.json',cp)
    return job,session,receipt


class IndependentWireMemoryTests(unittest.TestCase):
    def run_fixture(self,mutate=None,expected=None):
        with tempfile.TemporaryDirectory(dir='D:/Core/output/ergonomic-chairs-structure-20261017') as directory:
            root=Path(directory);job,session,receipt=fixture(root)
            if mutate:mutate(root,receipt)
            if expected:
                with self.assertRaisesRegex(ValueError,expected):verify(root,job,session)
            else:
                proof=verify(root,job,session);self.assertEqual(proof['result'],'PASS');self.assertEqual(proof['rawResponses'],5);self.assertEqual(proof['observations'],1);self.assertFalse(proof['geometryAndRuntimeAcceptanceImplied'])

    def test_complete_independent_raw_readback(self):self.run_fixture()

    def test_response_tamper_is_still_rejected(self):
        self.run_fixture(lambda r,_:(r/'wire/00004/response.private').write_bytes(b'changed'),'RAW_NATIVE_BYTES_CHANGED')

    def test_geometry_rebinding_is_still_rejected(self):
        def mutate(root,_):
            p=root/'observations/0.json';s=json.loads(p.read_bytes());(root/'observations/other.glb').write_bytes(b'other');s['geometry'].update(file='observations/other.glb',sha256=sha(b'other'));write(p,s)
        self.run_fixture(mutate,'ORIGINAL_GEOMETRY_BYTES_CHANGED')

    def test_snapshot_text_tamper_is_still_rejected(self):
        def mutate(root,_):
            p=root/'observations/0.json';s=json.loads(p.read_bytes());s['sourceDescription']['long']='invented';write(p,s)
        self.run_fixture(mutate,'NATIVE_SNAPSHOT_READBACK_sourceDescription')

    def test_finish_setter_is_still_rejected(self):
        self.run_fixture(lambda _,receipt:receipt('setPropertyValue',b'<root/>','<itemId>item</itemId><propClass>TEST_FINISHES</propClass><propName>COLOR</propName><value>BLACK</value>'),'FINISHES_SETTER_FOUND')

    def test_sealed_state_tamper_is_still_rejected(self):
        def mutate(root,_):
            p=root/'states/state.json';p.write_bytes(b' '+p.read_bytes())
        self.run_fixture(mutate,'SEALED_STATE_CHANGED')

    def test_responses_do_not_accumulate_in_python_memory(self):
        with tempfile.TemporaryDirectory(dir='D:/Core/output/ergonomic-chairs-structure-20261017') as directory:
            root=Path(directory);job,session,_=fixture(root,observations=32,geometry_bytes=2*1024*1024)
            tracemalloc.start()
            try:proof=verify(root,job,session);peak=tracemalloc.get_traced_memory()[1]
            finally:tracemalloc.stop()
            self.assertEqual(proof['observations'],32)
            self.assertLess(peak,16*1024*1024,'64MiB of raw replies must not remain resident')


if __name__=='__main__':unittest.main()
