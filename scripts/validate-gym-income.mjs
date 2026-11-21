import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite()
const [admin,staff,member,outsider]=[1,2,3,4].map(n=>`${n}1111111-1111-4111-8111-111111111111`)
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;`)
for(const id of [admin,staff,member,outsider])await db.query('insert into auth.users values($1,$2)',[id,JSON.stringify({username:'User '+id[0],fitsync_onboarding:{}})])
for(const f of ['20261107_plan_playlists.sql','20261108_playlist_schedule.sql','20261121_gym_groups.sql','20261121_gym_groups_community.sql','20261121_gym_groups_time_zone.sql','20261121_gym_groups_v4.sql','20261121_gym_groups_v5_income.sql','20261121_gym_groups_v5_income.sql'])await db.exec(await readFile('backend/migrations/'+f,'utf8'))
const call=(user,action,doc={})=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);return(await tx.query('select public.gym_group_action_v5($1,$2::jsonb) as value',[action,JSON.stringify(doc)])).rows[0].value})
const gym=await call(admin,'create',{name:'Income crew',timeZone:'Asia/Manila'})
await call(staff,'join',{gymId:gym.gym.id});await call(member,'join',{gymId:gym.gym.id});await call(admin,'role',{userId:staff,role:'staff'})
await call(outsider,'create',{name:'Other gym'})
const today=(await db.query("select to_char(now() at time zone 'Asia/Manila','YYYY-MM-DD') d")).rows[0].d
const year=Number(today.slice(0,4)),month=Number(today.slice(5,7)),filters={year,month}
const yesterday=new Date(today+'T12:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1)
const earlier=yesterday.toISOString().slice(0,10)
let state=await call(admin,'save_plan',{name:'Monthly plan',durationDays:30,price:1000,currency:'PHP'})
const php=state.plans[0].id
state=await call(admin,'assign_plan',{userId:member,planId:php,startsOn:today,endsOn:today})
const period=state.membershipPeriods[0].id
assert.equal((await call(admin,'income',filters)).entries.length,0,'Plan assignment is not income')
for(const u of [staff,member,outsider]){
 if(u===outsider){assert.equal((await call(u,'income',filters)).entries.length,0);continue}
 for(const action of ['income','income_export','record_payment','record_refund','void_income'])await assert.rejects(call(u,action,{}),/Only the gym owner/)
}
await assert.rejects(call(admin,'record_payment',{periodId:period,amount:'-1'}),/amount/)
await assert.rejects(call(admin,'record_payment',{periodId:period,amount:'1.234'}),/amount/)
const payment={...filters,periodId:period,amount:'600.25',receivedOn:today,method:'cash',notes:'First installment',requestId:randomUUID()}
state=await call(admin,'record_payment',payment)
const id=state.entries[0].id
assert.equal(state.summary[0].received,'600.25');assert.equal(state.periods[0].outstanding,'399.75')
state=await call(admin,'record_payment',payment);assert.equal(state.total,1,'Identical request retries do not duplicate income')
await assert.rejects(call(admin,'record_payment',{...payment,amount:'600.24'}),/already used/)
await assert.rejects(call(admin,'record_payment',{...payment,requestId:randomUUID(),amount:'400'}),/exceeds/)
await assert.rejects(call(outsider,'record_payment',{...payment,requestId:randomUUID()}),/membership record from your gym/)
await assert.rejects(call(admin,'record_payment',{...payment,requestId:randomUUID(),receivedOn:'2100-01-01'}),/through today/)
const refund={...filters,paymentId:id,amount:'100.25',receivedOn:today,method:'ewallet',notes:'Partial refund',requestId:randomUUID()}
state=await call(admin,'record_refund',refund)
const refundId=state.entries.find(e=>e.kind==='refund').id
assert.equal(state.summary[0].received,'600.25');assert.equal(state.summary[0].refunds,'100.25');assert.equal(state.summary[0].net,'500.00')
assert.equal(state.periods[0].outstanding,'500.00')
assert.equal((await call(admin,'record_refund',refund)).total,2)
await assert.rejects(call(admin,'record_refund',{...refund,requestId:randomUUID(),amount:'600'}),/exceeds/)
await assert.rejects(call(admin,'record_refund',{...refund,requestId:randomUUID(),receivedOn:earlier}),/before its payment/)
await assert.rejects(call(outsider,'record_refund',{...refund,requestId:randomUUID()}),/payment from your gym/)
await assert.rejects(call(admin,'void_income',{id,reason:'Duplicate'}),/refund records first/)
state=await call(admin,'void_income',{...filters,id:refundId,reason:'Refund entered in error'})
assert.equal(state.summary[0].net,'600.25');assert(state.entries.find(e=>e.id===refundId).voided)
state=await call(admin,'void_income',{...filters,id,reason:'Payment entered in error'})
assert.equal(state.summary.length,0);assert.equal(state.total,2,'Voids remain in the ledger')
// Cash collection date chooses the month; currencies never combine.
state=await call(admin,'save_plan',{name:'Dollar membership',durationDays:30,price:20,currency:'USD'})
const usd=state.plans.find(p=>p.currency==='USD').id
state=await call(admin,'assign_plan',{userId:staff,planId:usd,startsOn:today,endsOn:today})
const usdPeriod=state.membershipPeriods.find(p=>p.user_id===staff).id
await call(admin,'record_payment',{...payment,requestId:randomUUID(),amount:'0.10'})
await call(admin,'record_payment',{...payment,requestId:randomUUID(),amount:'0.20'})
state=await call(admin,'record_payment',{...payment,requestId:randomUUID(),periodId:usdPeriod,amount:'10.00'})
assert.equal(state.summary.find(s=>s.currency==='PHP').net,'0.30','Decimal sums are exact')
assert.equal(state.summary.find(s=>s.currency==='USD').net,'10.00')
const previous=new Date(today+'T12:00:00Z');previous.setUTCDate(0);const previousDate=previous.toISOString().slice(0,10)
await call(admin,'record_payment',{...payment,requestId:randomUUID(),amount:'100',receivedOn:previousDate})
state=await call(admin,'income',{year:Number(previousDate.slice(0,4)),month:Number(previousDate.slice(5,7))})
assert.equal(state.total,1);assert.equal(state.entries[0].received_on,previousDate)
const previousPayment=state.entries[0].id
await call(admin,'record_refund',{...filters,paymentId:previousPayment,amount:'10',receivedOn:today,method:'cash',notes:'Refund of last month payment',requestId:randomUUID()})
state=await call(admin,'income',filters)
assert.equal(state.summary.find(s=>s.currency==='PHP'&&s.month===today.slice(0,7)).net,'-9.70','Refunds reduce the month refunded, even if payment was in a previous month')
assert.equal((await call(admin,'income_export',filters)).entries.length,(await call(admin,'income',filters)).total)
// Large monthly exports page all rows without truncating or changing snapshots.
await db.query(`insert into public.gym_income_entries(gym_id,request_id,period_id,member_id,plan_name,kind,amount,currency,received_on,method,recorded_by)
 select $1,gen_random_uuid(),$2,$3,'Monthly plan','payment',0.01,'PHP',$4,'cash',$5 from generate_series(1,501)`,[gym.gym.id,period,member,today,admin])
const exportA=await call(admin,'income_export',{...filters,page:0}),exportB=await call(admin,'income_export',{...filters,page:1})
assert.equal(exportA.entries.length,500);assert.equal(exportB.entries.length,exportA.total-500);assert.equal(exportA.snapshot,exportB.snapshot)
assert.equal(new Set([...exportA.entries,...exportB.entries].map(e=>e.id)).size,exportA.total)
await assert.rejects(call(admin,'income',{year:2026,month:13}),/valid income year/)
// Server-side owner boundary and direct table access remain enforced.
await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');return tx.query('select * from public.gym_income_entries')}),/permission denied/)
await assert.rejects(call('','income'),/Authentication required/)
await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query("select public.gym_group_action_v5('income','{}')")}),/permission denied/)
await call(admin,'transfer',{userId:staff})
await assert.rejects(call(admin,'income',filters),/Only the gym owner/)
assert((await call(staff,'income',filters)).entries.length>0)
// Reset/delete anonymizes the person, preserving accurate monthly money totals.
const before=(await call(staff,'income',filters)).summary
await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data-'fitsync_onboarding' where id=$1",[member])
state=await call(staff,'income',filters)
assert.deepEqual(state.summary,before)
assert(state.entries.filter(e=>e.currency==='PHP').every(e=>e.member_name==='Former member'&&e.notes===''))
await db.query('delete from auth.users where id=$1',[admin])
assert.deepEqual((await call(staff,'income',filters)).summary,before)
await call(staff,'disband')
assert.equal((await db.query('select count(*)::integer n from public.gym_income_entries')).rows[0].n,0)
await db.close()
console.log('PASS income migration/reruns, owner privacy, actual-payment totals, decimal/currency/month boundaries, installments/refunds/voids, retry deduplication, export, transfer, reset anonymization and gym deletion')
