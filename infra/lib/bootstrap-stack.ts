import { Stack, StackProps, Duration, CfnOutput, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';
interface Props extends StackProps { infraSubject:string }
const account='516900616370',region='ap-south-1';
const stackArn=`arn:aws:cloudformation:${region}:${account}:stack/ModertaGaiaFoundationStack/*`;
const assetBucket=`arn:aws:s3:::cdk-hnb659fds-assets-${account}-${region}`;
const roleNames=['moderta-gaia-prod-app-deployer','moderta-gaia-prod-task-execution','moderta-gaia-prod-task-runtime'];
export class GaiaBootstrapStack extends Stack {
 constructor(scope: Construct,id: string,props: Props){
  super(scope,id,props);
  const oidc=iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this,'Oidc',`arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`);
  const infra=new iam.Role(this,'InfrastructureRole',{
   roleName:'moderta-gaia-prod-infra-deployer',maxSessionDuration:Duration.hours(1),
   assumedBy:new iam.WebIdentityPrincipal(oidc.openIdConnectProviderArn,{StringEquals:{
    'token.actions.githubusercontent.com:aud':'sts.amazonaws.com',
    'token.actions.githubusercontent.com:sub':props.infraSubject}})
  });
  const add=(actions:string[],resources:string[],sid:string)=>infra.addToPolicy(new iam.PolicyStatement({sid,actions,resources}));
  add(['ssm:GetParameter'],[`arn:aws:ssm:${region}:${account}:parameter/cdk-bootstrap/hnb659fds/version`],'CdkBootstrapVersion');
  add(['cloudformation:DescribeStacks','cloudformation:DescribeStackEvents','cloudformation:DescribeStackResources',
      'cloudformation:GetTemplate','cloudformation:GetTemplateSummary','cloudformation:ListStackResources',
      'cloudformation:CreateStack','cloudformation:UpdateStack','cloudformation:CreateChangeSet',
      'cloudformation:DescribeChangeSet','cloudformation:ExecuteChangeSet','cloudformation:DeleteChangeSet',
      'cloudformation:UpdateTerminationProtection'],[stackArn,`arn:aws:cloudformation:${region}:${account}:changeSet/*/*`],'CfnGaiaFoundation');
  add(['cloudformation:ValidateTemplate','cloudformation:ListStacks'],['*'],'CfnTemplateValidation');
  // The foundation workflow checks the pre-existing cluster before computing its CDK diff.
  // Read-only, scoped to the existing production cluster (no cluster mutation rights).
  add(['ecs:DescribeClusters'],
      [`arn:aws:ecs:${region}:${account}:cluster/moderta-production-cluster`],
      'ExistingEcsClusterReadOnly');
  add(['s3:GetBucketLocation','s3:ListBucket'],[assetBucket],'CdkAssetsRead');
  add(['s3:GetObject','s3:PutObject','s3:AbortMultipartUpload'],[`${assetBucket}/*`],'CdkAssetsWrite');
  add(['iam:CreateRole','iam:DeleteRole','iam:GetRole','iam:UpdateAssumeRolePolicy',
       'iam:PutRolePolicy','iam:DeleteRolePolicy','iam:GetRolePolicy','iam:ListRolePolicies',
       'iam:ListAttachedRolePolicies','iam:ListRoleTags','iam:TagRole','iam:UntagRole'],
      roleNames.map(n=>`arn:aws:iam::${account}:role/${n}`),'GaiaRolesOnly');
  infra.addToPolicy(new iam.PolicyStatement({sid:'ExecutionPolicyOnly',
    actions:['iam:AttachRolePolicy','iam:DetachRolePolicy'],
    resources:[`arn:aws:iam::${account}:role/moderta-gaia-prod-task-execution`],
    conditions:{ArnEquals:{'iam:PolicyARN':'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'}}}));
  add(['logs:DescribeLogGroups'],['*'],'LogGroupDiscovery');
  add(['logs:CreateLogGroup','logs:DeleteLogGroup','logs:PutRetentionPolicy','logs:DeleteRetentionPolicy',
       'logs:TagResource','logs:UntagResource','logs:ListTagsForResource'],[
       `arn:aws:logs:${region}:${account}:log-group:/moderta/production/gaia-api`,
       `arn:aws:logs:${region}:${account}:log-group:/moderta/production/gaia-api:*`],'GaiaLogsOnly');
  add(['cloudwatch:PutMetricAlarm','cloudwatch:DeleteAlarms','cloudwatch:DescribeAlarms'],[
      `arn:aws:cloudwatch:${region}:${account}:alarm:moderta-gaia-*`],'GaiaAlarmsOnly');
  new CfnOutput(this,'InfrastructureDeployerRoleArn',{value:infra.roleArn});
 }
}
