"""Gaia ECS EC2 bridge rollout with digest, private-only initial deploy, ECS circuit breaker."""
import os
from common import aws,fail,guard,image,secret,register,task,container,service,wait_healthy,CLUSTER,SERVICE,FAMILY
from preflight import main as preflight

def main():
 guard()
 if os.getenv('RELEASE_APPROVED')!='true':fail('Protected DEPLOY confirmation required')
 preflight();ref=image()
 current=service()
 old=current.get('taskDefinition') if current else None
 d=container(ref,['node','dist/main.js'],'gaia_app',secret('db-app-password'),'api')
 revision=register(task(FAMILY,d))
 config='maximumPercent=200,minimumHealthyPercent=100,deploymentCircuitBreaker={enable=true,rollback=true}'
 if not current:
  aws('ecs','create-service','--cluster',CLUSTER,'--service-name',SERVICE,'--launch-type','EC2','--task-definition',revision,
      '--desired-count','0','--deployment-configuration',config,'--enable-ecs-managed-tags','--tags','key=Application,value=gaia')
 try:
  aws('ecs','update-service','--cluster',CLUSTER,'--service',SERVICE,'--task-definition',revision,'--desired-count','1','--deployment-configuration',config)
  wait_healthy(revision)
 except Exception:
  if not old:
   aws('ecs','update-service','--cluster',CLUSTER,'--service',SERVICE,'--desired-count','0')
  print('GAIA_ROLLOUT_FAILED previous task definition:',old)
  raise
 print('GAIA_RELEASE_OK',revision)
if __name__=='__main__':main()
