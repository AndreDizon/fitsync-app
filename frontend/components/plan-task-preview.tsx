import { foodTotals, taskMinutes, type PlanTask } from '../../shared/daily-plans'

const format = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 })

export function PlanTaskPreview({ item }: { item: PlanTask }) {
  const totals = 'foodId' in item ? foodTotals([item]) : null
  const metrics = 'foodId' in item
    ? [{ label: 'Portion', value: format(item.grams), unit: 'g' }, { label: 'Energy', value: format(totals!.energy), unit: 'kcal' }, { label: 'Protein', value: format(totals!.protein), unit: 'g' }]
    : [{ label: 'Sets', value: String(item.sets), unit: '' }, { label: item.targetType === 'reps' ? 'Reps / set' : 'Time / set', value: String(item.target), unit: item.targetType === 'time' ? 'sec' : '' }, { label: 'Est. session', value: format(taskMinutes(item)), unit: 'min' }]
  return <div className="plan-task-preview">
    <dl className="plan-task-metrics">{metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}{metric.unit && <small>{metric.unit}</small>}</dd></div>)}</dl>
    {'exerciseId' in item && <p className="plan-task-quick-note"><span>{item.restSeconds}s rest between sets</span>{!!item.actualSets?.length && <span>{item.actualSets.length} {item.actualSets.length === 1 ? 'set' : 'sets'} logged</span>}</p>}
  </div>
}
