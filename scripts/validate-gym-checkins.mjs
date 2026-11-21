import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite()
try {
const [admin,staff,member,other]=[1,2,3,4].map(n=>`${n}1111111-1111-4111-8111-111111111111`)
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;`)
for(const id of [admin,staff,member,other])await db.query('insert into auth.users values($1,$2)',[id,JSON.stringify({username:'Member '+id[0],fitsync_onboarding:{}})])
for(const file of ['20261107_plan_playlists.sql','20261108_playlist_schedule.sql','20261121_gym_groups.sql','20261121_gym_groups_community.sql','20261121_gym_groups_time_zone.sql','20261121_gym_groups_v4.sql','20261121_gym_groups_v5_income.sql','20261121_gym_groups_v6_checkins.sql','20261121_gym_groups_v7_checkin_confirmation.sql','20261121_gym_groups_v8_history_filters.sql','20261121_gym_groups_v9_settings.sql','20261121_gym_groups_v9_settings.sql'])await db.exec(await readFile('backend/migrations/'+file,'utf8'))
const call=(uid,action,doc={})=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return(await tx.query('select public.gym_group_action_v8($1,$2::jsonb) value',[action,JSON.stringify(doc)])).rows[0].value})
const gym=await call(admin,'create',{name:'Attendance crew',timeZone:'Asia/Manila'})
await call(staff,'join',{gymId:gym.gym.id});await call(member,'join',{gymId:gym.gym.id});await call(admin,'role',{userId:staff,role:'staff'})
const settings=(uid,doc)=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return(await tx.query('select public.gym_group_settings($1::jsonb) value',[JSON.stringify(doc)])).rows[0].value})
const config={name:'Updated gym',welcomeMessage:'Welcome team',rules:'Respect everyone',joinMode:'open',timeZone:'Asia/Manila'}
for(const uid of [staff,member])await assert.rejects(settings(uid,config),/Only the gym admin/)
const updated=await settings(admin,config);assert.equal(updated.gym.welcome_message,'Welcome team');assert.equal(updated.gym.rules,'Respect everyone');assert.equal(updated.gym.name,'Updated gym')
const notices=(await db.query('select count(*)::int n from public.gym_notifications')).rows[0].n
await assert.rejects(settings(admin,{...config,name:'x',welcomeMessage:'Should roll back',rules:'Do not save'}))
const unchanged=await call(admin,'mine');assert.equal(unchanged.gym.welcome_message,'Welcome team');assert.equal(unchanged.gym.rules,'Respect everyone');assert.equal((await db.query('select count(*)::int n from public.gym_notifications')).rows[0].n,notices,'Failed settings must not leave notifications')
assert.equal((await call(member,'checkins')).total,0)
const checked=await call(member,'check_in',{userId:admin,checkedOn:'2000-01-01',checkedAt:'2000-01-01',gymId:'00000000-0000-4000-8000-000000000000'})
const today=(await db.query("select to_char(now() at time zone 'Asia/Manila','YYYY-MM-DD') d")).rows[0].d
assert.equal(checked.today,today);assert.equal(checked.entries[0].user_id,member);assert.equal(checked.entries[0].checked_on,today)
assert.equal((await call(member,'check_in')).total,1,'Repeated/retried check-in must not duplicate a visit')
assert.equal((await call(member,'check_in')).checkedInAt,checked.checkedInAt,'Retry preserves original timestamp')
assert.equal((await call(staff,'checkins')).total,0,'Own history excludes other members')
await assert.rejects(call(staff,'checkins',{scope:'gym'}),/Only the gym admin/)
assert.equal((await call(admin,'checkins',{scope:'gym'})).total,1)
await assert.rejects(call(member,'checkins',{scope:'gym'}),/Only the gym admin/)
await assert.rejects(call(member,'check_in',{scope:'gym'}),/Only the gym admin/)
assert.equal(checked.entries[0].confirmed_at,null,'New check-ins await confirmation')
const confirmation={userId:member,checkedOn:today,scope:'gym'}
for(const uid of [staff,member])await assert.rejects(call(uid,'confirm_checkin',{...confirmation,scope:'mine'}),/Only the gym admin/)
const confirmed=await call(admin,'confirm_checkin',confirmation)
assert(confirmed.entries[0].confirmed_at);assert.equal(confirmed.entries[0].confirmed_by,admin);assert.equal(confirmed.pending,0)
assert.equal((await call(admin,'confirm_checkin',confirmation)).entries[0].confirmed_at,confirmed.entries[0].confirmed_at,'Confirmation retries keep the original audit timestamp')
assert((await call(member,'checkins')).checkedInConfirmedAt,'Members can see their own confirmed status')
await assert.rejects(call(admin,'confirm_checkin',{...confirmation,userId:other}),/not found/)
await assert.rejects(call(admin,'check_in'),/cannot check in/)
// The old entry point must inherit the stricter permissions, too.
await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[staff]);await tx.query("select public.gym_group_action_v6('checkins','{\"scope\":\"gym\"}'::jsonb)")}),/Only the gym admin/)
// Date filters must find records beyond the first unfiltered page.
await db.query("insert into public.gym_daily_checkins(gym_id,user_id,checked_on,checked_at,time_zone) select $1,$2,($3::date-n),now()-n*interval '1 day','Asia/Manila' from generate_series(1,25) n",[gym.gym.id,member,today])
const oldDay=(await db.query("select to_char($1::date-25,'YYYY-MM-DD') d",[today])).rows[0].d
const oldHistory=await call(member,'checkins',{from:oldDay,to:oldDay})
assert.equal(oldHistory.total,1);assert.equal(oldHistory.entries[0].checked_on,oldDay);assert(oldHistory.checkedInAt)
await assert.rejects(call(member,'checkins',{from:today,to:oldDay}),/From date/)
await assert.rejects(call(member,'checkins',{from:'not-a-date'}),/valid From/)
await db.query("insert into public.gym_sessions(gym_id,title,starts_at,ends_at,capacity) values($1,'Local midnight',($2::date+interval '16 hours') at time zone 'UTC',($2::date+interval '17 hours') at time zone 'UTC',10)",[gym.gym.id,oldDay])
const nextDay=(await db.query("select to_char($1::date+1,'YYYY-MM-DD') d",[oldDay])).rows[0].d
assert.equal((await call(member,'attendance',{from:oldDay,to:oldDay})).total,0)
assert.equal((await call(member,'attendance',{from:nextDay,to:nextDay})).total,1)
await db.query('delete from public.gym_daily_checkins where gym_id=$1 and checked_on<>$2::date',[gym.gym.id,today])
await assert.rejects(call(other,'check_in'),/Join a gym/)
await assert.rejects(call('', 'check_in'),/Authentication required/)
await assert.rejects(call(member,'checkins',{page:'-1'}),/Invalid history page/)
await assert.rejects(db.exec('set role authenticated;select * from public.gym_daily_checkins'),/permission denied/);await db.exec('reset role')
await call(other,'create',{name:'Different gym'})
assert.equal((await call(other,'checkins',{scope:'gym'})).total,0,'Other gyms cannot read these visits')
await assert.rejects(call(other,'confirm_checkin',confirmation),/not found/)
await call(member,'leave');await assert.rejects(call(member,'check_in'),/Join a gym/)
await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data-'fitsync_onboarding' where id=$1",[member])
assert.equal((await call(admin,'checkins',{scope:'gym'})).total,0,'Data reset removes check-ins')
await call(staff,'check_in');await db.query('delete from auth.users where id=$1',[staff]);assert.equal((await call(admin,'checkins',{scope:'gym'})).total,0,'Account deletion removes check-ins')
await assert.rejects(call(admin,'check_in'),/cannot check in/);await call(member,'join',{gymId:gym.gym.id});await call(member,'check_in');await call(admin,'transfer',{userId:member});await assert.rejects(call(admin,'checkins',{scope:'gym'}),/Only the gym admin/);await assert.rejects(call(admin,'confirm_checkin',{...confirmation,scope:'mine'}),/Only the gym admin/);await assert.rejects(call(member,'check_in'),/cannot check in/);await call(member,'disband');assert.equal((await db.query('select count(*)::int n from public.gym_daily_checkins')).rows[0].n,0)
console.log('PASS daily check-ins: rerunnable migration, server identity/date, retry deduplication, history privacy, admin-only review and idempotent confirmation, legacy RPC restrictions, RLS, leave/reset/delete cleanup')
}catch(e){console.error(e.message);process.exitCode=1}finally{await db.close()}
