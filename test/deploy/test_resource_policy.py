"""Deploy-time resource/policy contract, requiring no AWS access."""
import importlib
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'deploy'))
import resources

RESOURCE_VARS = (
    'ECS_CPU_UNITS', 'ECS_MEMORY_RESERVATION', 'ECS_MEMORY_LIMIT',
    'ECS_SCHEMA_CPU_UNITS', 'ECS_SCHEMA_MEMORY_RESERVATION', 'ECS_SCHEMA_MEMORY_LIMIT',
    'ECS_MIN_HEALTHY_PERCENT', 'ECS_MAX_PERCENT', 'ECS_AZ_REBALANCING',
)


class ResourcePolicyTests(unittest.TestCase):
    def setUp(self):
        self.saved = {k: os.environ.get(k) for k in RESOURCE_VARS}
        for key in RESOURCE_VARS:
            os.environ.pop(key, None)

    def tearDown(self):
        for key, value in self.saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_version_controlled_defaults_and_isolated_schema_job(self):
        api = resources.container_resources('api')
        schema = resources.container_resources('schema')
        self.assertEqual((api.cpu, api.reservation, api.limit), (256, 512, 1024))
        self.assertEqual((schema.cpu, schema.reservation, schema.limit), (256, 256, 512))
        policy = resources.deployment_policy()
        self.assertEqual((policy.minimum_healthy, policy.maximum_percent, policy.az_rebalancing), (100, 200, 'ENABLED'))

    def test_environment_overrides_only_target_container(self):
        os.environ.update({'ECS_CPU_UNITS': '384', 'ECS_MEMORY_RESERVATION': '768',
                           'ECS_MEMORY_LIMIT': '1536'})
        self.assertEqual(resources.container_resources('api'), resources.ContainerResources(384, 768, 1536))
        self.assertEqual(resources.container_resources('schema'), resources.ContainerResources(256, 256, 512))
        os.environ['ECS_SCHEMA_CPU_UNITS'] = '128'
        self.assertEqual(resources.container_resources('schema').cpu, 128)

    def test_stop_first_works_with_explicit_az_rebalancing_disabled(self):
        os.environ.update({'ECS_MIN_HEALTHY_PERCENT': '0', 'ECS_MAX_PERCENT': '100',
                           'ECS_AZ_REBALANCING': 'DISABLED'})
        args = resources.deployment_policy().aws_args()
        self.assertIn('maximumPercent=100,minimumHealthyPercent=0', args[1])
        self.assertEqual(args[-2:], ['--availability-zone-rebalancing', 'DISABLED'])

    def test_stop_first_rejects_enabled_az_rebalancing(self):
        os.environ.update({'ECS_MIN_HEALTHY_PERCENT': '0', 'ECS_MAX_PERCENT': '100'})
        with self.assertRaisesRegex(resources.ResourceConfigError, 'requires ECS_AZ_REBALANCING=DISABLED'):
            resources.deployment_policy()

    def test_one_task_rollout_disallows_deadlock_percentages(self):
        os.environ['ECS_MAX_PERCENT'] = '150'
        with self.assertRaisesRegex(resources.ResourceConfigError, 'requires maxPercent=200'):
            resources.deployment_policy()

    def test_invalid_cpu_memory_and_percentages_fail_before_aws(self):
        for name, value in [('ECS_CPU_UNITS', '-100'), ('ECS_CPU_UNITS', 'abc'),
                            ('ECS_CPU_UNITS', '0'), ('ECS_MEMORY_LIMIT', '0'),
                            ('ECS_MAX_PERCENT', '300'), ('ECS_MIN_HEALTHY_PERCENT', '101')]:
            with self.subTest(name=name, value=value):
                with patch.dict(os.environ, {name: value}):
                    with self.assertRaises(resources.ResourceConfigError):
                        (resources.deployment_policy() if 'PERCENT' in name
                         else resources.container_resources('api'))

    def test_memory_reservation_cannot_exceed_limit(self):
        os.environ.update({'ECS_MEMORY_RESERVATION': '2048', 'ECS_MEMORY_LIMIT': '512'})
        with self.assertRaisesRegex(resources.ResourceConfigError, 'must not exceed'):
            resources.container_resources('api')

    def test_unknown_az_value_rejected(self):
        os.environ['ECS_AZ_REBALANCING'] = 'AUTO'
        with self.assertRaises(resources.ResourceConfigError):
            resources.deployment_policy()

    def test_api_and_schema_reservations_are_used_in_real_task_definitions(self):
        targets = json.loads((ROOT / 'config/deployment-targets/production.json').read_text())
        values = {text[2:-1]: 'test-value' for text in targets.values()
                  if isinstance(text, str) and text.startswith('${')}
        values['AWS_ACCOUNT_ID'] = '123456789012'
        values['AWS_REGION'] = 'ap-south-1'
        with patch.dict(os.environ, values):
            import common
            importlib.reload(common)
            with patch.object(common, 'ghcr', return_value='arn:ghcr-placeholder'), \
                 patch.object(common, 'secret', return_value='arn:jwt-placeholder'):
                app = common.container('image', ['node', 'dist/main.js'], 'app', 'arn:db', 'api')
                schema = common.container('image', ['node', 'script.js'], 'migrator', 'arn:db', 'schema')
        self.assertEqual((app['cpu'], app['memoryReservation'], app['memory']), (256, 512, 1024))
        self.assertEqual((schema['cpu'], schema['memoryReservation'], schema['memory']), (256, 256, 512))
        self.assertEqual(app['portMappings'][0]['hostPort'], 0)
        self.assertEqual(schema.get('healthCheck'), None)

    def test_preflight_fails_closed_if_start_first_cannot_fit_replacement(self):
        import preflight

        def fake_aws(*args):
            if args[:2] == ('ecs', 'list-container-instances'):
                return {'containerInstanceArns': ['ci-1']}
            if args[:2] == ('ecs', 'describe-container-instances'):
                return {'containerInstances': [
                    {'status': 'ACTIVE', 'agentConnected': True,
                     'remainingResources': [{'name': 'CPU', 'integerValue': 128},
                                            {'name': 'MEMORY', 'integerValue': 8000}]}
                ]}
            raise AssertionError(args)

        with patch.object(preflight, 'aws', side_effect=fake_aws):
            with self.assertRaisesRegex(RuntimeError, 'Insufficient ECS capacity to start Gaia API'):
                preflight.check_rollout_capacity({'runningCount': 1})

    def test_preflight_allows_approved_stop_first_without_spare_cpu(self):
        import preflight
        os.environ.update({'ECS_MIN_HEALTHY_PERCENT': '0', 'ECS_MAX_PERCENT': '100',
                           'ECS_AZ_REBALANCING': 'DISABLED'})
        with patch.object(preflight, 'aws', side_effect=AssertionError('should not query free CPU')):
            preflight.check_rollout_capacity({'runningCount': 1})

    def test_workflows_pass_all_overrides_to_protected_jobs(self):
        for path in ('deploy-production.yml', 'reconcile-gaia-baseline.yml',
                     'verify-gaia-db.yml', 'recovery-gaia.yml'):
            text = (ROOT / '.github/workflows' / path).read_text()
            for name in RESOURCE_VARS:
                self.assertIn(f'{name}: ${{{{ vars.{name} }}}}', text, f'{path}: missing {name}')

    def test_release_and_recovery_use_policy_without_modifying_infrastructure(self):
        for name in ('release.py', 'recover.py'):
            code = (ROOT / 'deploy' / name).read_text()
            self.assertIn('deployment_policy()', code)
            self.assertIn('aws_args()', code)
            self.assertNotIn('update-auto-scaling-group', code)
        release = (ROOT / 'deploy/release.py').read_text()
        self.assertIn('check_rollout_capacity(current)', release)
        self.assertNotIn("'--force-new-deployment'", release)


if __name__ == '__main__':
    unittest.main()
