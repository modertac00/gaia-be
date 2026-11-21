const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { loadMigrations, validatePlan } = require('../../dist-deploy/scripts/migration-utils.js');

const manifest = [
  { filename: '001_auth.sql', sql: 'select 1;', sha256: 'a'.repeat(64) },
  { filename: '002_init_data.sql', sql: 'select 2;', sha256: 'b'.repeat(64) },
  { filename: '003_gaia_research_core.sql', sql: 'select 3;', sha256: 'c'.repeat(64) },
];
const applied = (n) => manifest.slice(0, n).map(({ filename, sha256 }) => ({ filename, sha256 }));

test('fresh database plans all SQL migrations', () => {
  const result = validatePlan(manifest, [], false, []);
  assert.equal(result.pending.length, 3);
  assert.equal(result.applied, 0);
  assert.equal(result.ledger, false);
});
test('ledger with all migrations is a no-op', () => {
  assert.equal(validatePlan(manifest, applied(3), true, ['app_users']).pending.length, 0);
});
test('ledger with a valid prefix applies only later migrations', () => {
  assert.deepEqual(validatePlan(manifest, applied(2), true, ['app_users']).pending.map(m => m.filename),
    ['003_gaia_research_core.sql']);
});
test('untracked tables are never automatically replayed', () => {
  assert.throws(() => validatePlan(manifest, [], false, ['app_users']), /approved baseline/);
  assert.throws(() => validatePlan(manifest, [], true, ['app_users']), /approved baseline/);
});
test('unknown, non-prefix, or removed ledger files fail closed', () => {
  assert.throws(() => validatePlan(manifest, [{ filename: '003_gaia_research_core.sql', sha256: 'c'.repeat(64) }], true, ['app_users']), /Out-of-order/);
  assert.throws(() => validatePlan(manifest, [...applied(3), { filename: '004_extra.sql', sha256: 'd'.repeat(64) }], true, ['app_users']), /more migrations/);
  assert.throws(() => validatePlan(manifest, [{ filename: '000_untracked.sql', sha256: 'd'.repeat(64) }], true, ['app_users']), /Out-of-order/);
});
test('modified applied migration blocks deployment', () => {
  assert.throws(() => validatePlan(manifest, [{ filename: '001_auth.sql', sha256: 'e'.repeat(64) }], true, ['app_users']), /checksum mismatch/);
});
test('ledger without tables blocks deployment', () => {
  assert.throws(() => validatePlan(manifest, applied(1), true, []), /application tables are missing/);
});
test('migration files must have contiguous numeric versions and content', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gaia-migration-test-'));
  try {
    writeFileSync(join(dir, '001_auth.sql'), 'select 1;');
    writeFileSync(join(dir, '002_more.sql'), 'select 2;');
    const found = await loadMigrations(dir);
    assert.equal(found.length, 2);
    assert.match(found[0].sha256, /^[a-f0-9]{64}$/);
    writeFileSync(join(dir, '004_bad.sql'), 'select 3;');
    await assert.rejects(loadMigrations(dir), /filename\/order invalid/);
    rmSync(join(dir, '004_bad.sql'));
    writeFileSync(join(dir, '002_more.sql'), ' ');
    await assert.rejects(loadMigrations(dir), /Empty SQL migration/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
