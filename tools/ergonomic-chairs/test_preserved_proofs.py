import copy
import unittest
from prepare_closed import preserved_proof_matches,proof_signature


class PreservedProofTests(unittest.TestCase):
    def setUp(self):
        self.row={'job':'sealed','result':'PASS_SOURCE_GEOMETRY_RUNTIME_ONLY','tools':{'old-verifier':'full-sha','compiler':'same-sha'},'checkpointSha256':'checkpoint','artifacts':{'runtime.json':'runtime-sha'}}
        self.current={'new-verifier':'new-full-sha','compiler':'same-sha'}
        self.certificate={'currentTools':self.current,'previousTools':self.row['tools'],'rows':{'sealed':proof_signature(self.row)}}

    def test_exact_old_row_is_preserved_without_rewriting_fingerprint(self):
        before=copy.deepcopy(self.row)
        self.assertTrue(preserved_proof_matches(self.row,self.current,self.certificate))
        self.assertEqual(self.row,before)

    def test_changed_checkpoint_or_artifact_or_result_is_not_preserved(self):
        for field,value in [('checkpointSha256','different'),('artifacts',{'runtime.json':'changed'}),('result','RUNNING')]:
            row=copy.deepcopy(self.row);row[field]=value
            self.assertFalse(preserved_proof_matches(row,self.current,self.certificate))

    def test_changed_current_compiler_is_not_preserved(self):
        current={**self.current,'compiler':'changed'}
        self.assertFalse(preserved_proof_matches(self.row,current,self.certificate))

    def test_changed_prior_verifier_is_not_preserved(self):
        row=copy.deepcopy(self.row);row['tools']['old-verifier']='unknown'
        self.assertFalse(preserved_proof_matches(row,self.current,self.certificate))

    def test_new_model_cannot_reuse_an_unlisted_old_proof(self):
        row={**self.row,'job':'new'}
        self.assertFalse(preserved_proof_matches(row,self.current,self.certificate))

    def test_no_certificate_means_no_legacy_compatibility(self):
        self.assertFalse(preserved_proof_matches(self.row,self.current,None))


if __name__=='__main__':unittest.main()
