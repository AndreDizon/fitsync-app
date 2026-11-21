import assert from 'node:assert/strict'
import { build } from 'esbuild'
async function load(entry) {
  const compiled = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node' })
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
}
const { youthEnergyRange } = await load('shared/youth-energy.ts')
const { planTargets, formulateDay } = await load('shared/daily-plans.ts')
const { emptyOnboarding } = await load('shared/onboarding.ts')
const teen = { ...emptyOnboarding, age: '16', heightCm: '165', weightKg: '60', youthActivity: 'Low active', goal: 'general_fitness', gender: 'Prefer not to say', activity: 'Mostly seated', experience: 'Beginner', days: ['Mon','Wed','Fri'], sessionMinutes: '30', diet: 'No preference', allergiesReviewed: true, mealsPerDay: '3', cookingMinutes: '60', budget: 'Flexible', targetWeightKg: '60', version: 2, completedAt: new Date().toISOString() }
// Independently calculated from DRI 2023 Table 5-15, including growth.
for (const [youthActivity, expected] of [
  ['Inactive', [2135, 2567]], ['Low active', [2357, 2737]],
  ['Active', [2512, 3007]], ['Very active', [2816, 3340]],
]) assert.deepEqual(youthEnergyRange({ ...teen, youthActivity }), expected)
assert.deepEqual(youthEnergyRange({ ...teen, age: '13', heightCm: '150', weightKg: '50', youthActivity: 'Inactive' }), [1914, 2234])
assert.deepEqual(youthEnergyRange({ ...teen, age: '14', heightCm: '150', weightKg: '50', youthActivity: 'Inactive' }), [1882, 2233])
for (const age of ['12','18','16.5','']) assert.equal(youthEnergyRange({ ...teen, age }), null)
for (const change of [{heightCm:''},{weightKg:'NaN'},{youthActivity:undefined},{youthActivity:'unknown'},{weightKg:'350',heightCm:'250'}]) assert.equal(youthEnergyRange({ ...teen, ...change }), null)
const targets = planTargets(teen)
assert.equal(targets.energy, 2547)
assert.deepEqual(targets.energyRange, [2357,2737])
assert.equal(targets.protein, Math.round(2547 * .2 / 4))
assert.equal(targets.carbs, Math.round(2547 * .5 / 4))
assert.equal(targets.fat, Math.round(2547 * .3 / 9))
for (const goal of ['fat_loss','muscle_gain','strength']) assert.equal(planTargets({...teen,goal,targetWeightKg:'45'}).energy, targets.energy, 'No teen calorie restriction/surplus from goal or target weight')
for (const gender of ['Man','Woman','Non-binary']) assert.deepEqual(planTargets({...teen,gender}).energyRange, targets.energyRange, 'Do not infer equation sex from gender')
assert.equal(planTargets(teen,true).energy,targets.energy,'Growth-energy needs persist on rest days')
assert.equal(planTargets({...teen,youthActivity:''}).energy,null,'No silent activity default for existing profiles')
assert(formulateDay(teen,'nutrition',0,1).schedule.items.length>0,'Teen meal generation uses the EER reference')
assert.equal(planTargets({...teen,age:'18'}).energyRange.length,2,'Adults retain their existing method')
console.log('PASS DRI coefficient fixtures, growth-age boundaries, missing inputs, range guards, teen goal/sex independence, rest days, macros and meal generation')
