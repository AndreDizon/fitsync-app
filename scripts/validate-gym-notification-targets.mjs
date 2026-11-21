import assert from 'node:assert/strict'
import {build} from 'esbuild'
const output=await build({entryPoints:['shared/notifications.ts'],bundle:true,platform:'node',format:'esm',write:false})
const {isNotificationTarget,defaultNotificationPreferences}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'))
const gymId='11111111-1111-4111-8111-111111111111'
assert.equal(defaultNotificationPreferences.gym,true);assert.equal(defaultNotificationPreferences.gymRenewal,true)
for(const gymTab of ['announcements','sessions','team','attendance','membership'])assert(isNotificationTarget({page:'social',gymId,gymTab}))
for(const value of [{page:'social',gymId:'bad',gymTab:'membership'},{page:'plans',gymId},{page:'social',gymTab:'membership'},{page:'social',gymId,gymTab:'settings'},{page:'social',gymId,postId:gymId}])assert.equal(isNotificationTarget(value),false)
assert(isNotificationTarget({page:'social',postId:gymId,kind:'forum'}));assert(isNotificationTarget({page:'plans',mode:'workout'}));assert(isNotificationTarget({page:'progress',tab:'achievements'}))
console.log('PASS gym notification targets/preferences, malformed target rejection and existing notification destination compatibility')
