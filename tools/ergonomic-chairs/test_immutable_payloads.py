import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from immutable_payloads import ImmutablePayloadStore, identity
from capture_structure import JournalHTTP, UnknownOutcome


class PayloadStorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir='D:/Core/output/ergonomic-chairs-structure-20261017')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.store = ImmutablePayloadStore(self.root/'objects')

    def test_http_body_and_download_share_one_object_and_keep_exact_bytes(self):
        raw = b'glTF' + bytes(range(256))*1000
        wire = self.root/'source/wire/fixture/response.private'
        self.store.write(wire, raw)
        geometry = self.root/'source/observations/fixture.glb'
        geometry.parent.mkdir(parents=True)
        geometry.write_bytes(raw)
        self.store.adopt_existing(geometry, hashlib.sha256(raw).hexdigest())
        self.assertEqual(wire.read_bytes(), raw)
        self.assertEqual(geometry.read_bytes(), raw)
        self.assertEqual(identity(wire), identity(geometry))
        self.assertEqual(len(list((self.root/'objects').glob('*/*'))), 1)

    def test_existing_alias_cannot_be_truncated(self):
        target = self.root/'data.private'
        self.store.write(target, b'original')
        with self.assertRaisesRegex(ValueError, 'ALREADY_EXISTS'):
            self.store.write(target, b'changed')
        self.assertEqual(target.read_bytes(), b'original')

    def test_corrupt_object_is_detected_without_changing_either_source(self):
        target = self.root/'first.private'
        original = b'a'*65536
        self.store.write(target, original)
        target.write_bytes(b'b'*65536)
        with self.assertRaisesRegex(ValueError, 'OBJECT_CHANGED'):
            self.store.write(self.root/'second.private', original)
        self.assertFalse((self.root/'second.private').exists())

    def test_download_hash_mismatch_preserves_original(self):
        target = self.root/'source.glb'
        target.write_bytes(b'keep')
        with self.assertRaisesRegex(ValueError, 'DOWNLOAD_CHANGED'):
            self.store.adopt_existing(target, hashlib.sha256(b'other').hexdigest())
        self.assertEqual(target.read_bytes(), b'keep')

    def test_persisted_journal_uses_shared_payloads_but_independent_receipts(self):
        class HTTP:
            def request(self, *args, **kwargs):
                class Response:
                    content=b'glTF'+b'x'*65536;status_code=200
                    def raise_for_status(self):pass
                return Response()
        client=JournalHTTP(HTTP(), self.root/'source', lambda:None, self.store)
        client.get('https://fixture.invalid/download')
        client.get('https://fixture.invalid/download')
        responses=list((self.root/'source/wire').glob('*/response.private'))
        self.assertEqual(identity(responses[0]), identity(responses[1]))
        receipts=list((self.root/'source/wire').glob('*/RECEIPT.json'))
        self.assertNotEqual(identity(receipts[0])[:2], identity(receipts[1])[:2])
        self.assertTrue(all(json.loads(p.read_bytes())['complete'] for p in receipts))

    def test_link_quota_preserves_bytes_across_multiple_objects(self):
        store = ImmutablePayloadStore(self.root/'quota', link_limit=3)
        raw = b'q'*65536
        paths = [self.root/('quota-'+str(n)+'.private') for n in range(5)]
        for path in paths:
            store.write(path, raw)
        self.assertEqual(len({identity(p)[:2] for p in paths}), 3)
        self.assertTrue(all(p.read_bytes() == raw for p in paths))
        self.assertTrue(all(p.stat().st_nlink <= 3 for p in paths))

    def test_small_payloads_use_independent_files_without_objects(self):
        a, b = self.root/'url-a.private', self.root/'url-b.private'
        self.store.write(a, b'https://fixture.invalid')
        self.store.write(b, b'https://fixture.invalid')
        self.assertNotEqual(identity(a)[:2], identity(b)[:2])
        self.assertFalse(list((self.root/'objects').glob('*/*')))


if __name__ == '__main__':unittest.main()
