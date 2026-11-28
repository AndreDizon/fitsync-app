import { readFileSync } from 'node:fs'
import { foodArtwork } from './food-artwork.mjs'

export const philippineFoodRows = JSON.parse(readFileSync(new URL('./philippine-food-catalog.json', import.meta.url), 'utf8'))

export function philippineFoodMetadata(source) {
  return philippineFoodRows.map(row => {
    const record = source.records.find(record => record.fdc_id === row.fdcId)
    if (!record) throw new Error(`Missing USDA food ${row.fdcId}`)
    const portions = record.portions.filter(p => p.grams > 0 && p.grams <= 1000 && p.amount > 0)
    const preferred = portions.find(p => /cup|medium|slice|large|fillet/i.test(p.label))
    const chosen = [...new Map([preferred, ...portions].filter(Boolean).slice(0, 3).map(p => [p.id, p])).values()]
    const groups = [row.category]
    if (row.category === 'Legumes') groups.push('Protein foods')
    const note = row.referenceNote || 'Use the exact variety and preparation in the USDA source description.'
    return {
      ...row,
      artwork: foodArtwork(row.name),
      description: `${record.description}. ${note}`,
      defaultPortionId: preferred?.id ?? '100g', portionIds: chosen.map(p => p.id),
      budget: row.budget || 'Moderate',
      benefits: [
        { title: 'Food variety', text: 'Combine suitable foods from different groups across your meals. Dish examples are serving ideas, with additional ingredients counted separately.', source: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
        row.classifications?.groups?.includes('Protein foods') || groups.includes('Protein foods')
          ? { title: 'Protein contribution', text: `This reference provides ${record.nutrients['1003']} g protein per 100 g edible weight. Your portion determines its contribution.`, source: 'https://ods.od.nih.gov/factsheets/ExerciseandAthleticPerformance-Consumer/' }
          : { title: 'Measured portion', text: `This reference provides ${record.nutrients['1008']} kcal per 100 g edible weight. Match the source food state before weighing.`, source: 'https://fdc.nal.usda.gov/data-documentation.html' },
      ],
      preparation: [note, `Weigh the edible ${row.state.toLowerCase()} portion matching this record; exclude inedible bones, shells, peel and stones.`, 'Cook foods that require cooking before eating. Account for sauces, oil, coconut milk, sugar and all other recipe ingredients separately.'],
      measureNote: chosen.length ? `USDA household references: ${chosen.map(p => `${p.amount} ${p.label} = ${p.grams} g`).join('; ')}. Actual sizes vary; use edible gram weight when possible.` : 'No household measure is supplied for this reference. Use edible gram weight; 100 g is the reference amount.',
      pairing: row.category === 'Fruits' ? ['A suitable breakfast or dessert course', 'Other fruit'] : row.category === 'Vegetables' ? ['Rice or another staple', 'A suitable protein food'] : ['Vegetables', 'A complementary staple or protein food'],
      productNote: 'Generic nutrient records do not verify the actual product, local species, recipe or dietary certification. Check ingredients and preparation. Dish examples may contain allergens or animal products beyond this ingredient.',
      classifications: { groups, foodTypes: row.foodTypes, preparation: [row.method], mealUses: row.category === 'Fruits' || row.category === 'Nuts & seeds' || row.category === 'Grains' ? ['Breakfast', 'Lunch', 'Dinner', 'Snack'] : ['Lunch', 'Dinner'] },
    }
  })
}
