'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Check, Leaf, Search, ShieldCheck, Utensils, X } from 'lucide-react'
import { foods, foodGroups, foodDiets, matchesFoodFilters, formatNutrient, nutrientsFor, type Food } from '@/lib/nutrition'
import { OfflineLibraryStatus } from './offline-library-status'
import { FoodArt } from './food-art'
import '@/app/food-library.css'

export function FoodDetails({ food, onClose }: { food: Food; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [portionId, setPortionId] = useState(food.defaultPortionId)
  const [quantity, setQuantity] = useState('1')
  const portion = food.portions.find(portion => portion.id === portionId)!
  const grams = Number(quantity) * portion.grams
  const valid = quantity.trim() !== '' && Number.isFinite(grams) && grams >= 1 && grams <= 2000
  const nutrients = valid ? nutrientsFor(food, grams) : null
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    return () => { document.body.style.overflow = previous }
  }, [])
  const close = () => { dialog.current?.close(); onClose() }
  return <dialog className="food-detail" ref={dialog} aria-labelledby="food-detail-title" onCancel={event => { event.preventDefault(); close() }} onClick={event => {
    if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close() }
  }}>
    <header className="food-detail-header"><div><span className="food-kicker">KNOW YOUR NOURISHMENT</span><h2 id="food-detail-title">{food.name}</h2></div><button type="button" onClick={close} aria-label="Close food details" autoFocus><X size={21} /></button></header>
    <div className="food-detail-body">
      <div className={`food-detail-art food-tone-${food.category.toLowerCase().replaceAll(' ', '-')}`}><FoodArt id={food.id} category={food.category} /><div><span>{food.category}</span><span>{food.state}</span><span>Generic food</span></div></div>
      <p className="food-description">{food.description}</p>
      <section className="food-classifications" aria-labelledby="food-classifications-title"><h3 id="food-classifications-title">Food classifications</h3><dl>{[
        ['Food groups', food.classifications.groups], ['Food types', food.classifications.foodTypes], ['Preparation', food.classifications.preparation], ['Meal ideas', food.classifications.mealUses], ['Eating preferences', foodDiets(food)], ['Listed allergens', food.allergens.length ? food.allergens : ['None listed; cross-contact unknown']], ['Halal status', [food.halal === 'not-compatible' ? 'Not compatible' : food.halal === 'requires-verification' ? 'Product verification required' : 'Ingredient-compatible; not certified']],
      ].map(([label, values]) => <div key={label as string}><dt>{label}</dt><dd>{(values as string[]).map(value => <span key={value}>{value}</span>)}</dd></div>)}</dl><p>Meal uses are suggestions. Ingredient tags do not establish product-specific dietary or allergen safety.</p></section>
      <section className="food-portion" aria-labelledby="food-portion-title"><div><h3 id="food-portion-title">Make it your portion</h3><span>Edible weight only</span></div><div className="food-portion-controls"><label>Amount<input type="number" inputMode="decimal" min={portionId === 'grams' ? 1 : 0.1} step="any" value={quantity} onChange={event => setQuantity(event.target.value)} aria-invalid={!valid} /></label><label>Measurement<select aria-label="Measurement" value={portionId} onChange={event => { setPortionId(event.target.value); setQuantity('1') }}>{food.portions.map(portion => <option key={portion.id} value={portion.id}>{portion.label}{portion.id === 'grams' || portion.id === '100g' ? '' : ` · ${portion.grams} g`}</option>)}</select></label></div><p role="status">{valid ? `${formatNutrient(grams)} g edible portion` : 'Enter a portion between 1 and 2,000 g.'}</p><small>{food.measureNote}</small></section>
      <div className="food-macro-panel">{([['energyKcal', 'Energy', 'kcal'], ['proteinG', 'Protein', 'g'], ['carbsG', 'Carbs', 'g'], ['fatG', 'Fat', 'g']] as const).map(([key, label, unit]) => <div key={key}><span>{label}</span><strong>{nutrients ? formatNutrient(nutrients[key], key === 'energyKcal' ? 0 : 1) : '—'}<small>{unit}</small></strong></div>)}</div>
      <details className="food-full-nutrients"><summary>Full nutrition for this portion</summary><dl>{([['fiberG', 'Dietary fiber', 'g'], ['sugarsG', 'Total sugars', 'g'], ['saturatedFatG', 'Saturated fat', 'g'], ['sodiumMg', 'Sodium', 'mg'], ['calciumMg', 'Calcium', 'mg'], ['ironMg', 'Iron', 'mg'], ['potassiumMg', 'Potassium', 'mg'], ['vitaminDUg', 'Vitamin D', 'µg'], ['vitaminCMg', 'Vitamin C', 'mg']] as const).map(([key, name, unit]) => <div key={key}><dt>{name}</dt><dd>{nutrients ? formatNutrient(nutrients[key]) : '—'} {nutrients?.[key] === null ? '' : unit}</dd></div>)}</dl><p>Values scale from 100 g of the specified food. Missing values are not treated as zero. Nutrient and portion values are estimates, not a laboratory result for your specific food.</p></details>
      <section className="food-benefits"><h3>What it brings to your plate</h3>{food.benefits.map(benefit => <article key={benefit.title}><Leaf size={17} /><div><h4>{benefit.title}</h4><p>{benefit.text}</p>{benefit.source && <a href={benefit.source} target="_blank" rel="noreferrer">About this nutrient <ArrowRight size={11} /></a>}</div></article>)}</section>
      <section className="food-preparation"><h3>Preparation & measurement</h3><div className="food-prep-meta"><span>Approx. {food.prepMinutes} min preparation</span><span>{food.budget}</span></div><ol>{food.preparation.map(step => <li key={step}>{step}</li>)}</ol><small>{food.prepTimeSource}. Budget is a qualitative guide, not a current price.</small><p><strong>Pairs with:</strong> {food.pairing.join(' · ')}. Pairings are ideas; check dietary suitability separately.</p></section>
      <aside className="food-allergen-note"><ShieldCheck size={18} /><div><strong>{food.allergens.length ? `Contains: ${food.allergens.join(', ')}` : 'No major ingredient allergens listed'}</strong><p>Generic ingredient information does not guarantee allergen safety. Cross-contact status is unknown; check the actual product label and preparation.</p>{food.productNote && <p>{food.productNote}</p>}</div></aside>
      <p className="food-source">Nutrition & household weights: <a href={food.source.url} target="_blank" rel="noreferrer">USDA FoodData Central · {food.source.fdcId}</a><br />{food.source.dataset} · source published {food.source.publishedAt} · reviewed {food.source.reviewedAt}. Benefits, preparation notes and illustrations: FitSync.</p>
      <details className="food-source-description"><summary>Exact source description</summary><p>{food.source.description}</p></details>
    </div>
  </dialog>
}

