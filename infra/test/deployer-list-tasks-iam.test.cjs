"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const { App } = require('aws-cdk-lib');
const { Template } = require('aws-cdk-lib/assertions');
const { GaiaFoundationStack } = require('../dist/lib/foundation-stack');

// Synthesizing the real CDK stack protects against changes to IAM action/resource
// semantics without needing live AWS credentials or accessing production secrets.
test('Gaia app-deployer ListTasks only covers container instances in its existing cluster', () => {
  const account = '123456789012';
  const region = 'ap-south-1';
  const cluster = 'moderta-production-cluster';
  const secret = name => `arn:aws:secretsmanager:${region}:${account}:secret:gaia/${name}-example`;
  const cfg = {
    account, region, cluster, service: 'moderta-production-gaia-api',
    schemaFamily: 'moderta-production-gaia-schema',
    deployRoleName: 'moderta-gaia-prod-app-deployer',
    executionRoleName: 'moderta-gaia-prod-execution',
    runtimeRoleName: 'moderta-gaia-prod-task',
    dbAppPasswordSecretArn: secret('db-app'),
    dbMigratorPasswordSecretArn: secret('db-migrator'),
    jwtSecretArn: secret('jwt'), ghcrSecretArn: secret('ghcr'),
    logGroup: '/ecs/moderta/production/gaia-api',
    rdsIdentifier: 'moderta-prod-postgres', alarmPrefix: 'moderta-production-gaia-api-',
  };
  const app = new App();
  const stack = new GaiaFoundationStack(app, 'GaiaTestFoundation', {
    env: { account, region }, cfg,
    appSubject: 'repo:example@123/gaia-be@456:environment:production',
  });
  const resources = Template.fromStack(stack).toJSON().Resources;
  const policies = Object.values(resources)
    .filter(resource => resource.Type === 'AWS::IAM::Policy')
    .flatMap(resource => resource.Properties.PolicyDocument.Statement);
  const listing = policies.filter(statement =>
    [statement.Action].flat().includes('ecs:ListTasks')
  );
  assert.equal(listing.length, 1, 'Expected exactly one ListTasks policy statement');
  assert.equal(listing[0].Effect, 'Allow');
  assert.deepEqual([listing[0].Resource].flat(), [
    `arn:aws:ecs:${region}:${account}:container-instance/${cluster}/*`,
  ]);
  assert.deepEqual(listing[0].Condition, {
    ArnEquals: { 'ecs:cluster': `arn:aws:ecs:${region}:${account}:cluster/${cluster}` },
  });
  assert.ok(![listing[0].Resource].flat().includes('*'), 'No global wildcard resource');
});
