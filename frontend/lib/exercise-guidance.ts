import type { SeedExercise } from './exercise-offline'

export const guidanceLevels = ['Beginner', 'Intermediate', 'Advanced'] as const
export type GuidanceLevel = typeof guidanceLevels[number]

export function exerciseGuidance(exercise: Pick<SeedExercise, 'category' | 'movementPattern' | 'target_muscle' | 'equipment'>, level: GuidanceLevel = 'Beginner') {
  const category = exercise.category.toLowerCase()
  const progression = level === 'Beginner'
    ? 'Practise the easiest controlled variation. Finish each set while you could still perform a few good repetitions; build consistency before adding load.'
    : level === 'Intermediate'
      ? 'Record your repetitions and effort. When the planned repetitions are consistently controlled, increase repetitions or load in a small step, then reassess recovery.'
      : 'Match volume and load to a specific goal. Compare performance across sessions and reduce demands when technique or recovery deteriorates. Training to failure is optional.'
  if (category === 'cardio') return {
    target: level === 'Beginner' ? 'Start with a short, comfortable bout' : level === 'Intermediate' ? 'Build sustainable duration before intensity' : 'Separate easier work from demanding intervals',
    rest: 'Recover as needed', restDetail: 'Continuous aerobic work has no prescribed between-set break. Slow down or pause until breathing and control recover; interval recovery depends on the work intensity.',
    effort: 'At moderate intensity you can talk, but not sing. The same pace can feel different on different days.', progression,
    source: 'CDC: measuring activity intensity', url: 'https://www.cdc.gov/physical-activity-basics/measuring/index.html',
  }
  if (category === 'stretching') return {
    target: level === 'Beginner' ? 'Comfortable holds of about 10 seconds' : 'Comfortable holds of 10-30 seconds',
    rest: 'Release between holds', restDetail: 'Relax out of the position and reset comfortably before repeating. There is no universal timed rest interval for stretching.',
    effort: 'Warm up first. Use a gentle pulling sensation, breathe normally and avoid bouncing or forcing a deeper stretch.',
    progression: 'Increase comfortable hold time gradually, rather than pushing into pain. AHA guidance suggests repeating each stretch three to five times.',
    source: 'AHA: flexibility exercise', url: 'https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/flexibility-exercise-stretching',
  }
  if (category === 'plyometrics') return {
    target: level === 'Beginner' ? 'Learn landing control before repeated jumps' : level === 'Intermediate' ? 'Keep repetitions crisp and landings controlled' : 'Use goal-specific power work with full recovery',
    rest: 'Prioritize full recovery', restDetail: 'Restart only when you can repeat a controlled, balanced landing. Stop the set when quality drops; do not shorten recovery to chase fatigue.',
    effort: 'Choose low-impact preparation if you cannot land quietly and steadily. More experience alone does not make a high-impact variation suitable.', progression,
    source: 'HSS: plyometrics for beginners', url: 'https://www.hss.edu/health-library/move-better/plyometrics-workouts-for-beginner',
  }
  const compound = /^(squat|hinge|push|pull)$/i.test(exercise.movementPattern) && !/biceps|triceps|deltoid|calves|forearm/i.test(exercise.target_muscle)
  return {
    target: level === 'Beginner' ? 'Learn the movement with manageable resistance' : level === 'Intermediate' ? 'Progress repetitions and load gradually' : 'Organize work around strength, growth or endurance',
    rest: compound ? '2-3 min between sets' : '1-2 min between sets',
    restDetail: `${compound ? 'Multi-joint work often needs more recovery to repeat good repetitions.' : 'For manageable accessory work, start with 60-120 seconds.'} For heavy strength sets, allow 2-5 minutes, extending rest if performance or technique has not recovered. These are FitSync starting ranges, not fixed rules for an expertise level.`,
    effort: 'Use resistance that lets you control the whole movement. A general-health routine should cover all major muscle groups across the week; you do not need to test your maximum.', progression,
    source: 'ACSM: 2026 resistance training guidance', url: 'https://acsm.org/resistance-training-guidelines-update-2026/',
  }
}

export function durationLabel(seconds: number) {
  const total = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0))
  if (total < 60) return `${total} sec`
  return `${Math.floor(total / 60)} min${total % 60 ? ` ${total % 60} sec` : ''}`
}
