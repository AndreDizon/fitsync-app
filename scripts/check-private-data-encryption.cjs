/* Offline encryption regression tests: no hosted services or credentials. */
const assert = require('node:assert/strict'), fs = require('node:fs'), {buildSync} = require('esbuild'), {PGlite} = require('@electric-sql/pglite')
const built = buildSync({entryPoints:['backend/lib/private-data.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text
const mod={exports:{}};new Function('require','module','exports',built)(require,mod,mod.exports)
const {seal,unseal,encryptRow,decryptRow,privateDataFetch,sealPhoto,openPhoto}=mod.exports
process.env.PRIVATE_DATA_ENCRYPTION_KEYS=JSON.stringify({v1:'01'.repeat(32),v2:'02'.repeat(32)})
process.env.PRIVATE_DATA_ENCRYPTION_ACTIVE_KEY='v1'
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003'
async function main(){
 const secret={notes:'Private journal',weightKg:73}, e=seal(secret,owner,'entry')
 assert.deepEqual(unseal(e,owner,'entry'),secret)
 assert.notEqual(seal(secret,owner,'entry').iv,e.iv)
 assert.throws(()=>unseal(e,other,'entry'));assert.throws(()=>unseal(e,owner,'other'))
 const changed={...e,tag:Buffer.alloc(16).toString('base64')};assert.throws(()=>unseal(changed,owner,'entry'))
 const jpeg=Buffer.from([255,216,255,10,20,30]),photo=sealPhoto(jpeg,owner,id)
 assert.deepEqual(openPhoto(photo,owner,id),jpeg);assert.deepEqual(openPhoto(jpeg,owner,id),jpeg)
 assert.throws(()=>openPhoto(photo,other,id));assert.throws(()=>openPhoto(photo,owner,'other'))
 const badPhoto=Buffer.from(photo);badPhoto[badPhoto.length-1]^=1;assert.throws(()=>openPhoto(badPhoto,owner,id))
 assert.throws(()=>openPhoto(Buffer.from('FSE1'),owner,id));assert.throws(()=>openPhoto(Buffer.from('not an image'),owner,id))
 process.env.PRIVATE_DATA_ENCRYPTION_ACTIVE_KEY='v2';assert.deepEqual(unseal(e,owner,'entry'),secret)
 const rows={progress_entries:{id,user_id:owner,kind:'body',date:'2026-11-19',revision:1,payload:secret},daily_plan_weeks:{user_id:owner,week_start:'2026-11-16',revision:1,document:{week:'2026-11-16',revision:1,days:[]}},plan_playlists:{id,user_id:owner,revision:1,kind:'workout',duration:'day',name:'Private routine',description:'My description',items:[{time:'08:00'}],selected_day:2,rest_days:[]}}
 for(const [table,row] of Object.entries(rows)){
  const encrypted=encryptRow(table,row,owner);assert.deepEqual(decryptRow(table,encrypted,owner),row)
  assert.throws(()=>decryptRow(table,{...encrypted,revision:2},owner));assert.throws(()=>decryptRow(table,encrypted,other))
  assert(!JSON.stringify(encrypted).includes(table==='progress_entries'?'Private journal':table==='plan_playlists'?'Private routine':'days'))
  assert.deepEqual(decryptRow(table,row,owner),row)
 }
 let sent
 const wrapped=privateDataFetch(owner,async(url,init)=>{sent={url:new URL(url),body:JSON.parse(init.body)};return Response.json(sent.body,{status:201})})
 const response=await wrapped('https://example.test/rest/v1/progress_entries?select=id,kind,payload',{method:'POST',body:JSON.stringify({...rows.progress_entries,revision:undefined})})
 assert.equal(response.status,201);assert.deepEqual((await response.json()).payload,secret)
 assert(sent.body.encrypted_data);assert.deepEqual(sent.body.payload,{})
 assert(sent.url.searchParams.get('select').includes('encrypted_data'))
 const {createClient}=require('@supabase/supabase-js')
 const client=createClient('https://example.test','test-public-key',{global:{fetch:privateDataFetch(owner,async(url,init)=>{
  const body=JSON.parse(init.body);assert(body.encrypted_data);return Response.json(body)
 })},auth:{persistSession:false,autoRefreshToken:false}})
 const patched=await client.from('daily_plan_weeks').update({document:rows.daily_plan_weeks.document,revision:2}).eq('user_id',owner).eq('week_start','2026-11-16').eq('revision',1).select('document,revision').maybeSingle()
 assert.equal(patched.error,null);assert.deepEqual(patched.data.document,rows.daily_plan_weeks.document)
 const broken=privateDataFetch(owner,async()=>Response.json({...encryptRow('progress_entries',rows.progress_entries,owner),revision:9}))
 assert.equal((await broken('https://example.test/rest/v1/progress_entries')).status,503)
 delete process.env.PRIVATE_DATA_ENCRYPTION_KEYS
 const missing=await wrapped('https://example.test/rest/v1/progress_entries',{method:'POST',body:JSON.stringify(rows.progress_entries)})
 assert.equal(missing.status,503)
 process.env.PRIVATE_DATA_ENCRYPTION_KEYS=JSON.stringify({v1:'01'.repeat(32),v2:'02'.repeat(32)})
 const db=new PGlite()
 await db.exec(`create role authenticated; create role anon; create schema auth; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,name text,bucket_id text);create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`)
 for(const file of ['20261107_plan_playlists.sql','20261108_playlist_schedule.sql','20261109_daily_plans.sql','20261110_progress.sql'])await db.exec(fs.readFileSync('backend/migrations/'+file,'utf8'))
 await db.exec(`insert into auth.users values('${owner}'),('${other}');insert into progress_entries(id,user_id,kind,date,payload) values('${id}','${owner}','body','2026-11-19','{"weightKg":73}');`)
 const migration=fs.readFileSync('backend/migrations/20261119_private_data_encryption.sql','utf8');await db.exec(migration);await db.exec(migration)
 const enc=encryptRow('progress_entries',{...rows.progress_entries,revision:2},owner)
 await db.query('update progress_entries set payload=$1,encrypted_data=$2,revision=2 where id=$3',[enc.payload,enc.encrypted_data,id])
 const actual=(await db.query('select * from progress_entries where id=$1',[id])).rows[0];assert.deepEqual(decryptRow('progress_entries',actual,owner).payload,secret)
 const playlist=encryptRow('plan_playlists',rows.plan_playlists,owner)
 await db.query('insert into plan_playlists(id,user_id,kind,duration,name,description,items,selected_day,rest_days,encrypted_data) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,owner,'workout','day',playlist.name,playlist.description,playlist.items,playlist.selected_day,playlist.rest_days,playlist.encrypted_data])
 const plan=encryptRow('daily_plan_weeks',rows.daily_plan_weeks,owner)
 await db.query('insert into daily_plan_weeks(user_id,week_start,document,encrypted_data) values($1,$2,$3,$4)',[owner,plan.week_start,plan.document,plan.encrypted_data])
 assert.deepEqual(decryptRow('daily_plan_weeks',(await db.query('select *,week_start::text as week_start from daily_plan_weeks')).rows[0],owner).document,rows.daily_plan_weeks.document)
 assert.equal(decryptRow('plan_playlists',(await db.query('select * from plan_playlists')).rows[0],owner).name,'Private routine')
 await assert.rejects(db.query('insert into progress_entries(user_id,kind,date,payload) values($1,\'body\',\'2026-11-19\',\'{"weightKg":75}\')',[owner]),/Encrypted private content required/)
 await db.exec(`grant usage on schema auth to authenticated;set role authenticated;set test.uid='${other}';`)
 assert.equal((await db.query('select * from progress_entries')).rows.length,0)
 assert.equal((await db.query('select * from plan_playlists')).rows.length,0)
 assert.equal((await db.query('select * from daily_plan_weeks')).rows.length,0)
 await db.close()
 console.log('PASS: record and photo encryption, random IVs, tampering, cross-user/record/revision rejection, rotation, missing-key failure, Supabase API adapter, all three tables, real migrations twice, legacy conversion and RLS.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
