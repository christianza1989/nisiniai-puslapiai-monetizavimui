import json
import tempfile
import unittest
from pathlib import Path
from active_scope_report import count_pending


class FrontierAccountingTests(unittest.TestCase):
    def test_measured_edges_not_recounted_and_orphans_excluded(self):
        with tempfile.TemporaryDirectory(prefix='scope-',dir='D:/Core/output/ergonomic-chairs-structure-20261017') as t:
            root=Path(t);(root/'states').mkdir()
            def snapshot(v):
                return {'properties':{'A_OPTIONS.ARM':{'visible':True,'editable':True,'value':v}},
                        'choices':{'A_OPTIONS.ARM':[{'value':'NONE'},{'value':'R55'}]}}
            for key,value in [('a','NONE'),('b','R55'),('orphan','NONE')]:
                (root/'states'/(key+'.json')).write_text(json.dumps(snapshot(value)),encoding='utf8')
            (root/'graph-checkpoint.json').write_text(json.dumps({'baseline':'a','references':[],
                'edges':[{'from':'a','to':'b','field':'A_OPTIONS.ARM','requested':'R55','measured':True}]}),encoding='utf8')
            r=count_pending(root)
            self.assertEqual(r['states'],2)
            self.assertEqual(r['unreachableStateFilesExcluded'],1)
            self.assertEqual(r['pending'],1)
            self.assertEqual(r['pendingByClass'],{'OPTIONS':1})


if __name__=='__main__':unittest.main()
