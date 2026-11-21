const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('Gaia does not provision shared networks, public routing or SQS application integration',()=>{
 const s=fs.readFileSync('lib/foundation-stack.ts','utf8');
 assert.ok(s.includes("str(props.cfg,'cluster')"));
 assert.ok(s.includes("str(props.cfg,'service')"));
 assert.ok(!s.includes('new ecs.Cluster('));assert.ok(!s.includes('new ec2.Vpc('));
 assert.ok(!s.includes('new route53.'));assert.ok(!s.includes('sqs:SendMessage'));
});
