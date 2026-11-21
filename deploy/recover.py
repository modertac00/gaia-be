"""Gaia-only ECS task rollback. Never touches RDS, SQS or Traefik."""
import os
from common import aws,fail,guard,CLUSTER,SERVICE,FAMILY,CONTAINER,wait_healthy

def main():
 guard()
 if os.getenv('RECOVER_CONFIRMATION')!='RECOVER_GAIA_ONLY':fail('Recovery confirmation missing')
 arn=os.getenv('RECOVER_TASK_DEFINITION','')
 if not arn.startswith('arn:aws:ecs:ap-south-1:516900616370:task-definition/'+FAMILY+':'):fail('Invalid Gaia task revision')
 info=aws('ecs','describe-task-definition','--task-definition',arn)['taskDefinition']
 c=info.get('containerDefinitions',[])
 if info['family']!=FAMILY or len(c)!=1 or c[0]['name']!=CONTAINER:fail('Wrong container/task family')
 env={x['name']:x['value'] for x in c[0].get('environment',[])}
 if env.get('DB_NAME')!='gaia' or env.get('DB_USER')!='gaia_app':fail('Wrong runtime DB identity')
 aws('ecs','update-service','--cluster',CLUSTER,'--service',SERVICE,'--task-definition',arn,'--desired-count','1')
 wait_healthy(arn)
 print('GAIA_RECOVERED',arn)
if __name__=='__main__':main()
