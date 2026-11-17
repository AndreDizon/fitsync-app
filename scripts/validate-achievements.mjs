import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const result=await build({entryPoints:['shared/progress.ts'],bundle:true,write:false,format:'esm',platform:'node'})
const {milestones,achievementStats}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))
assert.equal(milestones.length,30);assert.equal(new Set(milestones.map(x=>x.code)).size,30)
for(const category of ['consistency','tasks','training','nutrition','journal'])assert.equal(milestones.filter(x=>x.category===category).length,6)
const entries=[{kind:'body',date:'2026-11-17',payload:{weightKg:75}},{kind:'wellness',date:'2026-11-17',payload:{energy:3}},{kind:'photo',date:'2026-11-16',payload:{path:'x'}},{kind:'body',date:'2099-01-01',payload:{weightKg:75}},{kind:'body',date:'2026-11-15',payload:{notes:'Only notes'}}]
const stats=achievementStats([],['2026-11-16','2026-11-17','2026-11-17'],'2026-11-17',entries)
assert.equal(stats.journalDays,1);assert.equal(stats.visits,2);assert.equal(stats.foods,0)
const db=new PGlite();await db.exec("create table public.progress_awards(code text constraint progress_awards_code_check check(code in ('hello')));insert into public.progress_awards values('hello')")
await db.exec(await readFile('backend/migrations/20261117_progress_achievements.sql','utf8'))
for(const badge of milestones)await db.query('insert into progress_awards values($1)',[badge.code])
await assert.rejects(()=>db.query("insert into progress_awards values('invented')"))
assert.equal((await db.query('select * from progress_awards')).rows.length,31)
await db.exec("create role authenticated;create role anon;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;alter table public.progress_awards add column user_id uuid;alter table public.progress_awards add column awarded_at timestamptz default now();truncate public.progress_awards;")
await db.exec(await readFile('backend/migrations/20261118_achievement_claims.sql','utf8'))
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222'
await db.query("insert into progress_awards(code,user_id)values('hello',$1),('streak3',$2)",[owner,other])
await db.exec("set role authenticated;")
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner])
const first=(await db.query("select * from public.claim_progress_award('hello')")).rows[0];assert(first.claimed_at)
assert.equal((await db.query("select * from public.claim_progress_award('hello')")).rows[0].claimed_at.toISOString(),first.claimed_at.toISOString(),'Repeat claims preserve first claim time')
assert.equal((await db.query("select * from public.claim_progress_award('streak3')")).rows.length,0,'Cannot claim another account award')
assert.equal((await db.query("select * from public.claim_progress_award('todo500')")).rows.length,0,'Cannot claim locked award')
await db.exec("reset role;set role anon;")
await assert.rejects(()=>db.query("select * from public.claim_progress_award('hello')"))
await db.exec("reset role;")
await db.close()
console.log('PASS 30 unique achievements, six per category, distinct journal dates, future/photo exclusion, migration preserves existing awards and accepts every code; claims persist, are idempotent, reject locked/other-account awards and anonymous callers')