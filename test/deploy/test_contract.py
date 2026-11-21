import json,unittest,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'deploy'))
import common
class ContractTests(unittest.TestCase):
 def test_fixed_target(self):
  cfg=json.loads((ROOT/'config/deployment-targets/production.json').read_text())
  self.assertEqual(cfg['database'],'gaia')
  self.assertEqual(cfg['cluster'],'moderta-production-cluster')
  self.assertFalse(cfg['publicIngressEnabled'])
  self.assertFalse(cfg['sqsEnabled'])
 def test_no_mock_business_responses(self):
  self.assertEqual(common.SERVICE,'moderta-production-gaia-api')
  self.assertEqual(common.SCHEMA,'moderta-production-gaia-schema')
if __name__=='__main__':unittest.main()
