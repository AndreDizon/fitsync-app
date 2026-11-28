'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ShieldCheck, X } from 'lucide-react'
import { foodDiets, formatNutrient, nutrientsFor, type Food } from '@/lib/nutrition'
import { nutrientCoverage } from '@/lib/health-guidance'
import { FoodArt } from './food-art'
import { FoodGroupBadge, foodGroupTone } from './food-group-badge'
import '@/app/food-library.css'

const macros = [['energyKcal', 'Energy', 'kcal'], ['proteinG', 'Protein', 'g'], ['carbsG', 'Carbohydrate', 'g'], ['fatG', 'Fat', 'g']] as const
const nutrientsList = [['fiberG', 'Dietary fiber', 'g'], ['sugarsG', 'Total sugars', 'g'], ['saturatedFatG', 'Saturated fat', 'g'], ['sodiumMg', 'Sodium', 'mg'], ['calciumMg', 'Calcium', 'mg'], ['ironMg', 'Iron', 'mg'], ['potassiumMg', 'Potassium', 'mg'], ['vitaminDUg', 'Vitamin D', 'µg'], ['vitaminCMg', 'Vitamin C', 'mg']] as const

export function FoodDetails({ food, onClose }: { food: Food; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
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
      <div><h2 id="food-detail-title">{food.name}</h2><p>Food guide · nutrients, portions & dish ideas</p></div>
      <button type="button" onClick={close} aria-label="Close food details" autoFocus><X size={21} /></button>
    </header>
    <div className="food-detail-body">
      <section className="fd-overview" aria-label="Food at a glance">
        <div className="fd-illustration" data-food-group={foodGroupTone(food.category)}><FoodArt id={food.id} category={food.category} /></div>
        <div className="fd-overview-copy">
          <div className="fd-group-row">{food.classifications.groups.map(group => <FoodGroupBadge key={group} group={group} />)}<span className="fd-state">{food.state}</span></div>
          <h3>{dry ? 'Measure the dry amount before cooking' : raw ? 'Measure the raw, edible portion' : food.state === 'Cooked' ? 'Measure the cooked, edible portion' : 'Measure the ready-to-eat portion'}</h3>
          <p>{dry ? 'Use dry weight before adding water, milk or other ingredients. The same weight of cooked food has different values.' : raw ? 'Use edible weight before cooking. Remove inedible parts; count toppings, sauces and other additions separately.' : 'Use edible weight only. Bones, shells, peel and other inedible parts are excluded.'}</p>
          <dl className="fd-quick-facts"><div><dt>Reference preparation</dt><dd>{food.classifications.preparation.join(', ')}</dd></div><div><dt>Preparation estimate</dt><dd>About {food.prepMinutes} min</dd></div></dl>
        </div>
      </section>
      {referenceException && <aside className="fd-reference-match"><strong>About this reference</strong><p>{food.referenceNote}</p></aside>}

      <section className="fd-nutrition" aria-labelledby="food-portion-title">
        <div className="fd-section-heading"><div><h3 id="food-portion-title">Nutrition for your portion</h3><p>Choose an amount, then compare with the 100 g reference.</p></div></div>
        <div className="food-portion-controls">
          <label>Amount<input type="number" inputMode="decimal" min={portionId === 'grams' ? 1 : .1} step="any" value={quantity} onChange={event => setQuantity(event.target.value)} aria-invalid={!valid} aria-describedby="food-portion-feedback" /></label>
          <label>Measurement<select aria-label="Measurement" value={portionId} onChange={event => { setPortionId(event.target.value); setQuantity('1') }}>{food.portions.map(p => <option key={p.id} value={p.id}>{p.label}{p.id === 'grams' || p.id === '100g' ? '' : ` · ${p.grams} g`}</option>)}</select></label>
        </div>
        <div className="fd-basis-row"><p id="food-portion-feedback" role="status">{!valid ? 'Enter an edible portion between 1 and 2,000 g.' : basis === '100g' ? 'Showing the 100 g reference' : `Showing your ${formatNutrient(grams)} g portion`}</p><div className="food-basis-control" role="group" aria-label="Nutrition display basis"><button type="button" aria-pressed={basis === 'portion'} onClick={() => setBasis('portion')}>My portion</button><button type="button" aria-pressed={basis === '100g'} onClick={() => setBasis('100g')}>Per 100 g</button></div></div>
        <div className="food-macro-panel">{macros.map(([key, label, unit]) => <div key={key}><span>{label}</span><strong>{nutrients ? formatNutrient(nutrients[key], key === 'energyKcal' ? 0 : 1) : '—'}<small>{unit}</small></strong></div>)}</div>
        <details className="fd-disclosure food-full-nutrients"><summary>Vitamins, minerals & full nutrition</summary><div><dl>{nutrientsList.map(([key, name, unit]) => <div key={key}><dt>{name}</dt><dd>{nutrients ? formatNutrient(nutrients[key]) : '—'} {nutrients?.[key] === null ? '' : unit}</dd></div>)}</dl><p>{coverage.reported} of {coverage.total} nutrients reported. “Not reported” means unknown, not zero. Values are estimates for the named reference food.</p></div></details>
      </section>

      {!!food.sampleDishes?.length && <section className="food-dish-examples fd-dishes" aria-labelledby="food-dishes-title">
        <div className="fd-section-heading"><div><h3 id="food-dishes-title">{food.sampleDishes.length} Filipino dish ideas</h3><p>Favorites, regional dishes and home-style variations.</p></div></div>
        <ul>{food.sampleDishes.map(dish => <li key={dish}>{dish}</li>)}</ul>
        <p className="fd-small-note">These are serving ideas. Nutrition values describe this ingredient, not the finished dishes. Added ingredients and the variety used change the result.</p>
      </section>}

      <aside className="food-allergen-note fd-allergen"><ShieldCheck size={19} aria-hidden="true" /><div><strong>{food.allergens.length ? `Listed allergens: ${food.allergens.join(', ')}` : 'No major ingredient allergens listed'}</strong><p>Check the actual product and recipe. Cross-contact is unknown, and dish ideas can contain additional allergens.</p></div></aside>

      <div className="fd-more-information">
        <details className="fd-disclosure"><summary>How to prepare & measure</summary><div><ol>{food.preparation.map(step => <li key={step}>{step}</li>)}</ol><p><strong>Portion reference.</strong> {food.measureNote}</p><p><strong>Pairs with:</strong> {food.pairing.join(' · ')}.</p><p className="fd-small-note">{food.prepTimeSource}. Budget: {food.budget}; a qualitative guide, not a current price.</p></div></details>
        <details className="fd-disclosure"><summary>Food groups & eating preferences</summary><div><dl className="fd-facts-list">
          <div><dt>Food groups</dt><dd className="fd-group-row">{food.classifications.groups.map(group => <FoodGroupBadge key={group} group={group} />)}</dd></div>
          <div><dt>Food type</dt><dd>{food.classifications.foodTypes.join(', ')}</dd></div><div><dt>Suggested meals</dt><dd>{food.classifications.mealUses.join(', ')}</dd></div><div><dt>Eating preferences</dt><dd>{foodDiets(food).join(', ') || 'Check the actual food and preparation'}</dd></div><div><dt>Halal suitability</dt><dd>{food.halal === 'not-compatible' ? 'Not compatible' : food.halal === 'requires-verification' ? 'Product verification required' : 'Ingredient-compatible; not certified'}</dd></div>
        </dl><p>{food.productNote || 'Ingredient tags do not verify a complete recipe or product.'}</p></div></details>
        <details className="fd-disclosure"><summary>Nutrient notes & benefits</summary><div>{food.benefits.map(benefit => <section key={benefit.title}><h4>{benefit.title}</h4><p>{benefit.text}</p>{benefit.source && <a href={benefit.source} target="_blank" rel="noreferrer">Read the reference <ArrowUpRight size={13} aria-hidden="true" /></a>}</section>)}</div></details>
        <details className="fd-disclosure"><summary>Exact food reference & data source</summary><div><p><strong>USDA description:</strong> {food.source.description}</p><p>{food.referenceNote || food.description}</p><p>{food.source.dataset}. Published {food.source.publishedAt}; FitSync data check {food.source.reviewedAt}. Measurement source: {portion.source}.</p><p>Raw and cooked weights are not interchangeable. Generic records are not lab tests of your meal or product labels. A data check does not imply professional certification.</p><a href={food.source.url} target="_blank" rel="noreferrer">USDA FoodData Central · {food.source.fdcId} <ArrowUpRight size={13} aria-hidden="true" /></a></div></details>
      </div>
    </div>
  </dialog>
}
