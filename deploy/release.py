"""Gaia ECS EC2 bridge rollout with digest, private-only initial deploy, ECS circuit breaker."""
import os
from common import aws,fail,guard,image,secret,register,task,container,service,wait_healthy,CLUSTER,SERVICE,FAMILY,APP_USER
from preflight import main as preflight,check_rollout_capacity
from resources import deployment_policy

def main():
 guard()
 if os.getenv('RELEASE_APPROVED')!='true':fail('Protected DEPLOY confirmation required')
 preflight();ref=image()
 policy=deployment_policy()
 current=service()
 check_rollout_capacity(current)
 old=current.get('taskDefinition') if current else None
 d=container(ref,['node','dist/main.js'],APP_USER,secret('db-app-password'),'api')
 revision=register(task(FAMILY,d))
 config_args=policy.aws_args()
 if not current:
  aws('ecs','create-service','--cluster',CLUSTER,'--service-name',SERVICE,'--launch-type','EC2','--task-definition',revision,
      '--desired-count','0',*config_args,'--enable-ecs-managed-tags','--tags','key=Application,value=gaia')
 try:
  aws('ecs','update-service','--cluster',CLUSTER,'--service',SERVICE,'--task-definition',revision,'--desired-count','1',*config_args)
  wait_healthy(revision)
 except Exception:
  if not old:
   aws('ecs','update-service','--cluster',CLUSTER,'--service',SERVICE,'--desired-count','0')
  print('GAIA_ROLLOUT_FAILED previous task definition:',old)
  raise
 print('GAIA_RELEASE_OK',revision)
if __name__=='__main__':main()
