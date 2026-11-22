import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite()
try {
const [admin,staff,member,other]=[1,2,3,4].map(n=>`${n}1111111-1111-4111-8111-111111111111`)
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;`)
for(const id of [admin,staff,member,other])await db.query('insert into auth.users values($1,$2)',[id,JSON.stringify({username:'Member '+id[0],fitsync_onboarding:{}})])
for(const file of ['20261107_plan_playlists.sql','20261108_playlist_schedule.sql','20261121_gym_groups.sql','20261121_gym_groups_community.sql','20261121_gym_groups_time_zone.sql','20261121_gym_groups_v4.sql','20261121_gym_groups_v5_income.sql','20261121_gym_groups_v6_checkins.sql','20261121_gym_groups_v7_checkin_confirmation.sql','20261121_gym_groups_v8_history_filters.sql','20261121_gym_groups_v9_settings.sql','20261121_gym_groups_v10_admin_workspace.sql','20261121_gym_groups_v11_settings_cards.sql','20261122_gym_groups_v12_session_types.sql'])await db.exec(await readFile('backend/migrations/'+file,'utf8'))
const call=(uid,action,doc={})=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return(await tx.query('select public.gym_group_action_v8($1,$2::jsonb) value',[action,JSON.stringify(doc)])).rows[0].value})
const gym=await call(admin,'create',{name:'Attendance crew',timeZone:'Asia/Manila'})
await call(staff,'join',{gymId:gym.gym.id});await call(member,'join',{gymId:gym.gym.id});await call(admin,'role',{userId:staff,role:'staff'})

const rpc=(uid,version,action,doc={})=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return(await tx.query('select public.gym_group_action_v'+version+'($1,$2::jsonb) value',[action,JSON.stringify(doc)])).rows[0].value})

await db.exec(await readFile('backend/migrations/20261122_gym_groups_v13_staff_workspace.sql','utf8'))
const read=(uid)=>rpc(uid,12,'mine')
await assert.rejects(call(staff,'mine'),/permission denied/)
await assert.rejects(rpc(staff,'10_impl','mine'),/permission denied/)
for(const action of ['role','transfer','transfer_leave','remove','ban','unban','admin_data','admin_report','income','income_export','pay_member','record_payment','record_refund','void_income','confirm_checkin','attendance','mark_attendance','create_session','schedule','cancel_session','session_registrations','guidance','save_plan','archive_plan','delete_plan','edit_member_plan','cancel_period','admin_settings'])await assert.rejects(rpc(staff,10,action),/Only the gym admin/,action)
await assert.rejects(rpc(staff,11,'rename_gym',{name:'Wrong'}),/Only the gym admin/)
await assert.rejects(rpc(staff,12,'create_session',{}),/Only the gym admin/)
await rpc(admin,10,'save_plan',{name:'Monthly plan',description:'',durationDays:30,price:100,currency:'PHP'})
const plan=(await read(staff)).plans[0],today=(await db.query("select to_char(now() at time zone 'Asia/Manila','YYYY-MM-DD') d")).rows[0].d
await rpc(staff,10,'assign_plan',{userId:member,planId:plan.id,startsOn:today,endsOn:today,price:1,currency:'USD'})
const assigned=(await read(staff)).membershipPeriods[0];assert.equal(assigned.price,100);assert.equal(assigned.currency,'PHP')
await assert.rejects(rpc(staff,10,'assign_plan',{userId:member,planId:plan.id,startsOn:today,endsOn:today}),/overlap/)
const next=(await db.query("select to_char((now() at time zone 'Asia/Manila')+interval '1 day','YYYY-MM-DD') d")).rows[0].d
await rpc(staff,10,'assign_plan',{userId:member,planId:plan.id,startsOn:next,endsOn:next});assert.equal((await read(staff)).membershipPeriods.length,2)
await rpc(member,10,'check_in');assert.equal((await rpc(staff,10,'checkins')).total,0);await rpc(staff,10,'check_in');assert.equal((await rpc(staff,10,'checkins')).total,1);await assert.rejects(rpc(staff,10,'checkins',{scope:'gym'}),/Only the gym admin/)
const note={requestId:crypto.randomUUID(),title:'Gym update',body:'Please return equipment.',pinned:true}
await assert.rejects(rpc(member,13,'post_announcement',note),/Only gym staff/)
await rpc(staff,13,'post_announcement',note);await rpc(staff,13,'post_announcement',note);assert.equal((await read(member)).announcements.length,1)
await rpc(staff,10,'edit_announcement',{id:note.requestId,title:'Updated gym note',body:'Bring water.'});await rpc(staff,10,'pin',{id:note.requestId,pinned:false});assert.equal((await read(member)).announcements[0].pinned,false)
await rpc(staff,10,'delete_announcement',{id:note.requestId});assert.equal((await read(member)).announcements.length,0)
await rpc(member,10,'message',{body:'Test message'});const chat=await rpc(staff,10,'discussion');await rpc(staff,10,'delete_message',{id:chat.messages[0].id});assert.equal((await rpc(member,10,'discussion')).messages.length,0)
await rpc(admin,10,'admin_settings',{name:'Staff test gym',welcomeMessage:'Welcome',rules:'Respect others',joinMode:'approval',timeZone:'Asia/Manila'})
await rpc(other,10,'join',{gymId:gym.gym.id});assert.equal((await read(staff)).requests.length,1);await rpc(staff,10,'approve',{userId:other});await rpc(other,10,'leave');await rpc(other,10,'join',{gymId:gym.gym.id});await rpc(staff,10,'reject',{userId:other});assert.equal((await read(staff)).requests.length,0)
await db.exec(await readFile('backend/migrations/20261122_gym_groups_v13_staff_workspace.sql','utf8'));assert.equal((await read(staff)).role,'staff');assert.equal((await rpc(admin,10,'admin_data')).role,'admin')
console.log('PASS staff permissions: migration apply/reapply; legacy bypass closed; admin-only operations denied; own visits private; catalog prices immutable during assignment; renewals preserve coverage; join approval/decline; announcement posting/retry/edit/pin/delete and chat moderation; admin access preserved')
}finally{await db.close()}
