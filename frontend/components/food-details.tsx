'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, BookOpen, ChevronDown, ShieldCheck, Utensils, X } from 'lucide-react'
import { foodDiets, formatNutrient, nutrientsFor, type Food } from '@/lib/nutrition'
import { nutrientCoverage } from '@/lib/health-guidance'
import { FoodArt } from './food-art'
import { FoodGroupBadge, foodGroupTone } from './food-group-badge'
import '@/app/food-library.css'

const guideTabs = [['nutrition', 'Nutrition & benefits'], ['dishes', 'Dish ideas'], ['reference', 'Food reference & notes']] as const
type GuideTab = typeof guideTabs[number][0]

const macros = [['energyKcal', 'Energy', 'kcal'], ['proteinG', 'Protein', 'g'], ['carbsG', 'Carbohydrate', 'g'], ['fatG', 'Fat', 'g']] as const
const nutrientsList = [['fiberG', 'Dietary fiber', 'g'], ['sugarsG', 'Total sugars', 'g'], ['saturatedFatG', 'Saturated fat', 'g'], ['sodiumMg', 'Sodium', 'mg'], ['calciumMg', 'Calcium', 'mg'], ['ironMg', 'Iron', 'mg'], ['potassiumMg', 'Potassium', 'mg'], ['vitaminDUg', 'Vitamin D', 'µg'], ['vitaminCMg', 'Vitamin C', 'mg']] as const

