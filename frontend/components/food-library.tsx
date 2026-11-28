'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Search, Utensils, X } from 'lucide-react'
import { foods, foodGroups, formatNutrient, nutrientsFor, type Food } from '@/lib/nutrition'
import { OfflineLibraryStatus } from './offline-library-status'
import { FoodArt } from './food-art'
import { FoodDetails } from './food-details'
import { FoodGroupBadge, foodGroupTone } from './food-group-badge'
import { LearningArticles } from './learning-articles'
import { HealthReference } from './health-reference'
import '@/app/food-library.css'
import '@/app/library-workspace.css'
import { queryFoodCatalog, type FoodFacet } from '@/lib/food-query'

export { FoodDetails } from './food-details'

export function FoodLibrary() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('relevance')
  const [page, setPage] = useState(1)
  const results = useRef<HTMLDivElement>(null)
  const [category, setCategory] = useState('')
  const [diet, setDiet] = useState('')
  const [foodType, setFoodType] = useState('')
  const [preparation, setPreparation] = useState('')
  const [meal, setMeal] = useState('')
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([])
  const clearFilters = () => { setQuery(''); setCategory(''); setDiet(''); setFoodType(''); setPreparation(''); setMeal(''); setExcludedAllergens([]); setSort('relevance'); setPage(1) }
  useEffect(() => setPage(1), [query, category, diet, foodType, preparation, meal, excludedAllergens, sort])
  const [selected, setSelected] = useState<Food | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const categories = foodGroups
  const availableAllergens = [...new Set(foods.flatMap(food => food.allergens))].sort()
  const catalog = queryFoodCatalog(foods, { query, group: category, diet, type: foodType, preparation, meal, excludedAllergens, sort })
  const filtered = catalog.data
  const classificationOptions = (key: 'foodTypes' | 'preparation' | 'mealUses') => catalog.facets[key === 'foodTypes' ? 'type' : key === 'mealUses' ? 'meal' : key]
  const dietOptions = [['vegan', 'Vegan ingredients'], ['vegetarian', 'Vegetarian ingredients'], ['pescatarian', 'Pescatarian ingredients'], ['halal', 'Halal-compatible ingredients (not certified)']]
  const activeFilters = [
    ...(query.trim() ? [{ key: 'query', label: `Search: ${query.trim()}`, clear: () => setQuery('') }] : []),
    ...([{ key: 'group', value: category, clear: () => setCategory('') }, { key: 'diet', value: diet, clear: () => setDiet('') }, { key: 'type', value: foodType, clear: () => setFoodType('') }, { key: 'preparation', value: preparation, clear: () => setPreparation('') }, { key: 'meal', value: meal, clear: () => setMeal('') }].filter(item => item.value).map(item => ({ key: item.key, label: item.key === 'diet' ? dietOptions.find(([key]) => key === item.value)?.[1] ?? item.value : item.value, clear: item.clear }))),
    ...excludedAllergens.map(value => ({ key: 'allergen-' + value, label: 'Exclude ' + value, clear: () => setExcludedAllergens(values => values.filter(item => item !== value)) })),
  ]
  const totalPages = Math.max(1, Math.ceil(filtered.length / 24))
  const currentPage = Math.min(page, totalPages)
  const changePage = (next: number) => { setPage(next); results.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }
  const close = () => { setSelected(null); requestAnimationFrame(() => (opener.current?.isConnected ? opener.current : search.current)?.focus()) }
  return <div className="food-library">
    <header className="food-library-heading plan-tab-page-heading sync-status-heading"><div><p className="food-kicker">YOUR NUTRITION LIBRARY</p><h2>Browse foods & nutrition articles</h2><p>Explore 100 foods common in Filipino meals, with nutrient references, six dish ideas each and articles on balanced eating.</p></div><OfflineLibraryStatus catalog="food" compact /></header>
    <LearningArticles/>
    <HealthReference title="Understand portions, preparation & food data" sources={['diet', 'foodData']}>
      <p>Cards show nutrition for the listed edible portion. Open a food to change the amount or compare per 100 g. Match raw or cooked weights to the food state shown.</p>
      <p>Use food groups to build variety, not a list of good or bad foods. A balanced eating pattern includes vegetables, fruit, starchy foods, protein sources and suitable fats; individual needs differ.</p>
      <p>Nutrition comes from USDA FoodData Central SR Legacy. FitSync adds preparation guidance and classifications. Missing nutrients stay marked Not reported; generic records cannot replace a product label or an individual nutrition assessment.</p>
    </HealthReference>
    <section className="food-filters" aria-label="Find foods"><div className="food-search-row"><label className="food-search"><Search size={19} /><input ref={search} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search rice, tofu, munggo…" aria-label="Search foods" />{query && <button aria-label="Clear food search" onClick={() => setQuery('')}><X size={16} /></button>}</label><label className="food-diet-filter">Eating preference<select value={diet} onChange={event => setDiet(event.target.value)}><option value="">All foods</option>{dietOptions.map(([value, label]) => <option key={value} value={value} disabled={!catalog.facetCounts.diet[value] && diet !== value}>{label} ({catalog.facetCounts.diet[value]})</option>)}</select></label><label className="food-sort-filter">Sort foods<select aria-label="Sort foods" value={sort} onChange={event => setSort(event.target.value)}><option value="relevance">Best match</option><option value="name">Name: A–Z</option><option value="name-desc">Name: Z–A</option><option value="protein">Protein / 100 g: high–low</option><option value="energy">Energy / 100 g: low–high</option><option value="prep">Quickest preparation</option></select></label></div><div className="food-category-filters" role="group" aria-label="Food categories">{['', ...categories].map(item => <button key={item} data-food-group={foodGroupTone(item)} aria-pressed={category === item} disabled={!!item && !catalog.facetCounts.group[item] && category !== item} onClick={() => setCategory(item)}>{item || 'All foods'}<small>{item ? catalog.facetCounts.group[item] ?? 0 : catalog.groupTotal}</small></button>)}</div><p className="food-group-hint">Counts reflect your search and other filters. Foods may belong to more than one group.</p><details className="food-more-filters"><summary>More filters{foodType || preparation || meal || excludedAllergens.length ? ' - Filters active' : ''}</summary><div className="food-classification-filters">{([
      ['Food type', foodType, setFoodType, classificationOptions('foodTypes')], ['Preparation method', preparation, setPreparation, classificationOptions('preparation')], ['Meal use', meal, setMeal, classificationOptions('mealUses')],
    ] as const).map(([label, value, setter, options]) => <label key={label}>{label}<select aria-label={label} value={value} onChange={event => setter(event.target.value)}><option value="">All options</option>{options.map(option => { const key: FoodFacet = label === 'Food type' ? 'type' : label === 'Preparation method' ? 'preparation' : 'meal'; const count = catalog.facetCounts[key][option] ?? 0; return <option key={option} value={option} disabled={!count && value !== option}>{option} ({count})</option> })}</select></label>)}</div><fieldset className="food-allergen-filters"><legend>Exclude listed ingredient allergens</legend>{availableAllergens.map(allergen => <label key={allergen}><input type="checkbox" checked={excludedAllergens.includes(allergen)} onChange={() => setExcludedAllergens(values => values.includes(allergen) ? values.filter(value => value !== allergen) : [...values, allergen])} />{allergen}</label>)}<p>Hides matching ingredient flags only. Cross-contact and other allergies still require individual review.</p></fieldset></details>{activeFilters.length > 0 && <div className="food-active-filters" aria-label="Active food filters">{activeFilters.map(item => <button key={item.key} onClick={item.clear} aria-label={"Remove " + item.label + " filter"}>{item.label}<X size={13} aria-hidden="true" /></button>)}<button className="food-clear-filters" onClick={clearFilters}>Clear all</button></div>}</section>
    <div className="food-results-heading" ref={results}><span role="status">{filtered.length} {filtered.length === 1 ? 'food' : 'foods'} to explore</span><span>{filtered.length ? `Showing ${(currentPage - 1) * 24 + 1}-${Math.min(currentPage * 24, filtered.length)} - Nutrition per listed portion` : 'Nutrition per listed portion'}</span></div>
    {filtered.length ? <div className="food-grid">{filtered.slice((currentPage - 1) * 24, currentPage * 24).map(food => {
      const portion = food.portions.find(portion => portion.id === food.defaultPortionId)!
      const n = nutrientsFor(food, portion.grams)
      return <article className="food-card" key={food.id}><button type="button" className="food-media-button" aria-label={`View ${food.name}`} onClick={event => { opener.current = event.currentTarget; setSelected(food) }}><div className={`food-card-art food-tone-${food.category.toLowerCase().replaceAll(' ', '-')}`}><FoodArt id={food.id} category={food.category} /></div></button><div className="food-card-body"><div className="food-card-meta"><FoodGroupBadge group={food.category} /><span className="fd-state">{food.state}</span></div><h3>{food.name}</h3><div className="food-card-tags">{food.classifications.foodTypes.filter(tag => !food.classifications.groups.includes(tag)).map(tag => <span key={tag}>{tag}</span>)}</div><p className="food-card-portion">{portion.label} · {portion.grams} g</p><div className="food-card-macros"><span><strong>{formatNutrient(n.energyKcal, 0)}</strong> kcal</span><span><strong>{formatNutrient(n.proteinG)}</strong> g protein</span></div><button className="food-view-details" data-food-id={food.id} onClick={event => { opener.current = event.currentTarget; setSelected(food) }} aria-label={`View details for ${food.name}`}>View details <ArrowRight size={15} /></button></div></article>
    })}</div> : <div className="food-empty"><Utensils size={30} /><h3>No foods match these choices.</h3><p>Browse the library or clear a filter to find something different.</p><button className="food-primary" onClick={() => { clearFilters() }}>Browse all foods <ArrowRight size={15} /></button></div>}
    {filtered.length > 0 && <nav className="food-pagination" aria-label="Food pages"><button disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}><ArrowLeft size={15} />Previous</button><span>Page {currentPage} of {totalPages}</span><div className="food-page-numbers">{Array.from({ length: totalPages }, (_, index) => index + 1).map(number => <button key={number} aria-label={`Food page ${number}`} aria-current={number === currentPage ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>)}</div><button disabled={currentPage >= totalPages} onClick={() => changePage(currentPage + 1)}>Next<ArrowRight size={15} /></button></nav>}
    <p className="food-library-credit">100-food library · Nutrition from <a href="https://fdc.nal.usda.gov/download-datasets/" target="_blank" rel="noreferrer">USDA FoodData Central</a> · Values vary with preparation and product. Use My Plan to schedule foods or create a food playlist.</p>
    {selected && <FoodDetails key={selected.id} food={selected} onClose={close} />}
  </div>
}
