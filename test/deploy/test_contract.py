import json, unittest, pathlib, sys, os, unittest.mock
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'deploy'))

class ContractTests(unittest.TestCase):
 def test_environment_backed_targets(self):
  cfg=json.loads((ROOT/'config/deployment-targets/production.json').read_text())
  self.assertEqual(cfg['dbAppPasswordSecretArn'],'${DB_APP_PASSWORD_SECRET_ARN}')
  self.assertEqual(cfg['dbMigratorPasswordSecretArn'],'${DB_MIGRATION_PASSWORD_SECRET_ARN}')
  self.assertEqual(cfg['account'],'${AWS_ACCOUNT_ID}')
  self.assertFalse(cfg['publicIngressEnabled'])
  self.assertFalse(cfg['sqsEnabled'])
 def test_environment_resolution_and_no_mock_response(self):
  import importlib
  template=json.loads((ROOT/'config/deployment-targets/production.json').read_text())
  values={v[2:-1]:('123456789012' if v=='${AWS_ACCOUNT_ID}' else 'test-config-value') for v in template.values() if isinstance(v,str) and v.startswith('${')}
  with unittest.mock.patch.dict(os.environ,values):
   import common
   importlib.reload(common)
   self.assertEqual(common.ACCOUNT,'123456789012')
   self.assertEqual(common.SERVICE,'test-config-value')
  for p in (ROOT/'deploy').glob('*.py'):
   self.assertNotIn('mock_research_response',p.read_text())
if __name__=='__main__':unittest.main()
