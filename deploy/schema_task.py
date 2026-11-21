"""Gaia-only private one-off database plan/verification/migration. No DB-admin credentials."""
import os,time
from common import aws,fail,register,task,container,image,secret,SCHEMA,CLUSTER,guard
MODES={'verify-app':['node','dist-deploy/scripts/verify-db.js'],'verify-migrator':['node','dist-deploy/scripts/verify-db.js'],
 'plan':['node','dist-deploy/scripts/check-migrations.js'],'migrate':['node','dist-deploy/scripts/migrate.js'],'post-app':['node','dist-deploy/scripts/verify-db.js'],
 'post-migrator':['node','dist-deploy/scripts/verify-db.js']}
def main():
 guard();mode=os.getenv('SCHEMA_ACTION','')
 if mode not in MODES:fail('Invalid schema mode')
 if mode=='migrate':
  ident=os.getenv('MIGRATION_SNAPSHOT_ID','')
  if os.getenv('SCHEMA_AUTO_APPROVED')!='true' or not ident.startswith('gaia-before-migration-'):fail('Migration requires explicit approval and snapshot')
  snapshots=aws('rds','describe-db-snapshots','--db-snapshot-identifier',ident).get('DBSnapshots',[])
  if len(snapshots)!=1 or snapshots[0].get('Status')!='available' or snapshots[0].get('DBInstanceIdentifier')!='moderta-prod-postgres':fail('Required snapshot not available')
 migrator=mode in ('verify-migrator','post-migrator','migrate')
 role='gaia_migrator' if migrator else 'gaia_app'
 if mode in ('post-app','post-migrator'):os.environ['DB_VERIFICATION_STAGE']='post'
 d=container(image(),MODES[mode],role,secret('db-migrator-password' if migrator else 'db-app-password'),'schema')
 definition=register(task(SCHEMA,d))
 result=aws('ecs','run-task','--cluster',CLUSTER,'--launch-type','EC2','--task-definition',definition,'--count','1','--started-by','gaia-schema-'+mode)
 if result.get('failures') or not result.get('tasks'):fail('ECS one-off schema task placement failed')
 taskarn=result['tasks'][0]['taskArn']
 end=time.monotonic()+1800
 while time.monotonic()<end:
  t=aws('ecs','describe-tasks','--cluster',CLUSTER,'--tasks',taskarn)['tasks'][0]
  if t.get('lastStatus')=='STOPPED':
   containers=t.get('containers',[]);exitcode=containers[0].get('exitCode') if containers else None
   print('GAIA_SCHEMA_JOB',mode,'exit',exitcode,'reason',t.get('stoppedReason','')[:200])
   if exitcode==0 or (mode=='plan' and exitcode==10):return exitcode
   fail('Schema task failed; inspect CloudWatch schema logs')
  time.sleep(10)
 fail('Schema task timeout')
if __name__=='__main__':raise SystemExit(main())
