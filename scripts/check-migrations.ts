import {createHash} from 'node:crypto'
import {readdir,readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createPool} from './db'
async function main(){
 const pool=createPool()
 try{
  const found=await pool.query(`SELECT to_regclass('public.schema_migrations') AS ledger`)
  const ledger=Boolean(found.rows[0].ledger)
  const tables=await pool.query(`SELECT COUNT(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename<>'schema_migrations'`)
  if(!ledger && tables.rows[0].n>0)throw Error('Existing Gaia tables but no migration ledger: reconcile baseline manually; refusing automatic replay')
  const existing=new Map<string,string>()
  if(ledger){const rows=await pool.query('SELECT filename,sha256 FROM public.schema_migrations');for(const x of rows.rows)existing.set(x.filename,x.sha256)}
  let pending=0
  for(const name of (await readdir(join(process.cwd(),'migrations'))).filter(x=>x.endsWith('.sql')).sort()){
   const sql=await readFile(join(process.cwd(),'migrations',name),'utf8')
   const sum=createHash('sha256').update(sql).digest('hex')
   if(existing.has(name)&&existing.get(name)!==sum)throw Error('Modified applied migration: '+name)
   if(!existing.has(name))pending++
  }
  console.log(JSON.stringify({status:'pass',pending,ledger}))
  if(pending>0)process.exitCode=10
 }finally{await pool.end()}
}
main().catch(e=>{console.error('GAIA_MIGRATION_PLAN_FAILED:',e.message);process.exitCode=1})
