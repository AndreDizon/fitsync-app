import type { MealEstimate, NutrientRange } from '../../shared/meal-scan'
export const formatMealRange = (value: NutrientRange | null, unit = '') => value ? value[0].toLocaleString() + '–' + value[1].toLocaleString() + (unit ? ' ' + unit : '') : 'Not estimated'
export function mealSummary(meal: MealEstimate) {
  return 'Meal photo estimate; ' + (meal.partial ? 'partial, some ingredients not matched. ' : 'approximate portions. ') + meal.items.map(item => item.name + ' (' + item.state + '), ' + formatMealRange(item.grams, 'g')).join('; ') + '. Estimated matched-food totals: ' + Object.entries(meal.totals).map(([key, value]) => key + ' ' + formatMealRange(value)).join('; ') + '. Not measured values or a complete ingredient/allergen assessment.'
}
export function MealEstimateCard({ meal }: { meal: MealEstimate }) {
  return <section className="meal-estimate" aria-label="Meal nutrition estimate">
    <div className="meal-estimate-title"><h3>Meal estimate</h3><span>{meal.partial ? 'Partial match' : 'Approximate'}</span></div>
    {meal.partial && <p className="meal-estimate-warning">Some ingredients could not be matched. Totals cover only the foods listed below.</p>}
    {!!meal.items.length && <>
      <dl className="meal-estimate-nutrients">{([['Energy', 'energyKcal', 'kcal'], ['Protein', 'proteinG', 'g'], ['Carbs', 'carbsG', 'g'], ['Fat', 'fatG', 'g']] as const).map(([name, key, unit]) => <div key={key}><dt>{name}</dt><dd>{formatMealRange(meal.totals[key], unit)}</dd></div>)}</dl>
      <h4>Foods to review</h4><ul className="meal-estimate-foods">{meal.items.map(item => <li key={item.id}><a href={item.source} target="_blank" rel="noreferrer">{item.name}<span>{item.state}</span></a><strong>{formatMealRange(item.grams, 'g')}</strong></li>)}</ul>
      {!!meal.benefits.length && <details><summary>Potential nutrition benefits</summary><ul className="meal-estimate-benefits">{meal.benefits.map(benefit => <li key={benefit.title}><strong>{benefit.title}</strong><p>{benefit.text}</p><a href={benefit.source} target="_blank" rel="noreferrer">Read the reference</a></li>)}</ul></details>}
    </>}
    <p className="meal-estimate-limits">Photo portions are guesses. Oils, sauces and preparation can change the estimate. A photo cannot confirm allergens or food safety. Use labels or weighed portions for a closer estimate. Not added to your food log.</p>
  </section>
}
