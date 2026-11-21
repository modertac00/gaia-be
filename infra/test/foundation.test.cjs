const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('no shared infrastructure resources or public Gaia routes in CDK foundation',()=>{
 const s=fs.readFileSync('lib/foundation-stack.ts','utf8');
 assert.ok(s.includes('moderta-production-cluster'));
 assert.ok(s.includes('moderta-production-gaia-api'));
 assert.ok(!s.includes('new ecs.Cluster('));
 assert.ok(!s.includes('new ec2.Vpc('));
 assert.ok(!s.includes('new route53.'));
 assert.ok(!s.includes('sqs:SendMessage'));
});