export function FoodLibrary() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const results = useRef<HTMLDivElement>(null)
  const [category, setCategory] = useState('')
  const [diet, setDiet] = useState('')
  const [foodType, setFoodType] = useState('')
  const [preparation, setPreparation] = useState('')
  const [meal, setMeal] = useState('')
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([])
  const clearFilters = () => { setQuery(''); setCategory(''); setDiet(''); setFoodType(''); setPreparation(''); setMeal(''); setExcludedAllergens([]); }
  useEffect(() => setPage(1), [query, category, diet, foodType, preparation, meal, excludedAllergens])
  const [selected, setSelected] = useState<Food | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const categories = foodGroups
  const classificationOptions = (key: 'foodTypes' | 'preparation' | 'mealUses') => [...new Set(foods.flatMap(food => food.classifications[key]))].sort()
  const availableAllergens = [...new Set(foods.flatMap(food => food.allergens))].sort()
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
  const filtered = foods.filter(food => matchesFoodFilters(food, { group: category, type: foodType, preparation, meal, excludedAllergens }) && (!diet || (diet === 'halal' ? food.halal === 'ingredient-compatible' : food[diet as 'vegan' | 'vegetarian' | 'pescatarian'])) && terms.every(term => normalize([food.name, ...food.aliases, food.category, food.state, ...Object.values(food.classifications).flat(), ...foodDiets(food)].join(' ')).includes(term)))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 24))
  const currentPage = Math.min(page, totalPages)
  const changePage = (next: number) => { setPage(next); results.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }
  const close = () => { setSelected(null); requestAnimationFrame(() => (opener.current?.isConnected ? opener.current : search.current)?.focus()) }
  return <div className="food-library">
    <header className="food-library-heading plan-tab-page-heading"><div><p className="food-kicker">YOUR NUTRITION LIBRARY</p><h2>Build a better plate.</h2><p>100 everyday foods to explore and understand. Browse nutrients, measurements, preparation and benefits.</p></div><span className="food-preview-badge"><Utensils size={15} />100 foods</span></header>
    <OfflineLibraryStatus catalog="food" />
    <div className="food-preview-note"><Leaf size={17} /><span>A reference library for everyone. Information and default portions do not change with onboarding. Build your personal schedule in Playlist.</span></div>
    <section className="food-filters" aria-label="Find foods"><div className="food-search-row"><label className="food-search"><Search size={19} /><input ref={search} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search rice, tofu, munggo…" aria-label="Search foods" />{query && <button aria-label="Clear food search" onClick={() => setQuery('')}><X size={16} /></button>}</label><label className="food-diet-filter">Eating preference<select value={diet} onChange={event => setDiet(event.target.value)}><option value="">All foods</option><option value="vegan">Vegan ingredients</option><option value="vegetarian">Vegetarian ingredients</option><option value="pescatarian">Pescatarian ingredients</option><option value="halal">Halal-compatible ingredients (not certified)</option></select></label></div><div className="food-category-filters" role="group" aria-label="Food categories">{['', ...categories].map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item || 'All foods'}<small>{foods.filter(food => !item || food.classifications.groups.includes(item)).length}</small></button>)}</div><p className="food-group-hint">Counts show the full 100-food catalog. Foods can belong to more than one group.</p><details className="food-more-filters"><summary>More classifications{foodType || preparation || meal || excludedAllergens.length ? ' - Filters active' : ''}</summary><div className="food-classification-filters">{([
      ['Food type', foodType, setFoodType, classificationOptions('foodTypes')], ['Preparation method', preparation, setPreparation, classificationOptions('preparation')], ['Meal use', meal, setMeal, classificationOptions('mealUses')],
    ] as const).map(([label, value, setter, options]) => <label key={label}>{label}<select aria-label={label} value={value} onChange={event => setter(event.target.value)}><option value="">All options</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>)}</div><fieldset className="food-allergen-filters"><legend>Exclude listed ingredient allergens</legend>{availableAllergens.map(allergen => <label key={allergen}><input type="checkbox" checked={excludedAllergens.includes(allergen)} onChange={() => setExcludedAllergens(values => values.includes(allergen) ? values.filter(value => value !== allergen) : [...values, allergen])} />{allergen}</label>)}<p>Hides matching ingredient flags only. Cross-contact and other allergies still require individual review.</p></fieldset></details><button className="food-clear-filters" onClick={clearFilters}>Clear all filters</button></section>
    <div className="food-results-heading" ref={results}><span role="status">{filtered.length} {filtered.length === 1 ? 'food' : 'foods'} to explore</span><span>{filtered.length ? `Showing ${(currentPage - 1) * 24 + 1}-${Math.min(currentPage * 24, filtered.length)} - Nutrition per listed portion` : 'Nutrition per listed portion'}</span></div>
    {filtered.length ? <div className="food-grid">{filtered.slice((currentPage - 1) * 24, currentPage * 24).map(food => {
      const portion = food.portions.find(portion => portion.id === food.defaultPortionId)!
      const n = nutrientsFor(food, portion.grams)
      return <article className="food-card" key={food.id}><button type="button" className="food-media-button" aria-label={`View ${food.name}`} onClick={event => { opener.current = event.currentTarget; setSelected(food) }}><div className={`food-card-art food-tone-${food.category.toLowerCase().replaceAll(' ', '-')}`}><FoodArt id={food.id} category={food.category} /></div></button><div className="food-card-body"><p className="food-kicker">{food.category} · {food.state}</p><h3>{food.name}</h3><div className="food-card-tags">{food.classifications.foodTypes.map(tag => <span key={tag}>{tag}</span>)}</div><p className="food-card-portion">{portion.label} · {portion.grams} g</p><div className="food-card-macros"><span><strong>{formatNutrient(n.energyKcal, 0)}</strong> kcal</span><span><strong>{formatNutrient(n.proteinG)}</strong> g protein</span></div><p className="food-card-benefit">{food.benefits[0].title}</p><button className="food-view-details" data-food-id={food.id} onClick={event => { opener.current = event.currentTarget; setSelected(food) }} aria-label={`View details for ${food.name}`}>View details <ArrowRight size={15} /></button></div></article>
    })}</div> : <div className="food-empty"><Utensils size={30} /><h3>No foods match these choices.</h3><p>Browse the library or clear a filter to find something different.</p><button className="food-primary" onClick={() => { clearFilters() }}>Browse all foods <ArrowRight size={15} /></button></div>}
    {filtered.length > 0 && <nav className="food-pagination" aria-label="Food pages"><button disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}><ArrowLeft size={15} />Previous</button><span>Page {currentPage} of {totalPages}</span><div className="food-page-numbers">{Array.from({ length: totalPages }, (_, index) => index + 1).map(number => <button key={number} aria-label={`Food page ${number}`} aria-current={number === currentPage ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>)}</div><button disabled={currentPage >= totalPages} onClick={() => changePage(currentPage + 1)}>Next<ArrowRight size={15} /></button></nav>}
    <p className="food-library-credit">100-food library · Nutrition from <a href="https://fdc.nal.usda.gov/download-datasets/" target="_blank" rel="noreferrer">USDA FoodData Central</a> · Values vary with preparation and product. Meal generation is not connected yet.</p>
    {selected && <FoodDetails key={selected.id} food={selected} onClose={close} />}
  </div>
}
