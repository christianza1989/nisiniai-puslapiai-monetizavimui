"""Capture validated public products using an explicitly supplied public browser session.

The default scope is the original two pilots. An explicit caller allowlist can
extend it; the ten-product collector verifies that list against published codes.

No login/key discovery, new session creation, production proxy, or inquiry transmission.
Run with --session and --item from your own public OBX export. TLS uses OS trust.
"""
import argparse, hashlib, json, time, ssl, os
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape
import requests

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'research/configurator/expanded-source'
BASE = 'https://s1.eaiws.pcon-solutions.com/4.19.1-002'

class Capture:
    def __init__(self, sid, item, *, output=None, allowed_articles=None):
        self.sid, self.item = sid, item
        self.output = Path(output) if output else OUT
        self.allowed_articles = set(allowed_articles or ())
        self.http = requests.Session()
        self.output.mkdir(parents=True, exist_ok=True)
        # Use the same trusted Windows roots as the browser, without disabling TLS.
        # truststore's native chain call is unreliable on this host; a PEM bundle
        # of existing OS trust anchors also works with Requests/OpenSSL.
        if os.name == 'nt':
            roots = Path(requests.certs.where()).read_text(encoding='ascii')
            for cert, encoding, trust in ssl.enum_certificates('ROOT'):
                if encoding == 'x509_asn' and (trust is True or '1.3.6.1.5.5.7.3.1' in trust):
                    roots += ssl.DER_cert_to_PEM_cert(cert)
            bundle = self.output / ('windows-trusted-roots-'+str(os.getpid())+'.pem')
            bundle.write_text(roots,encoding='ascii')
            self.http.verify = str(bundle)

    def call(self, method, fields=(), item=True):
        fields = [('sessionId', self.sid)] + ([('itemId', self.item)] if item else []) + list(fields)
        content = ''.join(f'<{k}>{escape(v)}</{k}>' for k,v in fields)
        body = f'<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><b:{method} xmlns:b="http://basket.ws.eai.egr/">{content}</b:{method}></s:Body></s:Envelope>'
        response = self.http.post(BASE+'/EAI/Basket',data=body.encode(),headers={'Content-Type':'text/xml; charset=utf-8','SOAPAction':'""'},timeout=90)
        response.raise_for_status()
        tree = ET.fromstring(response.content)
        fault = tree.find('.//faultstring')
        if fault is not None: raise RuntimeError(fault.text)
        return tree.findall('.//return')

    def set(self, key, value):
        cls, prop = key.rsplit('.',1)
        self.call('setPropertyValue',[('propClass',cls),('propName',prop),('value',value)])

    def insert(self, code, series, ofml=None):
        if (series,code) not in self.allowed_articles | {('XIL','KXIL044WW001'),('XIL','KXIL045WW001'),('XIL','KXIL046WW001'),('SOU','KSOU001WW003'),('SOU','KSOU001WW004')}:
            raise ValueError('Only previously published pilot articles can be inserted')
        if ofml:
            # GUI enum identifiers escape a leading digit with an underscore.
            # OFML variant input uses the actual symbol (e.g. _4T -> 4T,
            # _22 -> 22, _207Y -> 207Y); otherwise insertion silently defaults.
            encoded=[]
            for option in ofml.split(';'):
                if not option.strip():continue
                key,value=option.split('=',1)
                if len(value)>1 and value[0]=='_' and value[1].isdigit():value=value[1:]
                encoded.append(key+'='+value)
            ofml=';'.join(encoded)
        variant = f'<ofmlVariantCode>{escape(ofml)}</ofmlVariantCode>' if ofml else ''
        fields = f'<sessionId>{escape(self.sid)}</sessionId><fatherId></fatherId><beforeId></beforeId><insertInfo><baseArticleNumber>{code}</baseArticleNumber><manufacturerId>NST</manufacturerId>{variant}<seriesId>{series}</seriesId></insertInfo>'
        body=f'<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><b:insertOFMLArticle xmlns:b="http://basket.ws.eai.egr/">{fields}</b:insertOFMLArticle></s:Body></s:Envelope>'
        r=self.http.post(BASE+'/EAI/Basket',data=body.encode(),headers={'Content-Type':'text/xml; charset=utf-8','SOAPAction':'""'},timeout=90);r.raise_for_status()
        self.item=ET.fromstring(r.content).findtext('.//return')
        if not self.item: raise RuntimeError('No article ID returned')
        return self.item

    def state(self):
        data = self.call('getArticleData')[0]
        choices = self.call('getAllChoiceLists')
        props = {p.findtext('propClass')+'.'+p.findtext('propName'): {
            'label':p.findtext('propText'), 'value':p.findtext('value/value'),
            'text':p.findtext('value/text'), 'visible':p.findtext('visible')=='true',
            'editable':p.findtext('editable')=='true'} for p in data.findall('properties')}
        lists = {c.findtext('propClass')+'.'+c.findtext('propName'):[
            {'value':v.findtext('value'),'text':v.findtext('text'),'icon':v.findtext('smallIcon') or v.findtext('largeIcon'),
             'selectable':v.findtext('selectable')!='false'} for v in c.findall('values')] for c in choices}
        return {'baseArticle':data.findtext('baseArticleNumber'),'properties':props,'choices':lists,
                'sourceDescription':{'short':data.findtext('shortText') or '',
                                     'long':data.findtext('longText') or '',
                                     'features':data.findtext('featureText') or ''},
                'sourceOrderText':data.findtext('variantCode') or ''}

    def geometry(self, name, fmt='GLTF'):
        url = self.call('getExportedGeometry',[('options','format='+fmt),('options','centerXZ=false'),('options','texTrans=true')])[0].text
        if not url.startswith(BASE+'/session-cache/'+self.sid+'/'): raise RuntimeError('Unexpected export location')
        response=self.http.get(url,timeout=120);response.raise_for_status()
        path=self.output/(name+('.glb' if fmt=='GLTF' else '.3ds'));path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(response.content)
        return {'file':path.relative_to(self.output).as_posix(),'sha256':hashlib.sha256(response.content).hexdigest(),'bytes':len(response.content),'sourceUrl':url}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--session',required=True);parser.add_argument('--item',required=True)
    parser.add_argument('--name',default='xilium-duo');parser.add_argument('--geometry',action='store_true')
    args=parser.parse_args();capture=Capture(args.session,args.item)
    state=capture.state()
    if args.geometry: state['geometry']=capture.geometry(args.name)
    (OUT/(args.name+'.json')).write_text(json.dumps(state,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'name':args.name,'fields':len(state['choices']),'geometry':state.get('geometry',{}).get('bytes')},ensure_ascii=True))

if __name__=='__main__':main()