export function FoodDetails({ food, onClose }: { food: Food; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [activeTab, setActiveTab] = useState<GuideTab>('nutrition')
  const [portionId, setPortionId] = useState(food.defaultPortionId)
  const [quantity, setQuantity] = useState('1')
  const [basis, setBasis] = useState<'portion' | '100g'>('portion')
  const portion = food.portions.find(p => p.id === portionId)!
  const grams = Number(quantity) * portion.grams
  const valid = !!quantity.trim() && Number.isFinite(grams) && grams >= 1 && grams <= 2000
  const nutrients = basis === '100g' || valid ? nutrientsFor(food, basis === '100g' ? 100 : grams) : null
  const coverage = nutrientCoverage(food.nutrients)
  const close = () => { dialog.current?.close(); onClose() }
  const raw = /raw|dry/i.test(food.state)
  const dry = /dry/i.test(food.state)
  const rawReadyToEat = raw && !dry && ['Fruits', 'Nuts & seeds'].includes(food.category)
  const selectTab = (tab: GuideTab) => {
    setActiveTab(tab)
    if (dialog.current) {
      dialog.current.scrollTop = 0
      const body = dialog.current.querySelector('.food-detail-body')
      if (body) body.scrollTop = 0
    }
  }
  const referenceException = food.referenceNote && !food.referenceNote.startsWith('Match the exact') && !food.referenceNote.startsWith('Nutrition is for raw')
  useEffect(() => { dialog.current?.showModal() }, [])

  return <dialog className="food-detail food-detail-refined" ref={dialog} aria-labelledby="food-detail-title"
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const r = event.currentTarget.getBoundingClientRect()
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close()
    }}>
    <header className="food-detail-header">
      <div><h2 id="food-detail-title">{food.name}</h2><p>Explore portions, nutrition and Filipino dish ideas.</p></div>
      <button type="button" onClick={close} aria-label="Close food details" autoFocus><X size={21} /></button>
      <div className="fd-section-nav" role="tablist" aria-label="Food guide sections">
        {guideTabs.map(([id, label], index) => <button key={id} id={`food-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`food-panel-${id}`} tabIndex={activeTab === id ? 0 : -1}
          onClick={() => selectTab(id)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % guideTabs.length : event.key === 'ArrowLeft' ? (index + guideTabs.length - 1) % guideTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? guideTabs.length - 1 : null
            if (next === null) return
            event.preventDefault()
            selectTab(guideTabs[next][0])
            dialog.current?.querySelector<HTMLButtonElement>(`#food-tab-${guideTabs[next][0]}`)?.focus()
          }}>{label}{id === 'dishes' && !!food.sampleDishes?.length && <span>{food.sampleDishes.length}</span>}</button>)}
      </div>
    </header>
    <div className="food-detail-body">
      <div id="food-panel-nutrition" role="tabpanel" aria-labelledby="food-tab-nutrition" className="fd-tab-panel" hidden={activeTab !== 'nutrition'} tabIndex={0}>
      <section className="fd-nutrition" aria-labelledby="food-portion-title">
        <div className="fd-section-heading"><div><h3 id="food-portion-title" tabIndex={-1}>Nutrition for your portion</h3><p>Adjust your serving to see its nutrients.</p></div><div className="food-basis-control" role="group" aria-label="Nutrition display basis"><button type="button" aria-pressed={basis === 'portion'} onClick={() => setBasis('portion')}>My portion</button><button type="button" aria-pressed={basis === '100g'} onClick={() => setBasis('100g')}>Per 100 g</button></div></div>
        <div className="food-portion-controls">
          <label>Amount<input type="number" inputMode="decimal" min={portionId === 'grams' ? 1 : .1} step="any" value={quantity} onChange={event => setQuantity(event.target.value)} aria-invalid={!valid} aria-describedby="food-portion-feedback" /></label>
          <label>Measurement<select aria-label="Measurement" value={portionId} onChange={event => { setPortionId(event.target.value); setQuantity('1') }}>{food.portions.map(p => <option key={p.id} value={p.id}>{p.label}{p.id === 'grams' || p.id === '100g' ? '' : ` · ${p.grams} g`}</option>)}</select></label>
        </div>
        <div className="fd-basis-row"><p id="food-portion-feedback" role="status" data-invalid={!valid}>{!valid ? 'Enter an edible portion between 1 and 2,000 g.' : basis === '100g' ? 'Showing the 100 g reference · your serving stays saved' : `Showing your ${formatNutrient(grams)} g portion`}</p></div>
        <div className="food-macro-panel">{macros.map(([key, label, unit]) => <div key={key}><span>{label}</span><strong>{nutrients ? formatNutrient(nutrients[key], key === 'energyKcal' ? 0 : 1) : '—'}<small>{unit}</small></strong></div>)}</div>
        <details className="fd-disclosure food-full-nutrients"><summary>Vitamins, minerals & full nutrition <ChevronDown size={18} aria-hidden="true" /></summary><div><dl>{nutrientsList.map(([key, name, unit]) => <div key={key}><dt>{name}</dt><dd>{nutrients ? formatNutrient(nutrients[key]) : '—'} {nutrients?.[key] === null ? '' : unit}</dd></div>)}</dl><p>{coverage.reported} of {coverage.total} nutrients reported. “Not reported” means unknown, not zero. Values are estimates for the named reference food.</p></div></details>
      </section>

      <section className="fd-benefits" aria-labelledby="food-benefits-title">
        <div className="fd-section-heading"><BookOpen size={21} aria-hidden="true" /><div><h3 id="food-benefits-title">Nutrition notes & benefits</h3><p>How to use this food’s nutrition information.</p></div></div>
        {food.benefits.length ? food.benefits.map(benefit => <section key={benefit.title}><h4>{benefit.title}</h4><p>{benefit.text}</p>{benefit.source && <a href={benefit.source} target="_blank" rel="noreferrer">Read the reference <ArrowUpRight size={13} aria-hidden="true" /></a>}</section>) : <p>Use the nutrient amounts above to compare portions. Unreported nutrients are unknown, not zero.</p>}
        <p className="fd-small-note">These notes describe nutrients, not a promise of health results. Your overall eating pattern matters.</p>
      </section>
      </div>
      <div id="food-panel-dishes" role="tabpanel" aria-labelledby="food-tab-dishes" className="fd-tab-panel" hidden={activeTab !== 'dishes'} tabIndex={0}>
      {!!food.sampleDishes?.length && <section className="food-dish-examples fd-dishes" aria-labelledby="food-dishes-title">
        <div className="fd-section-heading"><Utensils size={21} aria-hidden="true" /><div><h3 id="food-dishes-title" tabIndex={-1}>{food.sampleDishes.length} Filipino dish ideas</h3><p>Ways to enjoy this ingredient at home.</p></div></div>
        <ul>{food.sampleDishes.map(dish => { const [name, variation] = dish.split(' ('); return <li key={dish}><span>{name}</span>{variation && <small>{variation.replace(/\)$/, '')}</small>}</li> })}</ul>
        <p className="fd-small-note">These are serving ideas. Nutrition values describe this ingredient, not the finished dishes. Added ingredients and the variety used change the result.</p>
      </section>}

      {!food.sampleDishes?.length && <section className="fd-section-heading"><Utensils size={21} aria-hidden="true" /><div><h3>Serving ideas</h3><p>No Filipino dish examples are listed for this reference food yet.</p></div></section>}
      <dl className="fd-facts-list fd-serving-facts"><div><dt>Pairs with</dt><dd>{food.pairing.join(', ') || 'Choose accompaniments that suit your preferences.'}</dd></div><div><dt>Meal ideas</dt><dd>{food.classifications.mealUses.join(', ') || 'Use as part of a balanced meal.'}</dd></div></dl>
      <aside className="food-allergen-note fd-allergen"><ShieldCheck size={19} aria-hidden="true" /><div><strong>{food.allergens.length ? `Listed allergens: ${food.allergens.join(', ')}` : 'No major ingredient allergens listed'}</strong><p>Check the actual product and recipe. Cross-contact is unknown, and dish ideas can contain additional allergens.</p></div></aside>

      </div>
      <div id="food-panel-reference" role="tabpanel" aria-labelledby="food-tab-reference" className="fd-tab-panel" hidden={activeTab !== 'reference'} tabIndex={0}>
      <section className="fd-overview" aria-label="Food at a glance">
        <div className="fd-illustration" data-food-group={foodGroupTone(food.category)}><FoodArt id={food.id} category={food.category} /></div>
        <div className="fd-overview-copy">
          <div className="fd-group-row">{food.classifications.groups.map(group => <FoodGroupBadge key={group} group={group} />)}<span className="fd-state">{food.state}</span></div>
          <h3>{dry ? 'Weigh before adding water' : rawReadyToEat ? 'Count only the part you eat' : raw ? 'Weigh the edible portion before cooking' : food.state === 'Cooked' ? 'Weigh after cooking' : 'Measure the ready-to-eat portion'}</h3>
          <p>{dry ? 'Use the dry weight. Water changes the weight after cooking.' : rawReadyToEat ? 'Leave out peel, pits and shells. Log milk, toppings and other additions separately.' : raw ? 'Remove bones, shells and other inedible parts. Log sauces and other additions separately.' : 'Leave out bones, shells and other inedible parts. Log sauces and additions separately.'}</p>
          <dl className="fd-quick-facts"><div><dt>Preparation</dt><dd>{food.classifications.preparation.join(', ')}</dd></div><div><dt>Estimated prep time</dt><dd>About {food.prepMinutes} min</dd></div></dl>
        </div>
      </section>
      {referenceException && <aside className="fd-reference-match"><strong>About this reference</strong><p>{food.referenceNote}</p></aside>}

      <div className="fd-more-information">
        <div className="fd-section-heading"><BookOpen size={21} aria-hidden="true" /><div><h3 id="food-more-title" tabIndex={-1}>Food reference & notes</h3><p>Preparation, preferences and the source behind the numbers.</p></div></div>
        <details className="fd-disclosure"><summary>How to prepare & measure <ChevronDown size={18} aria-hidden="true" /></summary><div><ol>{food.preparation.map(step => <li key={step}>{step}</li>)}</ol><p><strong>Portion reference.</strong> {food.measureNote}</p><p><strong>Pairs with:</strong> {food.pairing.join(' · ')}.</p><p className="fd-small-note">{food.prepTimeSource}. Budget: {food.budget}; a qualitative guide, not a current price.</p></div></details>
        <details className="fd-disclosure"><summary>Food groups & eating preferences <ChevronDown size={18} aria-hidden="true" /></summary><div><dl className="fd-facts-list">
          <div><dt>Food groups</dt><dd className="fd-group-row">{food.classifications.groups.map(group => <FoodGroupBadge key={group} group={group} />)}</dd></div>
          <div><dt>Food type</dt><dd>{food.classifications.foodTypes.join(', ')}</dd></div><div><dt>Suggested meals</dt><dd>{food.classifications.mealUses.join(', ')}</dd></div><div><dt>Eating preferences</dt><dd>{foodDiets(food).join(', ') || 'Check the actual food and preparation'}</dd></div><div><dt>Halal suitability</dt><dd>{food.halal === 'not-compatible' ? 'Not compatible' : food.halal === 'requires-verification' ? 'Product verification required' : 'Ingredient-compatible; not certified'}</dd></div>
        </dl><p>{food.productNote || 'Ingredient tags do not verify a complete recipe or product.'}</p></div></details>

        <details className="fd-disclosure"><summary>Exact food reference & data source <ChevronDown size={18} aria-hidden="true" /></summary><div><p><strong>USDA description:</strong> {food.source.description}</p><p>{food.referenceNote || food.description}</p><p>{food.source.dataset}. Published {food.source.publishedAt}; FitSync data check {food.source.reviewedAt}. Measurement source: {portion.source}.</p><p>Raw and cooked weights are not interchangeable. Generic records are not lab tests of your meal or product labels. A data check does not imply professional certification.</p><a href={food.source.url} target="_blank" rel="noreferrer">USDA FoodData Central · {food.source.fdcId} <ArrowUpRight size={13} aria-hidden="true" /></a></div></details>
      </div>
      </div>
    </div>
  </dialog>
}
