/** One-time *read-only structural* verification for Gaia's historical 001-003 baseline.
 * This is intentionally conservative. A failed contract requires DBA investigation,
 * never an automatic DROP/CREATE or a fabricated migration record.
 */
import type { PoolClient } from 'pg'

const columns: Record<string, string> = {
  app_users: 'id:uuid! email:text! name:text! password_hash:text! created_at:timestamptz! updated_at:timestamptz!',
  app_init_data: 'key:text! payload:jsonb! created_at:timestamptz! updated_at:timestamptz!',
  research: 'id:uuid! title:text! topic:text! research_type:text! status:text! requested_by_user_id:uuid scope_notes:text! ai_instructions:text! created_at:timestamptz! updated_at:timestamptz!',
  research_notes: 'id:uuid! request_id:uuid! title:text! version:integer! status:text! format_schema:jsonb! created_by:text! created_at:timestamptz!',
  research_note_sections: 'id:uuid! note_id:uuid! position:integer! title:text! content:text! content_format:text! format_metadata:jsonb! created_at:timestamptz! updated_at:timestamptz!',
  knowledge_base_papers: 'id:uuid! research_id:uuid! title:text! description:text! is_verified:boolean! paper_url:text created_by:text! created_at:timestamptz!',
  research_notes_chats: 'id:uuid! research_note_id:uuid! role:text! message:text! message_type:text! metadata:jsonb! llm_run_id:uuid created_by:text! created_at:timestamptz!',
}

const requiredConstraints: Record<string, string> = {
  'app_users:app_users_pkey': 'p',
  'app_users:app_users_email_key': 'u',
  'app_init_data:app_init_data_pkey': 'p',
  'research:research_pkey': 'p',
  'research:research_requested_by_user_id_fkey': 'f',
  'research_notes:research_notes_pkey': 'p',
  'research_notes:research_notes_request_id_fkey': 'f',
  'research_notes:research_notes_request_id_version_key': 'u',
  'research_note_sections:research_note_sections_pkey': 'p',
  'research_note_sections:research_note_sections_note_id_fkey': 'f',
  'knowledge_base_papers:knowledge_base_papers_pkey': 'p',
  'knowledge_base_papers:knowledge_base_papers_research_id_fkey': 'f',
  'research_notes_chats:research_notes_chats_pkey': 'p',
  'research_notes_chats:research_notes_chats_research_note_id_fkey': 'f',
}
const requiredIndexes = [
  'research_status_created_at_idx', 'research_type_created_at_idx',
  'research_notes_request_version_idx', 'research_note_sections_note_position_idx',
  'knowledge_base_papers_research_idx', 'research_notes_chats_note_created_at_idx',
  'research_notes_chats_note_type_created_at_idx',
]
const requiredTriggers: Record<string, string> = {
  'app_users:app_users_single_account': 'prevent_multiple_app_users',
  'app_init_data:app_init_data_updated_at': 'set_app_init_data_updated_at',
  'research:research_updated_at': 'set_research_updated_at',
  'research_note_sections:research_note_sections_updated_at': 'set_research_note_sections_updated_at',
}
const requiredDefaults: Record<string, string> = {
  'app_users.id': 'gen_random_uuid',
  'app_users.created_at': 'now()', 'app_users.updated_at': 'now()',
  'app_init_data.created_at': 'now()', 'app_init_data.updated_at': 'now()',
  'research.id': 'gen_random_uuid', 'research.status': 'queued',
  'research.scope_notes': "''", 'research.ai_instructions': "''",
  'research.created_at': 'now()', 'research.updated_at': 'now()',
  'research_notes.id': 'gen_random_uuid', 'research_notes.status': 'draft',
  'research_notes.format_schema': "'{}'", 'research_notes.created_at': 'now()',
  'research_note_sections.id': 'gen_random_uuid',
  'research_note_sections.content': "''", 'research_note_sections.content_format': 'plain_text',
  'research_note_sections.format_metadata': "'{}'", 'research_note_sections.created_at': 'now()',
  'research_note_sections.updated_at': 'now()',
  'knowledge_base_papers.id': 'gen_random_uuid', 'knowledge_base_papers.description': "''",
  'knowledge_base_papers.is_verified': 'false', 'knowledge_base_papers.created_at': 'now()',
  'research_notes_chats.id': 'gen_random_uuid', 'research_notes_chats.message_type': 'chat',
  'research_notes_chats.metadata': "'{}'", 'research_notes_chats.created_at': 'now()',
}
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(`Gaia baseline verification rejected: ${message}`)
}

