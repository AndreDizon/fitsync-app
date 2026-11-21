import assert from 'node:assert/strict'
import {build} from 'esbuild'
const b=await build({entryPoints:['shared/gym-workflow.ts'],bundle:true,write:false,platform:'node',format:'esm'})
const {gymRenewalsDue,gymMemberCoverage}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'))
const today='2026-11-21',base={id:'a',user_id:'a',starts_on:'2026-11-01',ends_on:'2026-11-24',cancelled:false},membership={members:[{user_id:'a'},{user_id:'b'}],membershipPeriods:[base]}
assert.equal(gymRenewalsDue(membership,today),1)
assert.equal(gymRenewalsDue({...membership,membershipPeriods:[base,{...base,id:'next',starts_on:'2026-11-25',ends_on:'2026-12-24'}]},today),0,'Contiguous renewal already recorded')
assert.equal(gymRenewalsDue({...membership,membershipPeriods:[base,{...base,id:'next',starts_on:'2026-11-26',ends_on:'2026-12-24'}]},today),1,'A coverage gap still needs attention')
assert.equal(gymRenewalsDue({...membership,membershipPeriods:[{...base,cancelled:true}]},today),0)
assert.equal(gymRenewalsDue({...membership,membershipPeriods:[{...base,user_id:'former'}]},today),0,'Ignore participants who left')
assert.equal(gymMemberCoverage(membership,'b',today).active,undefined,'Own coverage never picks another member')
assert.equal(gymMemberCoverage(membership,'a',today).active.id,'a')
assert.equal(gymMemberCoverage({...membership,membershipPeriods:[{...base,starts_on:'2026-12-01',ends_on:'2026-12-31'}]},'a',today).next.id,'a')
console.log('PASS gym overview workflow: renewal window, existing renewal/gaps, cancellation, roster membership, own coverage')
