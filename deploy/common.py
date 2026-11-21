"""Gaia deployment contract. All AWS deployment identifiers and secret ARNs are injected by protected environments.
ECS retrieves secret values; this module never retrieves them.
"""
import json,os,re,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def fail(message):raise RuntimeError('GAIA_BLOCKED: '+message)
def load_config():
    raw=json.loads((ROOT/'config/deployment-targets/production.json').read_text())
    def expand(v):
        if isinstance(v,str):
            m=re.fullmatch(r'\$\{([A-Z][A-Z0-9_]*)\}',v)
            if m:
                val=os.environ.get(m.group(1),'').strip()
                if not val:fail('Required deployment environment variable not set: '+m.group(1))
                return val
        return v
    return {k:expand(v) for k,v in raw.items()}
CFG=load_config()
ACCOUNT=CFG['account'];REGION=CFG['region'];CLUSTER=CFG['cluster'];SERVICE=CFG['service']
FAMILY=CFG['family'];SCHEMA=CFG['schemaFamily'];CONTAINER=CFG['container'];LOG=CFG['logGroup']
DB_HOST=CFG['dbHost'];DB=CFG['database'];APP_USER=CFG['runtimeUser'];MIGRATOR_USER=CFG['migratorUser']
EXEC=f"arn:aws:iam::{ACCOUNT}:role/{CFG['executionRoleName']}"
RUNTIME=f"arn:aws:iam::{ACCOUNT}:role/{CFG['runtimeRoleName']}"
def aws(*args):
    p=subprocess.run(['aws',*args,'--region',REGION,'--output','json'],capture_output=True,text=True)
    if p.returncode:fail('AWS '+ ' '.join(args[:2])+' failed: '+p.stderr[:450])
    return json.loads(p.stdout or 'null')
def guard():
    if not re.fullmatch(r'\d{12}',ACCOUNT):fail('Invalid account')
    if not re.fullmatch(r'[a-z]{2}-[a-z]+-\d+',REGION):fail('Invalid region')
    if CFG.get('publicIngressEnabled') is not False or CFG.get('sqsEnabled') is not False:
        fail('Phase 1 public ingress and SQS application integration must stay disabled')
    if aws('sts','get-caller-identity').get('Account')!=ACCOUNT:fail('Wrong AWS account')
    if os.getenv('PUBLIC_INGRESS_ENABLED','false')!='false':fail('Gaia public routing disabled for Phase 1')
def image():
    s=os.getenv('IMAGE_REF','')
    if not re.fullmatch(r'ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+@sha256:[a-f0-9]{64}',s):fail('Immutable GHCR digest required')
    return s
def secret(name):
    secret_key={'db-app-password':'dbAppPasswordSecretArn','db-migrator-password':'dbMigratorPasswordSecretArn','jwt-secret':'jwtSecretArn'}.get(name)
    if not secret_key:fail('Unknown secret logical name: '+name)
    arn=CFG[secret_key]
    if not arn.startswith(f'arn:aws:secretsmanager:{REGION}:{ACCOUNT}:secret:'):
        fail('Secret ARN region/account mismatch for '+name)
    return arn
def ghcr():
    arn=CFG['ghcrSecretArn']
    if not arn.startswith(f'arn:aws:secretsmanager:{REGION}:{ACCOUNT}:secret:'):
        fail('GHCR secret ARN region/account mismatch')
    return arn
def register(obj):return aws('ecs','register-task-definition','--cli-input-json',json.dumps(obj))['taskDefinition']['taskDefinitionArn']
def container(image_ref,command,user,secret_arn,kind):
    is_app=kind=='api';port=str(CFG['port'])
    env={'NODE_ENV':'production','PORT':port,'DB_HOST':DB_HOST,'DB_PORT':'5432','DB_NAME':DB,'DB_USER':user,
       'DB_VERIFICATION_ROLE':'app' if user==APP_USER else 'migrator',
       'DB_VERIFICATION_STAGE':os.getenv('DB_VERIFICATION_STAGE','pre'),
       'JWT_EXPIRES_IN':os.getenv('JWT_EXPIRES_IN','1d'),'CORS_ALLOWED_ORIGINS':os.getenv('CORS_ALLOWED_ORIGINS','')}
    secrets=[{'name':'DB_PASSWORD','valueFrom':secret_arn}]
    if is_app:secrets.append({'name':'JWT_SECRET','valueFrom':secret('jwt-secret')})
    d={'name':CONTAINER if is_app else 'gaia-schema-job','image':image_ref,'essential':True,'cpu':256,'memoryReservation':256,'memory':512,
      'repositoryCredentials':{'credentialsParameter':ghcr()},'environment':[{'name':k,'value':v} for k,v in env.items()],
      'secrets':secrets,'command':command,'logConfiguration':{'logDriver':'awslogs','options':{'awslogs-group':LOG,'awslogs-region':REGION,'awslogs-stream-prefix':kind}}}
    if is_app:
      d['portMappings']=[{'containerPort':int(port),'hostPort':0,'protocol':'tcp'}]
      d['healthCheck']={'command':['CMD-SHELL',f'node -e "require(\'http\').get(\'http://127.0.0.1:{port}/ready\',r=>process.exit(r.statusCode===200?0:1)).on(\'error\',()=>process.exit(1))"'], 'interval':30,'timeout':5,'retries':3,'startPeriod':60}
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
