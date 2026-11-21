import { createPool } from './db'
async function main(){
 const role=process.env.DB_VERIFICATION_ROLE
 const stage=process.env.DB_VERIFICATION_STAGE||'pre'
 if(!['app','migrator'].includes(role||'')||!['pre','post'].includes(stage))throw Error('Invalid verification role/stage')
 const pool=createPool()
 try {
  const result=await pool.query(`SELECT current_user AS username,current_database() AS database,
   has_database_privilege(current_user,current_database(),'CONNECT') AS can_connect,
   has_schema_privilege(current_user,'public','USAGE') AS can_use,
   has_schema_privilege(current_user,'public','CREATE') AS can_create,
   EXISTS(SELECT 1 FROM pg_extension WHERE extname='pgcrypto') AS pgcrypto_installed`)
  const v=result.rows[0],expected=role==='app'?'gaia_app':'gaia_migrator'
  if(v.username!==expected||v.database!=='gaia'||!v.can_connect||!v.can_use||v.can_create!==(role==='migrator'))throw Error('Database role/privilege mismatch')
  if(!v.pgcrypto_installed)throw Error('Administrator must install pgcrypto before migrations')
  if(stage==='post'){
   const tables=await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`)
   if(!tables.rows.some(x=>x.tablename==='app_users'))throw Error('Gaia schema missing')
   if(role==='app'){
    const grants=await pool.query(`SELECT has_table_privilege(current_user,'public.app_users','SELECT') AS r,
      has_table_privilege(current_user,'public.app_users','INSERT') AS w`)
    if(!grants.rows[0].r||!grants.rows[0].w)throw Error('Gaia app lacks DML grants')
    const ledger=await pool.query(`SELECT to_regclass('public.schema_migrations') AS tbl`)
    if(ledger.rows[0].tbl){
     const access=await pool.query(`SELECT has_table_privilege(current_user,'public.schema_migrations','SELECT') AS can_read`)
     if(!access.rows[0].can_read)throw Error('Gaia app cannot read migration ledger')
    }
   }
  }
  console.log(JSON.stringify({status:'pass',role,stage,database:v.database,username:v.username}))
 }finally{await pool.end()}
}
main().catch(e=>{console.error('GAIA_DB_VERIFY_FAILED:',e.message);process.exitCode=1})
