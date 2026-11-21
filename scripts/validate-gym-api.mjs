import assert from 'node:assert/strict'
import {build} from 'esbuild'
const owner='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222'
let authFailure=false,rpcError=null,sourceError=null,source=null,last=null,filters=[]
globalThis.__gymAuth=async()=>authFailure?{response:Response.json({error:'Authentication required'},{status:401})}:{user:{id:owner},client:{rpc:async(name,args)=>{last={name,args};return{data:{gym:null,members:[]},error:rpcError}},from:()=>{const query={select:()=>query,eq:(...a)=>{filters.push(a);return query},maybeSingle:async()=>({data:source,error:sourceError})};return query}}}
const output=await build({entryPoints:['backend/app/api/gyms/route.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'auth',setup(b){b.onResolve({filter:/\/lib\/auth$/},()=>({path:'auth',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export const authenticate=(r)=>globalThis.__gymAuth(r)',loader:'js'}))}}]})
const route=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'))
const post=(action,doc)=>route.POST(new Request('http://localhost/api/gyms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,doc})}))
authFailure=true;assert.equal((await post('join',{})).status,401);authFailure=false
assert.equal((await post('update_settings',{name:'Gym',welcomeMessage:'Welcome',rules:'Rules'})).status,200);assert.equal(last.name,'gym_group_action_v10');assert.equal(last.args.doc.welcomeMessage,'Welcome')
assert.equal((await post('confirm_checkin',{})).status,200);assert.equal(last.name,'gym_group_action_v10');assert.equal(last.args.action,'confirm_checkin')
assert.equal((await post('check_in',{})).status,200);assert.equal(last.name,'gym_group_action_v10');assert.equal(last.args.action,'check_in')
await route.GET(new Request('http://localhost/api/gyms?action=checkins&scope=gym&page=2&from=2026-11-01&to=2026-11-21'));assert.equal(last.name,'gym_group_action_v10');assert.equal(last.args.action,'checkins');assert.equal(last.args.doc.scope,'gym');assert.equal(last.args.doc.page,'2');assert.equal(last.args.doc.from,'2026-11-01');assert.equal(last.args.doc.to,'2026-11-21')
for(const action of ['admin_settings','delete_plan','edit_member_plan','pay_member','post_announcement','post_event','check_out']){assert.equal((await post(action,{})).status,200);assert.equal(last.name,'gym_group_action_v10');assert.equal(last.args.action,action)}
await route.GET(new Request('http://localhost/api/gyms?action=admin_report&kind=visits&userId='+owner));assert.equal(last.args.doc.kind,'visits');assert.equal(last.args.doc.userId,owner);
for(const action of ['rename_gym','save_gym_guidance','transfer_leave']){assert.equal((await post(action,{})).status,200);assert.equal(last.name,'gym_group_action_v11');assert.equal(last.args.action,action)}
for(const [action,doc]of [['read_playlist',{}],['fake',{}],['join',[]],['join',null]])assert.equal((await post(action,doc)).status,400)
for(const action of ['approve','reject','transfer','ban','unban','schedule','announce','message','cancel_request','guidance','save_plan','archive_plan','assign_plan','cancel_period','mark_attendance','record_payment','record_refund','void_income']){
 assert.equal((await post(action,{})).status,200);assert.equal(last.name,'gym_group_action_v10');assert.equal(last.args.action,action)
}
await route.GET(new Request('http://localhost/api/gyms?action=read_playlist&id='+pid));assert.equal(last.args.action,'read_playlist');assert.equal(last.args.doc.id,pid)
await route.GET(new Request('http://localhost/api/gyms?action=discussion&page=2'));assert.equal(last.args.doc.page,'2')
await route.GET(new Request('http://localhost/api/gyms?action=notifications'));assert.equal(last.args.action,'notifications')
await route.GET(new Request('http://localhost/api/gyms?action=attendance&id='+pid));assert.equal(last.args.action,'attendance');assert.equal(last.args.doc.id,pid)
await route.GET(new Request('http://localhost/api/gyms?action=income&year=2026&month=11'));assert.equal(last.args.action,'income');assert.equal(last.args.doc.year,'2026');assert.equal(last.args.doc.month,'11');
await route.GET(new Request('http://localhost/api/gyms?action=income_export'));assert.equal(last.args.action,'income_export');
rpcError={code:'PGRST202',message:'Missing'};const missing=await route.GET(new Request('http://localhost/api/gyms'));assert.equal(missing.status,503);assert.match((await missing.json()).error,/v10/);rpcError=null
assert.equal((await post('share_playlist',{playlist:{name:'Forged'}})).status,400)
source=null;assert.equal((await post('share_playlist',{playlistId:pid})).status,400)
sourceError={code:'PRIVATE_DATA_UNAVAILABLE'};assert.equal((await post('share_playlist',{playlistId:pid})).status,503);sourceError=null
source={id:pid,kind:'workout',duration:'day',selected_day:3,rest_days:[],name:'My saved workout',description:'A template',user_id:owner,encrypted_data:'private',items:[{id:pid,exerciseId:'push-up',day:3,time:'08:00',sets:3,targetType:'reps',target:10,restSeconds:60,health:'hidden'}]}
filters=[];const shared=await post('share_playlist',{playlistId:pid,playlist:{name:'Forged'}});assert.equal(shared.status,200)
assert.deepEqual(filters,[['id',pid],['user_id',owner],['kind','workout']])
assert.equal(last.args.doc.playlist.name,'My saved workout');assert.equal(last.args.doc.playlist.items[0].day,3);assert.equal(last.args.doc.playlist.selectedDay,3)
assert(!('encrypted_data'in last.args.doc.playlist));assert(!('user_id'in last.args.doc.playlist));assert(!('health'in last.args.doc.playlist.items[0]))
assert.equal(shared.headers.get('cache-control'),'private, no-store')
console.log('PASS gym API authentication, action allowlists, schema setup errors, private no-store responses, owned-playlist selection/decryption boundary and sharing sanitization')
