import {Stack,StackProps,Duration,RemovalPolicy,CfnOutput,aws_iam as iam,aws_logs as logs,aws_cloudwatch as cloudwatch} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {GaiaConfig,str} from './config';
interface Props extends StackProps {appSubject:string;cfg:GaiaConfig}
export class GaiaFoundationStack extends Stack {
 constructor(scope:Construct,id:string,props:Props){
  super(scope,id,props);
  const account=str(props.cfg,'account'),region=str(props.cfg,'region'),cluster=str(props.cfg,'cluster');
  const service=str(props.cfg,'service'),schemaFamily=str(props.cfg,'schemaFamily');
  const ecs=`arn:aws:ecs:${region}:${account}`;
  const dbArns=['dbAppPasswordSecretArn','dbMigratorPasswordSecretArn','jwtSecretArn'].map(k=>str(props.cfg,k));
  const ghcrSecretArn=str(props.cfg,'ghcrSecretArn');
  for(const arn of [...dbArns,ghcrSecretArn])if(!arn.startsWith(`arn:aws:secretsmanager:${region}:${account}:secret:`))throw new Error('Secret ARN account/region mismatch');
  const oidc=iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this,'Oidc',`arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`);
  const deploy=new iam.Role(this,'AppDeployer',{roleName:str(props.cfg,'deployRoleName'),maxSessionDuration:Duration.hours(1),
   assumedBy:new iam.WebIdentityPrincipal(oidc.openIdConnectProviderArn,{StringEquals:{'token.actions.githubusercontent.com:aud':'sts.amazonaws.com','token.actions.githubusercontent.com:sub':props.appSubject}})});
  const execution=new iam.Role(this,'Execution',{roleName:str(props.cfg,'executionRoleName'),assumedBy:new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
   managedPolicies:[iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')]});
  const runtime=new iam.Role(this,'Runtime',{roleName:str(props.cfg,'runtimeRoleName'),assumedBy:new iam.ServicePrincipal('ecs-tasks.amazonaws.com')});
  const log=new logs.LogGroup(this,'Logs',{logGroupName:str(props.cfg,'logGroup'),retention:logs.RetentionDays.ONE_MONTH,removalPolicy:RemovalPolicy.RETAIN});
  execution.addToPolicy(new iam.PolicyStatement({sid:'ReadGaiaSecretsOnly',actions:['secretsmanager:GetSecretValue'],resources:[...dbArns,ghcrSecretArn]}));
  // Runtime role intentionally has no SQS, Bedrock, S3, RDS admin or public routing permission in Phase 1.
  const add=(sid:string,actions:string[],resources:string[],conditions?:Record<string,unknown>)=>deploy.addToPolicy(new iam.PolicyStatement({sid,actions,resources,conditions:conditions as any}));
  const clusterArn=`${ecs}:cluster/${cluster}`,serviceArn=`${ecs}:service/${cluster}/${service}`;
  const families=[`${ecs}:task-definition/${service}:*`,`${ecs}:task-definition/${schemaFamily}:*`];
  add('RegisterOwnTasks',['ecs:RegisterTaskDefinition'],families);
  add('ReadTaskDefinitions',['ecs:DescribeTaskDefinition'],['*']);
  add('ManageOnlyGaiaService',['ecs:CreateService','ecs:UpdateService','ecs:DescribeServices'],[serviceArn]);
  add('RunGaiaSchemaTasks',['ecs:RunTask'],families,{'ArnEquals':{'ecs:cluster':clusterArn}});
  add('ReadCluster',['ecs:DescribeClusters','ecs:ListContainerInstances'],[clusterArn]);
  add('ListClusterTasks',['ecs:ListTasks'],[clusterArn]);
  add('ReadEcsTasks',['ecs:DescribeTasks'],[`${ecs}:task/${cluster}/*`]);
  add('ReadEcsInstances',['ecs:DescribeContainerInstances'],[`${ecs}:container-instance/${cluster}/*`]);
  add('TagGaiaOnly',['ecs:TagResource'],[...families,serviceArn]);
  deploy.addToPolicy(new iam.PolicyStatement({sid:'PassGaiaTaskRolesOnly',actions:['iam:PassRole'],resources:[execution.roleArn,runtime.roleArn],conditions:{StringEquals:{'iam:PassedToService':'ecs-tasks.amazonaws.com'}}}));
  add('DescribeGaiaSecrets',['secretsmanager:DescribeSecret'],[...dbArns,ghcrSecretArn]);
  add('ReadOnlyNetwork',['ec2:DescribeSecurityGroups','ec2:DescribeInstances','ec2:DescribeSubnets'],['*']);
  add('RdsReadOnly',['rds:DescribeDBInstances','rds:DescribeDBSnapshots'],['*']);
  add('PreMigrationSnapshot',['rds:CreateDBSnapshot'],[`arn:aws:rds:${region}:${account}:db:${str(props.cfg,'rdsIdentifier')}`,`arn:aws:rds:${region}:${account}:snapshot:gaia-before-migration-*`]);
  add('TagGaiaSnapshot',['rds:AddTagsToResource'],[`arn:aws:rds:${region}:${account}:snapshot:gaia-before-migration-*`]);
  add('ReadGaiaLogs',['logs:DescribeLogStreams','logs:GetLogEvents'],[log.logGroupArn,`${log.logGroupArn}:*`]);
  for(const [n,m,t] of [['cpu','CPUUtilization',85],['memory','MemoryUtilization',90]] as const){
   new cloudwatch.Alarm(this,`High${n}`,{alarmName:`${str(props.cfg,'alarmPrefix')}${n}-high`,evaluationPeriods:3,threshold:t,datapointsToAlarm:3,
    treatMissingData:cloudwatch.TreatMissingData.NOT_BREACHING,
    metric:new cloudwatch.Metric({namespace:'AWS/ECS',metricName:m,period:Duration.minutes(5),statistic:'Average',dimensionsMap:{ClusterName:cluster,ServiceName:service}})});
  }
  new CfnOutput(this,'DeploymentRoleArn',{value:deploy.roleArn});
  new CfnOutput(this,'ExecutionRoleArn',{value:execution.roleArn});
  new CfnOutput(this,'RuntimeRoleArn',{value:runtime.roleArn});
  new CfnOutput(this,'ExistingClusterName',{value:cluster});
 }
}
