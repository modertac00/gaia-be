import {App,Tags,CliCredentialsStackSynthesizer} from 'aws-cdk-lib';
import {GaiaBootstrapStack} from '../lib/bootstrap-stack';
import {GaiaFoundationStack} from '../lib/foundation-stack';
const app=new App(),account=process.env.CDK_DEFAULT_ACCOUNT||process.env.AWS_ACCOUNT_ID,region=process.env.CDK_DEFAULT_REGION||process.env.AWS_REGION;
if(account!=='516900616370'||region!=='ap-south-1')throw Error('Unexpected production account/region');
const selection=process.env.GAIA_STACK_SELECTION,repo=process.env.GAIA_GITHUB_REPOSITORY;
if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||repo?.includes('*'))throw Error('Exact owner/repository required');
const ownerId=process.env.GAIA_GITHUB_OWNER_ID,repoId=process.env.GAIA_GITHUB_REPOSITORY_ID;
if(!/^\d+$/.test(ownerId||'')||!/^\d+$/.test(repoId||''))throw Error('Numeric repository/owner IDs required');
const [owner,name]=repo!.split('/'),subject=(env:string)=>`repo:${owner}@${ownerId}/${name}@${repoId}:environment:${env}`;
const env={account,region};
if(selection==='bootstrap')new GaiaBootstrapStack(app,'ModertaGaiaBootstrapStack',{env,synthesizer:new CliCredentialsStackSynthesizer(),infraSubject:subject('production-infrastructure'),terminationProtection:true});
else if(selection==='foundation'){
 const ghcr=process.env.GHCR_SECRET_ARN;
 if(!ghcr?.startsWith(`arn:aws:secretsmanager:${region}:${account}:secret:`))throw Error('Valid GHCR_SECRET_ARN required');
 new GaiaFoundationStack(app,'ModertaGaiaFoundationStack',{env,synthesizer:new CliCredentialsStackSynthesizer(),appSubject:subject('production'),ghcrSecretArn:ghcr,terminationProtection:true});
}else throw Error('GAIA_STACK_SELECTION must be bootstrap or foundation');
Tags.of(app).add('Application','gaia');Tags.of(app).add('ManagedBy','aws-cdk');Tags.of(app).add('Environment','production');
