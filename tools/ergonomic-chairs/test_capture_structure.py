import tempfile
import unittest
from pathlib import Path
from capture_structure import JournalHTTP, UnknownOutcome


def envelope(method,fields=''):
    return ('<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><b:'+method+' xmlns:b="http://basket.ws.eai.egr/">'+fields+'</b:'+method+'></s:Body></s:Envelope>').encode()


class FakeHTTP:
    def __init__(self,error=None):self.error=error;self.calls=0
    def request(self,*args,**kwargs):
        self.calls+=1
        if self.error:raise self.error
        class Response:
            content=b'<real-fixture-response/>';status_code=200
            def raise_for_status(self):pass
        return Response()


class RawJournalTests(unittest.TestCase):
    def test_session_creation_and_finish_setter_blocked_before_transport(self):
        with tempfile.TemporaryDirectory(dir='D:/Core/output/ergonomic-chairs-structure-20261017') as t:
            http=FakeHTTP();client=JournalHTTP(http,Path(t),lambda:None)
            for method,fields in [('createSession',''),('setPropertyValue','<propClass>A_FINISHES</propClass><propName>COLOR</propName><value>Y</value>')]:
                with self.assertRaises(ValueError):client.post('https://fixture.invalid',data=envelope(method,fields))
            self.assertEqual(http.calls,0)

    def test_real_bytes_persisted_before_response_is_returned(self):
        with tempfile.TemporaryDirectory(dir='D:/Core/output/ergonomic-chairs-structure-20261017') as t:
            root=Path(t);client=JournalHTTP(FakeHTTP(),root,lambda:None)
            response=client.post('https://fixture.invalid',data=envelope('getArticleData'))
            self.assertEqual(len(client.receipts),1)
            self.assertEqual(next((root/'wire').glob('*/response.private')).read_bytes(),response.content)

    def test_mutating_transport_failure_is_unknown_and_never_retried(self):
        with tempfile.TemporaryDirectory(dir='D:/Core/output/ergonomic-chairs-structure-20261017') as t:
            http=FakeHTTP(ConnectionError());root=Path(t);client=JournalHTTP(http,root,lambda:None)
            with self.assertRaises(UnknownOutcome):client.post('https://fixture.invalid',data=envelope('insertOFMLArticle'))
            self.assertEqual(http.calls,1)
            import json
            error=json.loads(next((root/'wire').glob('*/ERROR.json')).read_bytes())
            self.assertEqual(error['remoteMutationOutcome'],'UNKNOWN')
            self.assertFalse(error['oldRequestMayBeReplayed'])


if __name__=='__main__':unittest.main()
