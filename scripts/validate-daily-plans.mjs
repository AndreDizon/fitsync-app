import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { PGlite } from '@electric-sql/pglite'
const built = await build({ entryPoints: ['shared/daily-plans.ts'], bundle: true, write: false, platform: 'node', format: 'esm' })
const engine = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'))
const profile = { goal:'muscle_gain',adult:true,age:'28',ageRange:'25–34',gender:'Man',heightCm:'175',weightKg:'75',targetWeightKg:'80',focusAreas:['Overall'],activity:'Lightly active',experience:'Beginner',days:['Mon','Wed','Fri'],sessionMinutes:'30',equipment:['Bodyweight','Dumbbells'],adjustments:[],diet:'Vegan',allergiesReviewed:true,allergies:['Peanuts'],otherAllergy:'',dislikes:'',mealsPerDay:'3',cookingMinutes:'60',budget:'Flexible',version:2,completedAt:new Date().toISOString() }
const onboardingBuild = await build({ entryPoints: ['shared/onboarding.ts'], bundle: true, write: false, platform: 'node', format: 'esm' })
const onboarding = await import('data:text/javascript;base64,' + Buffer.from(onboardingBuild.outputFiles[0].text).toString('base64'))
assert(!onboarding.adjustmentOptions.includes('Need professional guidance'))
const existingProfile = onboarding.readCompletedOnboarding({...profile,adjustments:['Low impact / no jumping','Need professional guidance']})
assert(existingProfile, 'Existing profiles must remain valid after removing the option')
assert.deepEqual(existingProfile.adjustments,['Low impact / no jumping'])
const youngerProfile = onboarding.readCompletedOnboarding({...profile,age:'16',adult:false,timeZone:'America/Los_Angeles'})
assert(youngerProfile, 'Age below 18 must not block onboarding')
assert.equal(youngerProfile.ageRange,'Under 18')
assert.equal(youngerProfile.timeZone,'America/Los_Angeles')
assert(!onboarding.readCompletedOnboarding({...profile,timeZone:'Not/AZone'}))
assert.equal(existingProfile.timeZone,'Asia/Manila','Existing accounts retain their previous date behavior')
assert.equal(engine.currentWeek(new Date('2026-11-08T16:01:00Z'),'America/Los_Angeles'),'2026-11-02')
assert.equal(engine.currentWeek(new Date('2026-11-08T16:01:00Z'),'Asia/Manila'),'2026-11-09')
assert.equal(engine.currentDay(new Date('2026-11-08T16:01:00Z'),'America/Los_Angeles'),6)
assert.equal(engine.currentDay(new Date('2026-11-08T16:01:00Z'),'Asia/Manila'),0)
assert.equal(engine.planTargets(youngerProfile).energy,null)
const target = engine.planTargets(profile)
assert(target.energy > 2000 && target.energy < 3000);assert(target.energyRange[0] < target.energyRange[1]);assert.equal(engine.planTargets({...profile,weightKg:''}).energy,null)
assert.equal(engine.planTargets({...profile,heightCm:'bad'}).energy,null)
assert.equal(engine.currentWeek(new Date('2026-11-08T16:01:00Z')),'2026-11-09')
const workout = engine.formulateDay(profile,'workout',0,1).schedule
assert(workout.items.length > 0);assert(workout.items.every(item => !item.done && item.day===0));assert(workout.items.reduce((sum,item)=>sum+engine.taskMinutes(item),0)<=30)
assert(workout.items.every(item => engine.eligibleExercises(profile).some(exercise=>exercise.id===item.exerciseId)))
assert.equal(engine.formulateDay(profile,'workout',1,1).schedule.rest,true)
assert(engine.formulateDay(profile,'workout',1,1,[],true).schedule.items.length>0,'Manual/playlist task alternatives must work on a non-onboarding training day')
assert(engine.formulateDay({...profile,adjustments:['Need professional guidance']},'workout',0,1).schedule.items.length > 0, 'Retired preference must not block existing accounts')
assert.equal(engine.planTargets({...profile,adjustments:['Need professional guidance']}).energy,target.energy)
const nutrition = engine.formulateDay(profile,'nutrition',1,1).schedule
assert(nutrition.items.length>0);assert.equal(nutrition.rest,false)
assert(nutrition.items.every(item=>engine.foodCatalog.some(food=>food.id===item.foodId && food.vegan && !food.allergens.includes('Peanuts'))))
assert.deepEqual(engine.formulateDay({...profile,allergies:['Other'],otherAllergy:'Unknown'},'nutrition',0,1).schedule.items,[])
const totals=engine.foodTotals(nutrition.items);assert(totals.energy>0&&totals.protein>0)
assert.equal(engine.foodTotals(nutrition.items.filter(item=>item.done)).energy,0)
nutrition.items[0].done=true;assert(engine.foodTotals(nutrition.items.filter(item=>item.done)).energy>0)
const week=engine.blankWeek('2026-11-02');week.days[0].workout=workout;week.days[1].nutrition=nutrition
week.days[0].workout.items[0].actualSets=[{amount:8,weightKg:12.5},{amount:7,weightKg:12.5}]
assert.deepEqual(engine.parsePlanWeek(week).days[0].workout.items[0].actualSets,[{amount:8,weightKg:12.5},{amount:7,weightKg:12.5}])
const badLog=structuredClone(week);badLog.days[0].workout.items[0].actualSets[0].weightKg=-1;assert.equal(engine.parsePlanWeek(badLog),null)
assert(workout.items.reduce((sum,item)=>sum+engine.taskMinutes(item),0)+7+Math.max(0,workout.items.length-1)<=30,'Warmup/cooldown/transitions must fit the budget')
assert(engine.formulateDay(profile,'workout',0,1).notes.some(note=>note.includes('beginner')))
assert(engine.parsePlanWeek(week));const bad=structuredClone(week);bad.days[0].water[0].time='25:00';assert.equal(engine.parsePlanWeek(bad),null)
const invalid=structuredClone(week);invalid.days[0].workout.items[0].exerciseId='forged';assert.equal(engine.parsePlanWeek(invalid),null)
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',db=new PGlite()
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${owner}'),('${other}');`)
for(const migration of ['20261107_plan_playlists.sql','20261108_playlist_schedule.sql','20261109_daily_plans.sql']) await db.exec(await readFile('backend/migrations/'+migration,'utf8'))
await db.exec(await readFile('backend/migrations/20261109_daily_plans.sql','utf8'))
async function as(user,sql,args=[]){return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);return tx.query(sql,args)})}
week.revision=1
await as(owner,'insert into public.daily_plan_weeks(user_id,week_start,document) values($1,$2,$3::jsonb)',[owner,week.week,JSON.stringify(week)])
assert.equal((await as(other,'select * from public.daily_plan_weeks')).rows.length,0)
await assert.rejects(()=>as(other,'insert into public.daily_plan_weeks(user_id,week_start,document) values($1,$2,$3::jsonb)',[owner,week.week,JSON.stringify(week)]))
await assert.rejects(()=>as(owner,'update public.daily_plan_weeks set revision=3 where user_id=$1',[owner]))
const badDb=structuredClone(week);badDb.days[1].nutrition.rest=true;badDb.revision=2
await assert.rejects(()=>as(owner,'update public.daily_plan_weeks set revision=2,document=$1::jsonb where user_id=$2',[JSON.stringify(badDb),owner]))
week.revision=2;week.days[0].water[0].done=true
await as(owner,'update public.daily_plan_weeks set revision=2,document=$1::jsonb where user_id=$2 and revision=1',[JSON.stringify(week),owner])
assert.equal((await as(owner,'update public.daily_plan_weeks set revision=3 where user_id=$1 and revision=1 returning *',[owner])).rows.length,0)
await db.query('delete from auth.users where id=$1',[owner]);assert.equal((await db.query('select * from public.daily_plan_weeks')).rows.length,0)
await db.close();console.log('PASS: biometric targets, missing-input handling, equipment/diet/allergen constraints, rest days, task totals, plan parsing, actual PostgreSQL migrations/RLS/revisions/validation/cascade.')
