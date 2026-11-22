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
const start=(await db.query(`select to_char((now() at time zone 'Asia/Manila')+interval '1 day','YYYY-MM-DD') d`)).rows[0].d
const doc={sessionKind:'event',title:'Community event',description:'Meet at reception',startsLocal:start+'T10:00',endsLocal:start+'T11:00',capacity:2,requestId:crypto.randomUUID()}
for(const uid of [member,staff,other])await assert.rejects(rpc(uid,12,'create_session',doc),/Only the gym admin/)
await assert.rejects(rpc(admin,12,'create_session',{...doc,sessionKind:'invalid'}),/Choose Event/)
await assert.rejects(rpc(admin,12,'create_session',{...doc,capacity:0}),/future start/)
await assert.rejects(rpc(admin,12,'create_session',{...doc,endsLocal:start+'T09:00'}),/future start/)
const created=await rpc(admin,12,'create_session',doc);assert.equal(created.sessions.find(s=>s.id===doc.requestId).session_kind,'event')
await rpc(admin,12,'create_session',doc);assert.equal((await db.query('select count(*)::int n from public.gym_sessions')).rows[0].n,1,'Retried creation must not duplicate an activity')
await assert.rejects(rpc(admin,12,'create_session',{...doc,sessionKind:'group_session'}),/already used/)
const group={...doc,sessionKind:'group_session',title:'Strength session',requestId:crypto.randomUUID()};await rpc(admin,12,'create_session',group)
const personal=await rpc(member,12,'mine');assert.equal(personal.sessions.find(s=>s.id===group.requestId).session_kind,'group_session');assert.equal(personal.sessions.find(s=>s.id===doc.requestId).session_kind,'event')
await assert.rejects(rpc(member,12,'admin_data'),/Only the gym admin/)
await rpc(member,10,'rsvp',{id:doc.requestId});assert.equal((await rpc(member,12,'mine')).sessions.find(s=>s.id===doc.requestId).joined,true)
await assert.rejects(rpc(member,10,'session_registrations',{id:doc.requestId}),/Only the gym admin/)
const roster=await rpc(admin,10,'session_registrations',{id:doc.requestId});assert.equal(roster.entries.length,1);assert.equal(roster.entries[0].user_id,member)
await rpc(member,10,'unrsvp',{id:doc.requestId});assert.equal((await rpc(admin,10,'session_registrations',{id:doc.requestId})).entries.length,0)
await assert.rejects(rpc(member,10,'cancel_session',{id:doc.requestId}))
await rpc(admin,10,'cancel_session',{id:doc.requestId});assert(!(await rpc(member,12,'mine')).sessions.some(s=>s.id===doc.requestId))
await db.exec(await readFile('backend/migrations/20261122_gym_groups_v12_session_types.sql','utf8'));assert.equal((await rpc(member,12,'mine')).sessions[0].session_kind,'group_session')
console.log('PASS session types: migrations apply/reapply, persisted types, owner-only creation and roster, membership reads, validation, idempotency, reservation/cancellation and participant privacy')
} finally { await db.close() }
