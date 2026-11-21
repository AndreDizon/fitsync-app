import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite()
const admin='11111111-1111-4111-8111-111111111111',staff='22222222-2222-4222-8222-222222222222'
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;`)
await db.query('insert into auth.users(id) values($1),($2)',[admin,staff])
for(const file of ['20261107_plan_playlists.sql','20261108_playlist_schedule.sql','20261121_gym_groups.sql','20261121_gym_groups_community.sql'])await db.exec(await readFile('backend/migrations/'+file,'utf8'))
// Existing gyms receive the explicit default without changing membership or sessions.
const call=async(user,action,doc={},version=3)=>db.transaction(async tx=>{
 await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user])
 return(await tx.query(`select public.gym_group_action_v${version}($1,$2::jsonb) as data`,[action,JSON.stringify(doc)])).rows[0].data
})
const created=await call(admin,'create',{name:'Manila crew'},2)
const migration=await readFile('backend/migrations/20261121_gym_groups_time_zone.sql','utf8')
await db.exec(migration);await db.exec(migration)
assert.equal((await call(admin,'mine')).gym.time_zone,'Asia/Manila')
await call(staff,'join',{code:created.gym.join_code});await call(admin,'role',{userId:staff,role:'staff'})
await assert.rejects(call(staff,'update',{name:'Hijack',description:'',timeZone:'UTC'}),/Only the gym admin/)
await assert.rejects(call(admin,'update',{name:'Bad zone',description:'',timeZone:'Not/AZone'}),/valid gym time zone/)
await assert.rejects(call(admin,'update',{name:'Bad zone',description:'',timeZone:'PST'}),/valid gym time zone/)
assert.equal((await call(admin,'mine')).gym.name,'Manila crew')
// Choose a future date so the scheduling test remains valid after the present day.
const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10)
const scheduled=await call(staff,'schedule',{title:'Gym morning',startsLocal:day+'T09:00',endsLocal:day+'T10:00',timeZone:'Asia/Manila',capacity:10})
const session=scheduled.sessions[0]
assert.equal(new Date(session.starts_at).toISOString(),day+'T01:00:00.000Z')
assert.equal(new Date(session.ends_at).toISOString(),day+'T02:00:00.000Z')
await call(admin,'update',{name:'Manila crew',description:'',timeZone:'America/New_York'})
assert.equal((await call(staff,'mine')).sessions[0].starts_at,session.starts_at,'Changing zone preserves UTC instants')
await assert.rejects(call(staff,'schedule',{title:'Stale zone',startsLocal:day+'T09:00',endsLocal:day+'T10:00',timeZone:'Asia/Manila',capacity:10}),/time zone changed/)
// Test conversion directly, independent of future-session limits and device settings.
const instant=async(local,zone)=>(await db.query('select public.gym_local_instant($1,$2) as value',[local,zone])).rows[0].value
assert.equal(new Date(await instant('2027-01-15T09:00','America/New_York')).toISOString(),'2027-01-15T14:00:00.000Z')
assert.equal(new Date(await instant('2027-07-15T09:00','America/New_York')).toISOString(),'2027-07-15T13:00:00.000Z')
assert.equal(new Date(await instant('2027-01-15T09:00','Asia/Kathmandu')).toISOString(),'2027-01-15T03:15:00.000Z')
await assert.rejects(instant('2027-03-14T02:30','America/New_York'),/does not exist/)
await assert.rejects(instant('2027-11-07T01:30','America/New_York'),/occurs twice/)
await assert.rejects(instant('2027-04-04T01:45','Australia/Lord_Howe'),/occurs twice/)
await assert.rejects(instant('2027-10-03T02:15','Australia/Lord_Howe'),/does not exist/)
await assert.rejects(instant('invalid','Asia/Manila'),/valid session/)
await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');return tx.query("select public.gym_local_instant('2027-01-15T09:00','UTC')")}),/permission denied/)
await assert.rejects(call('','mine'),/Authentication required/)
await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query("select public.gym_group_action_v3('mine','{}')")}),/permission denied/)
await call(admin,'disband')
const fresh=await call(admin,'create',{name:'UTC team',timeZone:'UTC'})
assert.equal(fresh.gym.time_zone,'UTC')
await db.exec(migration);assert.equal((await call(admin,'mine')).gym.time_zone,'UTC','Rerun preserves chosen zone')
await db.close()
console.log('PASS gym time zone migration/rerun, admin-only setting, server wall-clock conversion, fractional offsets, DST gaps/repeats, stale-zone rejection, preserved instants and RPC permissions')
