import hashlib,json,tempfile,unittest
from pathlib import Path
from test_wire_memory import fixture,write
from verify_structure_wire import verify

class WireChronologyTests(unittest.TestCase):
    def case(self,mutate,error=None):
        with tempfile.TemporaryDirectory(dir='D:/Core/output/ergonomic-chairs-structure-20261017') as directory:
            root=Path(directory);job,session,receipt=fixture(root)
            mutate(root,receipt)
            if error:
                with self.assertRaisesRegex(ValueError,error):verify(root,job,session)
            else:
                proof=verify(root,job,session)
                self.assertEqual(proof['causalOwnershipReceipts'],1)
                self.assertFalse(proof['geometryAndRuntimeAcceptanceImplied'])

    @staticmethod
    def rollback(root,_):
        p=root/'wire/00002/RECEIPT.json';r=json.loads(p.read_bytes());r['at']='-0000008';write(p,r)

    def test_clock_rollback_requires_original_insertion_sequence(self):self.case(self.rollback)

    def test_missing_causal_insertion_stays_unowned(self):
        def mutate(root,receipt):
            self.rollback(root,receipt)
            p=root/'observations/0.json';s=json.loads(p.read_bytes());s['sourceWireProof']=s['sourceWireProof'][1:];write(p,s)
        self.case(mutate,'UNOWNED_SOURCE_ITEM')

    def test_later_in_chain_insertion_cannot_authorize_prior_request(self):
        def mutate(root,receipt):
            self.rollback(root,receipt)
            p=root/'observations/0.json';s=json.loads(p.read_bytes());refs=s['sourceWireProof'];s['sourceWireProof']=refs[1:3]+refs[:1]+refs[3:];write(p,s)
        self.case(mutate,'UNOWNED_SOURCE_ITEM')

    def test_foreign_item_even_with_valid_updated_raw_hash_is_rejected(self):
        def mutate(root,receipt):
            self.rollback(root,receipt)
            p=root/'wire/00002/request.private';raw=p.read_bytes().replace(b'<itemId>item</itemId>',b'<itemId>foreign</itemId>');p.write_bytes(raw)
            digest=hashlib.sha256(raw).hexdigest()
            for name in ['INTENT.json','RECEIPT.json']:
                f=p.with_name(name);r=json.loads(f.read_bytes());r['requestSha256']=digest;write(f,r)
        self.case(mutate,'UNOWNED_SOURCE_ITEM')

    def test_unobserved_clock_rollback_tail_is_not_assumed_owned(self):
        def mutate(root,receipt):
            ref=receipt('getArticleData',b'<root/>','<itemId>item</itemId>')
            p=root/ref;r=json.loads(p.read_bytes());r['at']='-0000008';write(p,r)
        self.case(mutate,'UNOWNED_SOURCE_ITEM')

    def test_raw_tampering_does_not_get_causal_exception(self):
        def mutate(root,receipt):
            self.rollback(root,receipt);(root/'wire/00002/response.private').write_bytes(b'changed')
        self.case(mutate,'RAW_NATIVE_BYTES_CHANGED')

if __name__=='__main__':unittest.main()
