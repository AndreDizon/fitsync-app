// Editorial movement-family guidance. The four catalog instructions retain
// equipment/variation-specific technique; these notes explain intent and scaling.
export const techniqueSources = {
  chest: { label: 'ACE: chest press technique', url: 'https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/' },
  pushup: { label: 'ACE: push-up technique', url: 'https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/' },
  row: { label: 'ACE: bent-over row technique', url: 'https://www.acefitness.org/resources/everyone/exercise-library/12/bent-over-row/' },
  squat: { label: 'ACE: squat technique', url: 'https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/' },
  hinge: { label: 'ACSM: deadlift variations', url: 'https://doi.org/10.1249/FIT.0000000000000570' },
  core: { label: 'NASM: core functions and exercise selection', url: 'https://www.nasm.org/resource-center/blog/training/best-abs-exercises' },
  deadbug: { label: 'NASM: dead bug technique', url: 'https://www.nasm.org/resource-center/exercise-library/dead-bug' },
  library: { label: 'ACE: related exercise techniques', url: 'https://www.acefitness.org/resources/everyone/exercise-library/' },
  flexibility: { label: 'AHA: stretching guidance', url: 'https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/flexibility-exercise-stretching' },
  cardio: { label: 'CDC: exercise intensity', url: 'https://www.cdc.gov/physical-activity-basics/measuring/index.html' },
  power: { label: 'HSS: getting started with plyometrics', url: 'https://www.hss.edu/health-library/move-better/plyometrics-workouts-for-beginner' },
} as const

type Technique = {
  label: string; purpose: string; checks: [string, string]; easier: string; harder: string;
  source: keyof typeof techniqueSources; compound?: boolean; counting?: string;
}
const families: Array<Technique & { ids: string[] }> = []
function family(ids: string, details: Technique) { families.push({ ...details, ids: ids.split(' ') }) }

