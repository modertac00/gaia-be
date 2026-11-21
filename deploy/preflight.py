"""Read-only Moderta production preflight; never edits shared network or ECS capacity."""
from common import aws,fail,CFG,CLUSTER,DB_HOST,guard

def main():
 guard()
 cluster=aws('ecs','describe-clusters','--clusters',CLUSTER)['clusters'][0]
 if cluster.get('status')!='ACTIVE' or cluster.get('registeredContainerInstancesCount',0)<1:fail('Existing ECS cluster unavailable')
 db=aws('rds','describe-db-instances','--db-instance-identifier',CFG['rdsIdentifier'])['DBInstances'][0]
 if db.get('Engine')!='postgres' or db.get('PubliclyAccessible') is not False or db.get('DBInstanceStatus')!='available':fail('RDS must be private available PostgreSQL')
 if db.get('Endpoint',{}).get('Address')!=DB_HOST:fail('RDS endpoint mismatch')
 if CFG['rdsSecurityGroupId'] not in [x.get('VpcSecurityGroupId') for x in db.get('VpcSecurityGroups',[])]:fail('RDS SG mismatch')
 rules=aws('ec2','describe-security-groups','--group-ids',CFG['rdsSecurityGroupId'])['SecurityGroups'][0].get('IpPermissions',[])
 if not any(p.get('IpProtocol')=='tcp' and p.get('FromPort',65536)<=5432<=p.get('ToPort',0) and any(g.get('GroupId')==CFG['ecsHostSecurityGroupId'] for g in p.get('UserIdGroupPairs',[])) for p in rules):fail('ECS host SG lacks private RDS TCP 5432 access')
 hosts=aws('ecs','list-container-instances','--cluster',CLUSTER).get('containerInstanceArns',[])
 if not hosts:fail('No ECS EC2 hosts')
 nodes=aws('ecs','describe-container-instances','--cluster',CLUSTER,'--container-instances',*hosts).get('containerInstances',[])
 if not any(x.get('status')=='ACTIVE' and x.get('agentConnected') for x in nodes):fail('No connected ECS agents')
 for x in nodes:
  if x.get('status')!='ACTIVE' or not x.get('agentConnected'):continue
  free={r['name']:r.get('integerValue',0) for r in x.get('remainingResources',[])}
  if free.get('CPU',0)>=256 and free.get('MEMORY',0)>=512:break
 else:fail('Insufficient ECS CPU/512MiB reservation; do not force placement')
 host_sg=aws('ec2','describe-security-groups','--group-ids',CFG['ecsHostSecurityGroupId'])['SecurityGroups'][0]
 for p in host_sg.get('IpPermissions',[]):
  lo=p.get('FromPort',0);hi=p.get('ToPort',65535)
  if p.get('IpProtocol') not in ('tcp','-1'):continue
  if (p.get('IpProtocol')=='-1' or (lo<=61000 and hi>=32768)) and any(x.get('CidrIp')=='0.0.0.0/0' for x in p.get('IpRanges',[])):
   fail('ECS dynamic bridge port range publicly exposed')
 print('GAIA_PREFLIGHT_OK existing cluster, private RDS, network, capacity')
if __name__=='__main__':main()
