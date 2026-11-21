"""Static safety contract guards for the migration and recovery workflows."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]


class MigrationContracts(unittest.TestCase):
    def test_plan_and_apply_share_manifest_and_plan_validation(self):
        for name in ("migrate.ts", "check-migrations.ts"):
            contents = (ROOT / "scripts" / name).read_text()
            self.assertIn("loadMigrations", contents)
            self.assertIn("validatePlan", contents)

    def test_migration_is_atomic_and_has_a_transaction_lock(self):
        code = (ROOT / "scripts/migrate.ts").read_text()
        for needle in ("'BEGIN'", "pg_advisory_xact_lock", "'COMMIT'", "'ROLLBACK'",
                       "INSERT INTO public.schema_migrations", "grantLedgerRead"):
            self.assertIn(needle, code)

    def test_production_has_no_automatic_reset(self):
        for path in (ROOT / "scripts").glob("*migration*.ts"):
            self.assertNotIn("DROP TABLE", path.read_text().upper())
        self.assertNotIn("DROP TABLE", (ROOT / "scripts/baseline-existing.ts").read_text().upper())

    def test_baseline_requires_approval_and_snapshot(self):
        schema = (ROOT / "deploy/schema_task.py").read_text()
        snapshot = (ROOT / "deploy/schema_snapshot.py").read_text()
        baseline = (ROOT / "scripts/baseline-existing.ts").read_text()
        for script in (schema, snapshot, baseline):
            self.assertIn("RECONCILE_GAIA_BASELINE", script)
        self.assertIn("MIGRATION_SNAPSHOT_ID", schema)
        self.assertIn("verifyInitialGaiaSchema", baseline)
        self.assertIn("'baseline-check'", schema)

    def test_baseline_workflow_never_deploys_service(self):
        workflow = (ROOT / ".github/workflows/reconcile-gaia-baseline.yml").read_text()
        self.assertIn("SCHEMA_ACTION=baseline-check", workflow)
        self.assertIn("SCHEMA_ACTION: baseline", workflow)
        self.assertIn("schema_snapshot.py", workflow)
        self.assertNotIn("deploy/release.py", workflow)
        self.assertNotIn("update-service", workflow)


if __name__ == '__main__':
    unittest.main()
