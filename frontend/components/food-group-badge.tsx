export const foodGroupTone = (group: string) => ({
  Grains: 'grains', 'Protein foods': 'protein', Legumes: 'legumes',
  Fruits: 'fruits', Vegetables: 'vegetables', 'Nuts & seeds': 'nuts',
  'Roots & tubers': 'roots', Dairy: 'dairy', 'Oils & fats': 'oils',
})[group] || 'neutral'

export function FoodGroupBadge({ group }: { group: string }) {
  return <span className="food-group-badge" data-food-group={foodGroupTone(group)}>{group}</span>
}