/** This check is a guardrail, NOT an assertion that existing user data is disposable. */
export async function verifyInitialGaiaSchema(client: Pick<PoolClient, 'query'>): Promise<void> {
  const ext = await client.query("SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'")
  ensure(ext.rows.length === 1, 'pgcrypto extension missing')
  const tableNames = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations' ORDER BY tablename"))
    .rows.map(row => String(row.tablename)).sort()
  ensure(JSON.stringify(tableNames) === JSON.stringify(Object.keys(columns).sort()),
    `expected exactly 7 initial application tables; found ${tableNames.join(', ')}`)

  const colRows = (await client.query(`SELECT c.relname AS table_name, a.attname AS column_name,
      format_type(a.atttypid, a.atttypmod) AS type_name, a.attnotnull AS required,
      pg_get_expr(ad.adbin, ad.adrelid) AS default_expr
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef ad ON ad.adrelid=c.oid AND ad.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
    ORDER BY c.relname,a.attnum`)).rows
  const actual = new Map<string, { type: string, required: boolean, defaultExpr: string | null }>()
  for (const col of colRows) actual.set(`${col.table_name}.${col.column_name}`,
    {type: col.type_name, required: col.required, defaultExpr: col.default_expr})
  const expectedKeys: string[] = []
  for (const [table, spec] of Object.entries(columns)) {
    for (const field of spec.split(' ')) {
      const [name, dataType] = field.split(':')
      const required = dataType.endsWith('!')
      const type = dataType.replace('!', '') === 'timestamptz' ? 'timestamp with time zone' : dataType.replace('!', '')
      const key = `${table}.${name}`
      expectedKeys.push(key)
      const got = actual.get(key)
      ensure(got && got.type === type && got.required === required,
        `${key} type or nullability differs from the initial SQL migrations`)
      const expectedDefault = requiredDefaults[key]
      if (expectedDefault !== undefined) {
        ensure(got.defaultExpr && got.defaultExpr.includes(expectedDefault), `${key} default differs from initial migration`)
      } else {
        ensure(!got.defaultExpr, `${key} has an unexpected default`)
      }
    }
  }
  ensure(JSON.stringify([...actual.keys()].sort()) === JSON.stringify(expectedKeys.sort()),
    'one or more table columns differ from the exact initial schema')

  const constraints = (await client.query(`SELECT c.relname AS table_name, con.conname, con.contype,
       pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con JOIN pg_class c ON con.conrelid=c.oid
    JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public'`)).rows
  const actualConstraints = new Map<string, string>(constraints.map(c => [`${c.table_name}:${c.conname}`, String(c.contype)]))
  for (const [key, expectedType] of Object.entries(requiredConstraints)) {
    ensure(actualConstraints.get(key) === expectedType, `${key} constraint missing or has wrong type`)
  }
  ensure(actualConstraints.size === Object.keys(requiredConstraints).length, 'unexpected/missing table constraints detected')
  const fkTargets: Record<string, string> = {
    research_requested_by_user_id_fkey: 'REFERENCES app_users(id)',
    research_notes_request_id_fkey: 'REFERENCES research(id) ON DELETE CASCADE',
    research_note_sections_note_id_fkey: 'REFERENCES research_notes(id) ON DELETE CASCADE',
    knowledge_base_papers_research_id_fkey: 'REFERENCES research(id) ON DELETE CASCADE',
    research_notes_chats_research_note_id_fkey: 'REFERENCES research_notes(id) ON DELETE CASCADE',
  }
  for (const [name, target] of Object.entries(fkTargets)) {
    ensure(constraints.some(c => c.conname === name && String(c.def).includes(target)), `${name} target/cascade differs`)
  }
  ensure(constraints.some(c => c.conname === 'research_notes_request_id_version_key' &&
    String(c.def).includes('UNIQUE (request_id, version)')), 'research note version uniqueness differs')

  const indexes = (await client.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'")).rows
    .map(row => String(row.indexname))
  for (const name of requiredIndexes) ensure(indexes.includes(name), `index ${name} missing`)

  const triggers = (await client.query(`SELECT c.relname AS table_name, t.tgname, p.proname, t.tgenabled
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid WHERE n.nspname='public' AND NOT t.tgisinternal`)).rows
  for (const [key, procedure] of Object.entries(requiredTriggers)) {
    const [table, trigger] = key.split(':')
    ensure(triggers.some(row => row.table_name === table && row.tgname === trigger &&
      row.proname === procedure && row.tgenabled !== 'D'), `trigger ${key} missing or disabled`)
  }
  ensure(triggers.length === Object.keys(requiredTriggers).length, 'unexpected trigger configuration')
  const funcs = (await client.query(`SELECT p.proname, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
    'prevent_multiple_app_users','set_app_init_data_updated_at','set_research_updated_at','set_research_note_sections_updated_at')`)).rows
  ensure(funcs.length === 4, 'required trigger function definitions missing')
  for (const f of funcs) {
    const normalized = String(f.definition).replace(/\s+/g, ' ').toLowerCase()
    if (f.proname === 'prevent_multiple_app_users') {
      ensure(normalized.includes('count(*)') && normalized.includes('app_users') &&
        normalized.includes('>= 1') && normalized.includes('raise exception'), 'single-account guard differs')
    } else {
      ensure(normalized.includes('new.updated_at = now()'), `timestamp function ${f.proname} differs`)
    }
  }
  console.log('GAIA_INITIAL_SCHEMA_VERIFIED: 7 tables, column types/defaults, constraints, indexes, triggers, functions, pgcrypto')
}