family('barbell-bench-press barbell-incline-bench-press dumbbell-bench-press dumbbell-incline-bench-press lever-chest-press dumbbell-decline-bench-press smith-bench-press band-bench-press barbell-close-grip-bench-press', {
  label: 'Chest press', compound: true, source: 'chest',
  purpose: 'A multi-joint press: the upper arms move away from the torso while the elbows straighten. Chest, shoulders and triceps share the work.',
  checks: ['If your shoulders roll forward or the weights drop abruptly, reduce the load and regain a controlled lowering phase.', 'Keep wrists supported above your forearms; do not bounce the resistance off your chest. Use appropriate safeties or spotting for barbell work.'],
  easier: 'Practise the pressing path with lighter resistance or a supported chest-press machine.',
  harder: 'Build controlled repetitions first, then add a small amount of resistance without losing your support points.',
})
family('push-up incline-push-up decline-push-up kneeling-push-up-male diamond-push-up', {
  label: 'Bodyweight press', compound: true, source: 'pushup',
  purpose: 'Press the body away from the support while holding the trunk steady. Hand position and body angle change the challenge.',
  checks: ['If the hips sag or rise first, shorten the set or choose a higher hand support.', 'Lower your torso as a unit. Avoid reaching the chin forward to create the appearance of a deeper repetition.'],
  easier: 'Use a wall or a stable raised surface for the hands; choose a height where your body stays aligned.',
  harder: 'Lower the hand support gradually, or progress to a harder body angle after steady full repetitions.',
})
family('dumbbell-fly cable-standing-fly lever-seated-fly', {
  label: 'Chest fly', source: 'library',
  purpose: 'Bring the upper arms toward the midline with a fairly constant elbow bend. This is a chest-focused arc, not a bent-elbow press.',
  checks: ['If you have to bend the elbows substantially to finish, use lighter resistance.', 'Stop the opening phase before shoulder strain; a deeper stretch is not automatically a better repetition.'],
  easier: 'Use lighter resistance and a smaller comfortable arc.', harder: 'Increase controlled repetitions before adding resistance; preserve the same elbow angle.',
})
family('cable-pulldown cable-underhand-pulldown pull-up chin-up pull-up-neutral-grip', {
  label: 'Vertical pull', compound: true, source: 'library',
  purpose: 'Pull the upper arms down toward the sides. The back and elbow flexors work together while the torso stays controlled.',
  checks: ['Avoid swinging or throwing the head forward to finish the pull.', 'Use a comfortable shoulder path; pulldown handles travel in front of the body rather than behind the neck.'],
  easier: 'Use a controllable pulldown load or an assisted pull-up setup.', harder: 'Reduce assistance gradually or add load after consistent controlled repetitions.',
})
family('cable-seated-row barbell-bent-over-row dumbbell-bent-over-row dumbbell-incline-row lever-seated-row inverted-row inverted-row-bent-knees band-one-arm-standing-low-row cable-rear-delt-row-with-rope', {
  label: 'Row', compound: true, source: 'row',
  purpose: 'Draw the upper arms backward with elbow bending. A stable torso lets the back and shoulders do the pulling instead of body momentum.',
  checks: ['If you rock the torso to move the resistance, lighten it or add chest support.', 'Keep the neck in line with your torso; avoid craning the head up as the elbows move back.'],
  easier: 'Choose a lighter cable/band or a supported row. A more upright body angle makes inverted rows easier.',
  harder: 'Increase resistance or use a more demanding body angle while keeping the torso steady.',
})
family('cable-straight-arm-pulldown', {
  label: 'Straight-arm shoulder pull', source: 'library', purpose: 'Move the upper arms toward the torso with only a small, steady elbow bend. This emphasizes shoulder movement rather than an elbow curl.',
  checks: ['If the elbows repeatedly bend and straighten, lighten the cable and hold their angle steady.', 'Keep the ribs from flaring as the hands return overhead.'],
  easier: 'Use lighter resistance and a shorter comfortable overhead range.', harder: 'Add resistance only while preserving the same torso and elbow positions.',
})
family('barbell-shrug', {
  label: 'Shoulder elevation', source: 'library', purpose: 'Lift and lower the shoulder blades under control to train the upper trapezius; the arms mainly hold the resistance.',
  checks: ['Move the shoulders upward and down rather than rolling them in circles.', 'Keep the elbows long and neck comfortable; do not turn the movement into an arm pull.'],
  easier: 'Reduce the load until you can pause briefly without neck strain.', harder: 'Increase resistance gradually without shortening the controlled shoulder motion.',
})
family('barbell-high-bar-squat dumbbell-goblet-squat', {
  label: 'Squat', compound: true, source: 'squat', purpose: 'Bend and straighten the hips and knees together with both feet supported. The thighs and hips provide the main lower-body effort.',
  checks: ['If the heels lift or balance shifts abruptly, reduce depth or load and establish a stable whole-foot stance.', 'Let the knees follow the direction of the toes; choose depth you can control without pain.'],
  easier: 'Practise an unloaded squat to a stable bench or box.', harder: 'Increase comfortable range or resistance one at a time while keeping the same balance.',
})
family('sled-45-leg-press', {
  label: 'Supported leg press', compound: true, source: 'library', purpose: 'Extend the hips and knees against a sled while the seat supports the torso. Seat position and depth determine the usable range.',
  checks: ['Stop lowering before the pelvis rolls away from the backrest.', 'Keep the feet planted and avoid snapping the knees straight or releasing the safety stops before you are ready.'],
  easier: 'Use less sled resistance and a shallower controlled range with the machine adjusted to you.', harder: 'Increase resistance gradually while preserving seat contact and controlled depth.',
})
family('dumbbell-lunge dumbbell-rear-lunge dumbbell-single-leg-split-squat dumbbell-step-up', {
  label: 'Single-leg emphasis', compound: true, source: 'squat', purpose: 'Load one leg more than the other while managing balance. The exact stepping or split stance is shown in this exercise’s instructions.',
  checks: ['If balance controls the movement more than leg effort, use light hand support and reduce the load.', 'Keep the working foot secure and knee tracking with the toes; do not rush a step or drop from a platform.'],
  easier: 'Practise without dumbbells, use support or a lower step, and find a stable range.', harder: 'Add resistance after both sides can complete the same controlled movement.',
})
family('barbell-romanian-deadlift barbell-deadlift', {
  label: 'Hip hinge', compound: true, source: 'hinge', purpose: 'Use the hips to move the load while the trunk stays braced. A Romanian deadlift begins from standing; a conventional deadlift resets from the floor.',
  checks: ['Keep the load close instead of reaching it away from the legs.', 'Stop the lowering range before your back position changes. Do not lean backward to finish the lift.'],
  easier: 'Rehearse the hinge without load and use a light, controllable variation.', harder: 'Increase resistance after the same bar path and trunk position stay consistent across the set.',
})
family('barbell-glute-bridge', {
  label: 'Hip extension bridge', source: 'library', purpose: 'Extend the hips from the floor while the upper back and feet support the body. Finish by bringing the hips in line with the torso.',
  checks: ['Avoid substituting a large lower-back arch for hip extension.', 'Keep the bar padded and stable across the hips; do not let it roll toward the abdomen.'],
  easier: 'Use a bodyweight bridge and find steady foot placement.', harder: 'Add resistance after a level pelvis and controlled lowering are repeatable.',
})
family('lever-leg-extension', {
  label: 'Knee extension', source: 'library', purpose: 'Straighten the knee against a pad to focus on the quadriceps. The machine pivot should line up with the knee.',
  checks: ['Do not kick the pad or let the stack crash on the return.', 'Keep the thighs and hips supported rather than lifting off the seat to finish.'],
  easier: 'Reduce the stack load and use a comfortable controlled range.', harder: 'Increase resistance while keeping the same seat contact and knee motion.',
})
family('lever-lying-leg-curl lever-seated-leg-curl', {
  label: 'Knee flexion', source: 'library', purpose: 'Bend the knee against resistance to train the hamstrings. Match the seat, support and roller positions to your leg length.',
  checks: ['Keep the hips against the support instead of arching or lifting to move the pad.', 'Lower the stack slowly; avoid bouncing out of the straight-leg position.'],
  easier: 'Use a lighter stack and a comfortable knee range.', harder: 'Add resistance once the return stays controlled without shifting the hips.',
})
family('lever-standing-calf-raise lever-seated-calf-raise bodyweight-standing-calf-raise', {
  label: 'Calf raise', source: 'library', purpose: 'Lift and lower the heel through ankle motion. A bent-knee seated variation changes the emphasis within the calf muscles.',
  checks: ['Keep the ankle from rolling outward as the heel rises.', 'Avoid bouncing at the bottom; use a range you can reverse smoothly.'],
  easier: 'Use stable hand support and less resistance.', harder: 'Increase resistance or controlled range without using a rebound.',
})
family('lever-seated-hip-abduction lever-seated-hip-adduction', {
  label: 'Hip abduction / adduction', source: 'library', purpose: 'Move the thighs apart for abduction or together for adduction. The pelvis stays supported while the hips provide the motion.',
  checks: ['Avoid rocking the torso or lifting the pelvis to move the pads.', 'Start within a comfortable hip range and do not let the machine force a wider position.'],
  easier: 'Reduce resistance and the starting range.', harder: 'Add resistance gradually without changing your seated posture.',
})
family('barbell-seated-overhead-press dumbbell-seated-shoulder-press lever-shoulder-press dumbbell-standing-overhead-press dumbbell-arnold-press', {
  label: 'Overhead press', compound: true, source: 'library', purpose: 'Raise the upper arms while straightening the elbows to press overhead. The shoulders and triceps share the work.',
  checks: ['If the ribs flare and back arches to finish, reduce the load or overhead range.', 'Keep wrists and forearms supporting the load; use a shoulder path that feels comfortable.'],
  easier: 'Try lighter resistance or a supported machine, using a comfortable range.', harder: 'Add resistance only while keeping the same trunk position and controlled lowering.',
})
family('dumbbell-lateral-raise cable-lateral-raise dumbbell-front-raise lever-lateral-raise', {
  label: 'Shoulder raise', source: 'library', purpose: 'Raise the upper arms in the direction shown for this variation, using shoulder motion rather than a body swing.',
  checks: ['If you need to swing the torso, choose a lighter load.', 'Use a comfortable arm path; do not chase height by shrugging forcefully or straining the shoulder.'],
  easier: 'Reduce resistance and raise only through a controlled comfortable arc.', harder: 'Add repetitions or a small load increase without introducing momentum.',
})
family('dumbbell-rear-fly cable-standing-cross-over-high-reverse-fly', {
  label: 'Reverse fly', source: 'row', purpose: 'Open the upper arms away from the midline to emphasize the rear shoulders and upper back. Keep the elbow bend fairly constant.',
  checks: ['Do not turn the movement into a heavy bent-elbow row.', 'Keep the torso stable and avoid jerking the head upward as the arms open.'],
  easier: 'Use lighter resistance or chest support.', harder: 'Increase resistance gradually while maintaining the same arm arc and torso position.',
})
family('cable-standing-shoulder-external-rotation', {
  label: 'Shoulder external rotation', source: 'library', purpose: 'Rotate the upper arm outward while the elbow stays near the side. Small, controlled rotation matters more than a large cable load.',
  checks: ['If the elbow drifts away from the side, reduce resistance and reset.', 'Avoid twisting the whole torso to create extra cable travel.'],
  easier: 'Use a very light resistance and a small comfortable range.', harder: 'Progress cautiously without changing elbow position; this is not a maximal-strength lift.',
})
family('barbell-curl dumbbell-biceps-curl dumbbell-hammer-curl cable-curl dumbbell-preacher-curl dumbbell-incline-biceps-curl dumbbell-concentration-curl ez-barbell-curl barbell-reverse-curl', {
  label: 'Elbow curl', source: 'library', purpose: 'Bend the elbow while keeping the upper arm relatively still. Grip and shoulder position distinguish the curl variations.',
  checks: ['If the shoulders swing or hips thrust to lift the load, lighten it.', 'Keep wrists comfortable and control the return rather than dropping into elbow extension.'],
  easier: 'Use lighter resistance or a supported upper-arm position.', harder: 'Add repetitions or resistance while maintaining the same elbow path.',
})
family('cable-pushdown-with-rope-attachment cable-overhead-triceps-extension-rope-attachment dumbbell-lying-triceps-extension dumbbell-kickback cable-one-arm-tricep-pushdown dumbbells-seated-triceps-extension', {
  label: 'Elbow extension', source: 'library', purpose: 'Straighten the elbow against resistance to emphasize the triceps. Keep the upper-arm position appropriate to the overhead, lying or pushdown variation.',
  checks: ['If the shoulders move more than the elbows, reduce load and stabilize the upper arms.', 'Do not snap the elbows straight or let an overhead weight pull you beyond a comfortable shoulder range.'],
  easier: 'Use lighter resistance and a position where you can keep the upper arms steady.', harder: 'Increase resistance only while the same elbow motion stays controlled.',
})
family('dead-bug', {
  label: 'Anti-extension core control', source: 'deadbug', purpose: 'Move opposite limbs while resisting an increase in the lower-back arch. The aim is trunk control, not reaching the floor at any cost.',
  checks: ['If the back arches as the leg lowers, shorten the reach.', 'Move slowly enough to keep breathing; avoid holding your breath to force a longer reach.'],
  easier: 'Keep the arms still and practise small alternating heel reaches.', harder: 'Lengthen the opposite arm-and-leg reach only while your trunk remains steady.', counting: 'The catalog target is per side. One controlled reach and return on that side is one repetition.',
})
family('band-horizontal-pallof-press', {
  label: 'Anti-rotation core control', source: 'core', purpose: 'Hold the shoulders and pelvis facing forward as a band pulls from the side. The outward press makes resisting rotation more demanding.',
  checks: ['If your torso turns toward the anchor, step closer or use a lighter band.', 'Avoid leaning away from the anchor; keep pressure through both feet and breathe as you press.'],
  easier: 'Use less band tension and keep the hands closer to the chest.', harder: 'Extend the arms farther or add a little tension after you can hold your body still.', counting: 'Complete the prescribed repetitions facing each direction. A press out and return is one repetition for that side.',
})
family('reverse-crunch crunch-floor hanging-leg-raise', {
  label: 'Controlled trunk / pelvic flexion', source: 'core', purpose: 'Use controlled trunk or pelvic motion rather than momentum. The floor crunch, reverse crunch and hanging leg raise require different support positions.',
  checks: ['If you swing the legs or pull on the neck, reduce the range and slow down.', 'Finish the set when you cannot control the return; more height is not the goal.'],
  easier: 'Use a supported floor variation with a smaller range; bend the knees for a shorter lever.', harder: 'Increase controlled range before adding load or a longer leg lever.',
})
family('side-bridge-v-2', {
  label: 'Side-support core control', source: 'core', purpose: 'Support the body on one side while resisting sideways collapse at the waist. The shoulder, trunk and hips share the hold.',
  checks: ['If the hips sink or roll, shorten the hold and reset.', 'Keep the supporting elbow under the shoulder rather than reaching it far away.'],
  easier: 'Use a bent-knee side support and shorter holds.', harder: 'Progress toward straight legs only after you can hold a steady line while breathing.', counting: 'Hold for the planned seconds on each side; seconds are not repetitions.',
})
family('shoulder-tap weighted-front-plank', {
  label: 'Plank stability', source: 'core', purpose: 'Maintain a supported trunk position while a hand lift or added load challenges stability. The goal is to limit sagging and rotation.',
  checks: ['If the pelvis twists or the lower back sags, reduce the challenge and reset.', 'Keep breathing. A shorter steady hold or slower tap is preferable to continuing after position is lost.'],
  easier: 'Use an unloaded plank, higher hand support or a wider foot stance for taps.', harder: 'Add a controlled hand lift or small load only after an unloaded plank is steady. Weighted planks need help placing and removing the plate.',
})
family('russian-twist', {
  label: 'Controlled trunk rotation', source: 'core', purpose: 'Practise a small controlled rotational movement from a supported seated position. It differs from anti-rotation work, where the trunk stays still.',
  checks: ['Avoid rapidly throwing the arms or bouncing a weight side to side.', 'Keep the feet supported and reduce the rotation if you cannot control your back position.'],
  easier: 'Keep the feet on the floor and use no added weight.', harder: 'Increase control and comfortable range before adding a small load; do not chase speed.',
})
family('mountain-climber jack-jump-male jump-rope stationary-bike-walk walk-elliptical-cross-trainer walking-on-incline-treadmill', {
  label: 'Aerobic conditioning', source: 'cardio', purpose: 'Sustain repeated movement to train aerobic fitness. Pace, impact and support differ between floor drills, jumping and exercise machines.',
  checks: ['If breathing is too hard to maintain the intended effort, slow down or take an easier interval.', 'Keep movements controlled as fatigue builds; reduce impact or resistance instead of losing balance.'],
  easier: 'Use a slower pace, lower resistance or a lower-impact variation.', harder: 'Increase duration or intensity one at a time, rather than changing both together.',
})
family('jump-squat burpee', {
  label: 'Power / impact conditioning', source: 'power', purpose: 'Combine rapid movement with controlled deceleration. Landing and support quality determine whether another repetition is appropriate.',
  checks: ['If landings become loud or unstable, stop the set and recover.', 'Do not force extra jumps when you cannot keep the knees and feet controlled.'],
  easier: 'Use a squat without a jump or a step-back, no-jump burpee.', harder: 'Progress movement quality and repeatability before adding speed or jump height.',
})
family('chest-and-front-of-shoulder-stretch kneeling-lat-stretch lying-side-quads-stretch rear-deltoid-stretch overhead-triceps-stretch', {
  label: 'Static flexibility', source: 'flexibility', purpose: 'Hold a comfortable position to practise range of motion. This is gentle flexibility work, not a loaded strength repetition.',
  checks: ['Back off from sharp pain, joint pressure or tingling; a stronger stretch is not necessarily better.', 'Do not bounce or hold your breath to reach farther.'],
  easier: 'Reduce the reach or hold time until you can relax and breathe.', harder: 'Extend comfortable hold time gradually; do not force the joint into a deeper position.',
})

const techniqueById = new Map(families.flatMap(({ ids, ...details }) => ids.map(id => [id, details] as const)))
export const exerciseTechnique = (id: string) => techniqueById.get(id)
export const exerciseTechniqueIds = families.flatMap(family => family.ids)
