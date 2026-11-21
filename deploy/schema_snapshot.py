"""Controlled shared-RDS snapshot only when pending Gaia migrations are confirmed."""
import os,time,datetime
from common import aws,fail,guard

def main():
 guard()
 if os.getenv('MIGRATION_NEEDED')!='true':fail('No pending migrations; snapshot not requested')
 if os.getenv('MIGRATION_APPROVED')!='true':fail('Snapshot approval missing')
 label='gaia-before-migration-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
 aws('rds','create-db-snapshot','--db-instance-identifier','moderta-prod-postgres','--db-snapshot-identifier',label)
 deadline=time.monotonic()+3600
 while time.monotonic()<deadline:
  item=aws('rds','describe-db-snapshots','--db-snapshot-identifier',label)['DBSnapshots'][0]
  if item['Status']=='available':
   print('GAIA_MIGRATION_SNAPSHOT_READY',label)
   path=os.getenv('GITHUB_OUTPUT')
   if path:
    with open(path,'a') as out:out.write('snapshot_id='+label+'\n')
   return
  if item['Status'] not in ('creating','pending'):fail('Snapshot failed '+item['Status'])
  time.sleep(20)
 fail('Snapshot timeout')
if __name__=='__main__':main()
