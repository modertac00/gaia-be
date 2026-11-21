import {App,Tags,CliCredentialsStackSynthesizer} from 'aws-cdk-lib';
import {GaiaBootstrapStack} from '../lib/bootstrap-stack';
import {GaiaFoundationStack} from '../lib/foundation-stack';
import {loadConfig,str} from '../lib/config';
const cfg=loadConfig(),app=new App(),account=str(cfg,'account'),region=str(cfg,'region');
if((process.env.CDK_DEFAULT_ACCOUNT||process.env.AWS_ACCOUNT_ID)!==account ||
   (process.env.CDK_DEFAULT_REGION||process.env.AWS_REGION)!==region)throw Error('AWS account/region differ from deployment contract');
if(cfg.publicIngressEnabled!==false||cfg.sqsEnabled!==false)throw Error('Phase 1 external integration is disabled');
const selection=process.env.GAIA_STACK_SELECTION,repo=process.env.GAIA_GITHUB_REPOSITORY;
if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||repo?.includes('*'))throw Error('Exact owner/repository required');
const ownerId=process.env.GAIA_GITHUB_OWNER_ID,repoId=process.env.GAIA_GITHUB_REPOSITORY_ID;
if(!/^\d+$/.test(ownerId||'')||!/^\d+$/.test(repoId||''))throw Error('Numeric repository/owner IDs required');
const [owner,name]=repo!.split('/'),subject=(env:string)=>`repo:${owner}@${ownerId}/${name}@${repoId}:environment:${env}`;
const env={account,region},synthesizer=new CliCredentialsStackSynthesizer();
if(selection==='bootstrap')new GaiaBootstrapStack(app,'ModertaGaiaBootstrapStack',{env,synthesizer,infraSubject:subject('production-infrastructure'),cfg,terminationProtection:true});
else if(selection==='foundation')new GaiaFoundationStack(app,'ModertaGaiaFoundationStack',{env,synthesizer,appSubject:subject('production'),cfg,terminationProtection:true});
else throw Error('GAIA_STACK_SELECTION must be bootstrap or foundation');
Tags.of(app).add('Application','gaia');Tags.of(app).add('ManagedBy','aws-cdk');Tags.of(app).add('Environment','production');
