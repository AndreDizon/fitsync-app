import { foodTotals, taskBlockMinutes, taskTimeBreakdown, type PlanTask } from '../../shared/daily-plans'
import { durationLabel } from '@/lib/exercise-guidance'

const format = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 })

export function PlanTaskPreview({ item, nextItem }: { item: PlanTask; nextItem?: PlanTask }) {
  const totals = 'foodId' in item ? foodTotals([item]) : null
  const timing = taskTimeBreakdown(item)
  const breakdown = [
    [timing.workSeconds, 'exercise'], [timing.restSeconds, 'between-set rest'],
    [timing.transitionSeconds, 'recovery / setup before this exercise'],
    [timing.cooldownSeconds, 'cooldown'],
  ] as const
  const metrics = 'foodId' in item
    ? [{ label: 'Portion', value: format(item.grams), unit: 'g' }, { label: 'Energy', value: format(totals!.energy), unit: 'kcal' }, { label: 'Protein', value: format(totals!.protein), unit: 'g' }]
    : [{ label: 'Sets', value: String(item.sets), unit: '' }, { label: item.targetType === 'reps' ? 'Reps / set' : 'Time / set', value: String(item.target), unit: item.targetType === 'time' ? 'sec' : '' }, { label: 'Rest between sets', value: item.sets > 1 ? durationLabel(item.restSeconds) : 'None', unit: '' }, { label: 'Est. block total', value: format(taskBlockMinutes(item)), unit: 'min' }]
  return <div className="plan-task-preview">
    <dl className={`plan-task-metrics ${'exerciseId' in item ? 'has-rest' : ''}`}>{metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}{metric.unit && <small>{metric.unit}</small>}</dd></div>)}</dl>
    {'exerciseId' in item && <>
      <p className="plan-task-time-breakdown">{breakdown.filter(([seconds]) => seconds > 0).map(([seconds, label]) => `${durationLabel(seconds)} ${label}`).join(' + ')} = {durationLabel(timing.totalSeconds - timing.warmupSeconds)} total.</p>
      <p className="plan-task-quick-note"><span>{item.sets > 1 ? `${item.sets - 1} between-set breaks included in the estimate.` : 'One continuous set; no between-set break.'}</span>{!!item.actualSets?.length && <span>{item.actualSets.length} {item.actualSets.length === 1 ? 'set' : 'sets'} logged</span>}</p>
      {nextItem && 'exerciseId' in nextItem && <aside className="plan-task-recovery"><strong>Before the next exercise</strong><span>{nextItem.preparation?.transitionSeconds ? `${durationLabel(nextItem.preparation.transitionSeconds)} recovery & setup` : 'Recover and prepare your next setup'}</span><small>{nextItem.preparation?.transitionSeconds ? 'Already included in the next exercise’s session estimate. Take longer if you need it.' : 'No transition time is scheduled. Resume when breathing and technique are controlled.'}</small></aside>}
      {!nextItem && !!item.preparation?.cooldownSeconds && <aside className="plan-task-recovery"><strong>Finish with a cooldown</strong><span>{durationLabel(item.preparation.cooldownSeconds)} easy movement</span><small>Included in this session estimate.</small></aside>}
    </>}
  </div>
}
