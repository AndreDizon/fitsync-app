/* Isolated account-preview update checks. Never contacts a hosted account. */
const assert=require('node:assert/strict')
const {build}=require('esbuild')
;(async()=>{
  let tester=false,user={id:'owner',email_confirmed_at:'2026-01-01'},calls=[],fail=false,sessionFailure=false,revalidated=0
  global.__profileTest={
    currentTester:async()=>tester,
    saveTesterUsername:async name=>calls.push({tester:name}),
    authClient:async()=>({auth:{
      getUser:async()=>({data:{user},error:sessionFailure?new Error('expired'):null}),
      updateUser:async payload=>{calls.push(payload);if(fail)throw new Error('offline');return{error:null}},
    }}),
  }
  const result=await build({entryPoints:['frontend/app/auth/profile-actions.ts'],bundle:true,write:false,platform:'node',format:'cjs',external:['next/cache'],plugins:[{name:'mock-auth',setup(b){
    b.onResolve({filter:/lib\/auth\/(server|tester)$/},args=>({path:args.path,namespace:'mock'}))
    b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const {authClient,currentTester,saveTesterUsername}=globalThis.__profileTest;',loader:'js'}))
  }}]})
  const module={exports:{}}
  new Function('require','module','exports',result.outputFiles[0].text)(name=>{assert.equal(name,'next/cache');return{revalidatePath:()=>revalidated++}},module,module.exports)
  const update=module.exports.updateAccountUsername
  for(const value of ['', 'ab', 'bad space', '<script>', 'x'.repeat(31), {username:'valid',email:'override@example.com'}])assert((await update(value)).error)
  assert.equal(calls.length,0,'Invalid values make no writes')
  user=null;assert((await update('New_name')).error);assert.equal(calls.length,0)
  user={id:'owner',email_confirmed_at:null};assert((await update('New_name')).error);assert.equal(calls.length,0)
  user={id:'owner',email_confirmed_at:'confirmed'};sessionFailure=true;assert((await update('New_name')).error);assert.equal(calls.length,0);sessionFailure=false
  assert.deepEqual(await update('  New_name  '),{username:'New_name'})
  assert.deepEqual(calls,[{data:{username:'New_name',display_name:'New_name'}}],'Only username metadata is writable; no user ID, email, password or profile')
  assert.equal(revalidated,1)
  fail=true;assert((await update('Other_name')).error);assert.equal(revalidated,1)
  tester=true;fail=false;assert.deepEqual(await update('Tester_2'),{username:'Tester_2'});assert.deepEqual(calls.at(-1),{tester:'Tester_2'})
  delete global.__profileTest
  console.log('PASS username allowlist, verified-session checks, owner-only metadata update, failure handling and isolated local preview')
})().catch(error=>{console.error(error);process.exit(1)})
