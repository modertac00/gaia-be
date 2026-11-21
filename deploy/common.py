"""Gaia-only ECS helpers, equivalent to Moderta Reporting/AI Desk control plane.
Never retrieves secret values; ECS execution agent injects them.
"""
import json,os,re,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CFG=json.loads((ROOT/'config/deployment-targets/production.json').read_text())
ACCOUNT='516900616370'; REGION='ap-south-1'; CLUSTER='moderta-production-cluster'
SERVICE='moderta-production-gaia-api'; FAMILY=SERVICE; SCHEMA='moderta-production-gaia-schema'
CONTAINER='gaia-api'; LOG='/moderta/production/gaia-api'
EXEC=f'arn:aws:iam::{ACCOUNT}:role/moderta-gaia-prod-task-execution'
RUNTIME=f'arn:aws:iam::{ACCOUNT}:role/moderta-gaia-prod-task-runtime'
DB_HOST='moderta-prod-postgres.cnoc4ocwujou.ap-south-1.rds.amazonaws.com'
def fail(message):raise RuntimeError('GAIA_BLOCKED: '+message)
def aws(*args):
 p=subprocess.run(['aws',*args,'--region',REGION,'--output','json'],capture_output=True,text=True)
 if p.returncode:fail('AWS '+ ' '.join(args[:2])+' failed: '+p.stderr[:450])
 return json.loads(p.stdout or 'null')
def guard():
 for k,v in {'account':ACCOUNT,'region':REGION,'cluster':CLUSTER,'service':SERVICE,'family':FAMILY,'schemaFamily':SCHEMA,'container':CONTAINER,'database':'gaia','runtimeUser':'gaia_app','migratorUser':'gaia_migrator','dbHost':DB_HOST,'secretPrefix':'moderta/production/gaia/','publicIngressEnabled':False,'sqsEnabled':False}.items():
  if CFG.get(k)!=v:fail('Deployment target contract mismatch: '+k)
 if aws('sts','get-caller-identity').get('Account')!=ACCOUNT:fail('Wrong AWS account')
 if os.getenv('PUBLIC_INGRESS_ENABLED','false')!='false':fail('Gaia public routing disabled for Phase 1')
def image():
 s=os.getenv('IMAGE_REF','')
 if not re.fullmatch(r'ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+@sha256:[a-f0-9]{64}',s):fail('Immutable GHCR digest required')
 return s
def secret(name):
 if name not in ('db-app-password','db-migrator-password','jwt-secret'):fail('Unapproved secret name')
 x=aws('secretsmanager','describe-secret','--secret-id',f'moderta/production/gaia/{name}')
 arn=x.get('ARN','')
 if not arn.startswith(f'arn:aws:secretsmanager:{REGION}:{ACCOUNT}:secret:moderta/production/gaia/{name}-'):fail('Unexpected secret ARN')
 return arn
def ghcr():
 s=os.getenv('GHCR_SECRET_ARN','')
 if not re.fullmatch(r'arn:aws:secretsmanager:ap-south-1:516900616370:secret:[A-Za-z0-9/_+=.@-]+',s):fail('Approved GHCR secret ARN required')
 return s
def register(obj):return aws('ecs','register-task-definition','--cli-input-json',json.dumps(obj))['taskDefinition']['taskDefinitionArn']
def container(image_ref,command,user,secret_arn,kind):
 is_app=kind=='api'
 env={'NODE_ENV':'production','PORT':'3001','DB_HOST':DB_HOST,'DB_PORT':'5432','DB_NAME':'gaia','DB_USER':user,'DB_VERIFICATION_ROLE':'app' if user=='gaia_app' else 'migrator','DB_VERIFICATION_STAGE':os.getenv('DB_VERIFICATION_STAGE','pre'),'JWT_EXPIRES_IN':'1d','CORS_ALLOWED_ORIGINS':''}
 secrets=[{'name':'DB_PASSWORD','valueFrom':secret_arn}]
 if is_app:secrets.append({'name':'JWT_SECRET','valueFrom':secret('jwt-secret')})
 d={'name':CONTAINER if is_app else 'gaia-schema-job','image':image_ref,'essential':True,'cpu':256,'memoryReservation':256,'memory':512,
   'repositoryCredentials':{'credentialsParameter':ghcr()},'environment':[{'name':k,'value':v} for k,v in env.items()],
   'secrets':secrets,'command':command,'logConfiguration':{'logDriver':'awslogs','options':{'awslogs-group':LOG,'awslogs-region':REGION,'awslogs-stream-prefix':kind}}}
 if is_app:
  d['portMappings']=[{'containerPort':3001,'hostPort':0,'protocol':'tcp'}]
  d['healthCheck']={'command':['CMD-SHELL','node -e "require(\'http\').get(\'http://127.0.0.1:3001/ready\',r=>process.exit(r.statusCode===200?0:1)).on(\'error\',()=>process.exit(1))"'], 'interval':30,'timeout':5,'retries':3,'startPeriod':60}
 return d
def task(family,definition):
 return {'family':family,'requiresCompatibilities':['EC2'],'networkMode':'bridge','runtimePlatform':{'cpuArchitecture':'ARM64','operatingSystemFamily':'LINUX'},
  'executionRoleArn':EXEC,'taskRoleArn':RUNTIME,'containerDefinitions':[definition]}
def service():
 xs=aws('ecs','describe-services','--cluster',CLUSTER,'--services',SERVICE).get('services',[])
 return next((s for s in xs if s.get('status')=='ACTIVE'),None)
def wait_healthy(arn,minutes=20):
 deadline=time.monotonic()+60*minutes
 while time.monotonic()<deadline:
  svc=service()
  if not svc:fail('Service missing')
  deployments=svc.get('deployments',[])
  if any(d.get('taskDefinition')==arn and d.get('rolloutState')=='FAILED' for d in deployments):fail('ECS circuit breaker FAILED')
  if len(deployments)==1 and deployments[0].get('taskDefinition')==arn and deployments[0].get('rolloutState')=='COMPLETED' and svc.get('runningCount')==svc.get('desiredCount')==1:
   tasks=aws('ecs','list-tasks','--cluster',CLUSTER,'--service-name',SERVICE,'--desired-status','RUNNING').get('taskArns',[])
   if tasks:
    for t in aws('ecs','describe-tasks','--cluster',CLUSTER,'--tasks',*tasks).get('tasks',[]):
     if t.get('lastStatus')=='RUNNING' and t.get('taskDefinitionArn')==arn and any(c.get('name')==CONTAINER and c.get('healthStatus')=='HEALTHY' for c in t.get('containers',[])):return
  time.sleep(15)
 fail('Gaia ECS deployment did not reach healthy state')
