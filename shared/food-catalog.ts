import active from '../backend/data/foods.json'
import legacy from '../backend/data/foods-legacy.json'

// New selections use the active library. Saved entries keep their original IDs
// and nutrient/state records instead of being silently remapped.
export const activeFoodCatalog = active
const activeIds = new Set(active.map(food => food.id))
export const storedFoodCatalog = [...active, ...legacy.filter(food => !activeIds.has(food.id))]
