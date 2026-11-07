import { expansionRows } from './food-expansion.mjs'

export function expandedFoodMetadata(source) {
  return expansionRows.map(row => {
    const record = source.records.find(record => record.fdc_id === row.fdcId)
    if (!record) throw new Error(`Missing USDA food ${row.fdcId}`)
    const id = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/g, '')
    const plant = !['Protein foods', 'Dairy'].includes(row.category) && row.name !== 'Unsalted butter'
    const bread = row.name.includes('bread')
    const vegan = plant && !bread
    const vegetarian = plant || row.category === 'Dairy' || row.name === 'Unsalted butter' || row.foodTypes.includes('Eggs')
    const pescatarian = vegetarian || row.foodTypes.some(type => ['Fish', 'Shellfish'].includes(type))
    const halal = row.foodTypes.includes('Pork') ? 'not-compatible' : !plant || bread || row.name === 'Tempeh' ? 'requires-verification' : 'ingredient-compatible'
    const portions = record.portions.filter(portion => portion.grams > 0 && portion.grams <= 1000 && portion.amount > 0)
    const preferred = row.category === 'Oils & fats' ? portions.find(portion => /tbsp|tablespoon|pat/i.test(portion.label)) : row.category === 'Nuts & seeds' ? portions.find(portion => /oz|tbsp/i.test(portion.label)) : portions.find(portion => /cup|medium|slice|large|fillet/i.test(portion.label))
    const chosen = [...new Map([preferred, ...portions].filter(Boolean).slice(0, 3).map(portion => [portion.id, portion])).values()]
    const n = record.nutrients
    const groups = [row.category]
    if (row.category === 'Legumes' || row.category === 'Dairy' && row.foodTypes.some(type => ['Cheese', 'Cultured dairy'].includes(type))) groups.push('Protein foods')
    const benefits = [{ title: `${row.foodTypes[0]} variety`, text: `${row.name} can add variety to ${row.mealUses.map(meal => meal.toLowerCase()).join(', ')}. Its role depends on the portion and the rest of your meal.`, source: null }]
    if (row.category === 'Protein foods' || groups.includes('Protein foods')) benefits.push({ title: 'Protein contribution', text: `The reference food provides ${n['1003']} g protein per 100 g edible weight. See the portion panel for your chosen amount.`, source: null })
    else if (row.category === 'Oils & fats') benefits.push({ title: 'Concentrated cooking ingredient', text: `The reference food provides ${n['1004']} g fat per 100 g. Small measured additions contribute to the meal total; it is not a stand-alone meal.`, source: null })
    else if (n['1079'] > 0) benefits.push({ title: 'Fiber contribution', text: `The reference food provides ${n['1079']} g dietary fiber per 100 g. Your chosen portion determines the contribution to your day.`, source: null })
    else benefits.push({ title: 'Measured energy', text: `The reference food provides ${n['1008']} kcal per 100 g edible weight. The portion panel scales this amount for your meal.`, source: null })
    const pairings = row.category === 'Oils & fats' ? ['Vegetables', 'Cooked grains'] : row.category === 'Fruits' || row.category === 'Nuts & seeds' || row.category === 'Dairy' ? ['Oats', 'Fruit or a suitable yogurt'] : row.category === 'Vegetables' ? ['Grains or tubers', 'A suitable protein food'] : ['Vegetables', 'A complementary protein or grain']
    return {
      id, fdcId: row.fdcId, name: row.name, aliases: row.aliases, category: row.category, state: row.state,
      description: `${record.description}. ${row.note}`, defaultPortionId: preferred?.id ?? '100g', portionIds: chosen.map(portion => portion.id),
      allergens: row.allergens, vegan, vegetarian, pescatarian, halal, prepMinutes: row.prepMinutes,
      budget: ['Protein foods', 'Dairy', 'Nuts & seeds', 'Oils & fats'].includes(row.category) ? 'Moderate' : 'Budget-friendly', benefits,
      preparation: [row.note, `Measure only the edible ${row.state.toLowerCase()} portion matching this record; exclude inedible shells, stones or bones.`, row.category === 'Oils & fats' ? 'Include only the amount used in your own portion; divide shared recipe quantities appropriately.' : 'Account for added sauces, oils, sugar and other recipe ingredients separately.'],
      measureNote: chosen.length ? `USDA household references: ${chosen.map(portion => `${portion.amount} ${portion.label} = ${portion.grams} g`).join('; ')}. Actual sizes vary; use edible gram weight when possible.` : 'No household measure is supplied for this selected record. Use edible gram weight; 100 g is the reference portion.',
      pairing: pairings, productNote: `${bread ? 'Bread recipes may contain additional milk, eggs, soy, seeds or animal ingredients. Vegan suitability is not assumed. ' : ''}${row.foodTypes.includes('Barley') ? 'Barley contains gluten; this is not a gluten-free food. ' : ''}Generic source values and ingredient tags do not verify the actual product. Check labels for allergens, fortification, dietary requirements and preparation differences.`,
      classifications: { groups, foodTypes: row.foodTypes, preparation: [row.prep], mealUses: row.mealUses },
    }
  })
}
