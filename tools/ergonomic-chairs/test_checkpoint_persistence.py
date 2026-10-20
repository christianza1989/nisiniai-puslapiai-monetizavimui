"""Lossless checkpoint encoding and durable replacement regressions."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from capture_structure import save


class CheckpointPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path=Path(self.folder.name)/'CHECKPOINT.json'
        self.value={'states':{'ąžuolas':{'file':'a/b.json','sha256':'0123'}},
                    'paths':{'a':[{'field':'X_OPTIONS','requested':'Ž','to':'b'}]},
                    'edges':[{'from':'a','to':'b','measured':True,'wireProof':['wire/x/RECEIPT.json']}],
                    'other':[None,False,0,-0.0,1.25,{'text':'a\nb\t"\\'}]}

    def test_compact_preserves_every_value_and_default_bytes(self):
        expected=(json.dumps(self.value,sort_keys=True,ensure_ascii=False,indent=2)+'\n').encode()
        save(self.path,self.value)
        self.assertEqual(self.path.read_bytes(),expected)
        save(self.path,self.value,compact=True)
        compact=self.path.read_bytes()
        self.assertEqual(json.loads(compact),json.loads(expected))
        self.assertEqual(compact,(json.dumps(self.value,sort_keys=True,ensure_ascii=False,separators=(',',':'))+'\n').encode())
        self.assertLess(len(compact),len(expected))

    def test_each_write_fsyncs_before_replacing_valid_checkpoint(self):
        save(self.path,{'previous':True})
        original=self.path.read_bytes()
        events=[]
        real_replace=Path.replace
        def replace(temp,target):
            self.assertEqual(self.path.read_bytes(),original)
            self.assertEqual(json.loads(temp.read_bytes()),self.value)
            events.append('replace')
            return real_replace(temp,target)
        with patch('capture_structure.os.fsync',side_effect=lambda fd:events.append('fsync')):
            with patch.object(Path,'replace',replace):
                save(self.path,self.value,compact=True)
        self.assertEqual(events,['fsync','replace'])

    def test_failed_durable_write_preserves_previous_checkpoint(self):
        save(self.path,{'previous':True})
        original=self.path.read_bytes()
        with patch('capture_structure.os.fsync',side_effect=OSError('simulated sync failure')):
            with self.assertRaises(OSError):
                save(self.path,self.value,compact=True)
        self.assertEqual(self.path.read_bytes(),original)
        self.assertEqual(json.loads(self.path.read_bytes()),{'previous':True})


if __name__=='__main__':unittest.main()
