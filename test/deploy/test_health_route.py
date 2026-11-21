"""Regression guard: ECS readiness probe must be registered as a NestJS route."""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]


class GaiaReadinessContractTests(unittest.TestCase):
    def test_ready_controller_imported_and_registered(self):
        module = (ROOT / 'src/app.module.ts').read_text()
        self.assertRegex(module, r"import\s*\{\s*ReadyController\s*\}\s*from\s*['\"]\./ready\.controller['\"]")
        self.assertRegex(module, r'controllers\s*:\s*\[[^\]]*\bReadyController\b[^\]]*\]')

    def test_readiness_is_actual_db_probe(self):
        ready = (ROOT / 'src/ready.controller.ts').read_text()
        self.assertIn("@Controller('ready')", ready)
        self.assertIn('@Get()', ready)
        self.assertIn('DATABASE_POOL', ready)
        self.assertIn("this.pool.query('SELECT 1')", ready)
        db = (ROOT / 'src/database/database.module.ts').read_text()
        self.assertIn('exports: [DATABASE_POOL]', db)

    def test_ecs_probe_targets_registered_readiness_route(self):
        common = (ROOT / 'deploy/common.py').read_text()
        self.assertRegex(common, r"127\.0\.0\.1:\{port\}/ready")
        app = (ROOT / 'src/app.module.ts').read_text()
        self.assertIn('HealthController, ReadyController', app)

    def test_port_matches_main_default_and_service_settings(self):
        self.assertIn('process.env.PORT ?? 3001', (ROOT / 'src/main.ts').read_text())
        self.assertIn('"port": 3001', (ROOT / 'config/deployment-targets/production.json').read_text())


if __name__ == '__main__':
    unittest.main()
