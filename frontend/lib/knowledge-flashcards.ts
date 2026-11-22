export type KnowledgeTopic = 'Workout' | 'Nutrition'
export const knowledgeLevels = ['Beginner', 'Intermediate', 'Advanced'] as const
export type KnowledgeLevel = typeof knowledgeLevels[number]
const adult = 'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html'
const intensity = 'https://www.cdc.gov/physical-activity-basics/measuring/index.html'
const label = 'https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label'
type Card = { question: string; answer: string; explanation: string; source: string }
const card = (question: string, answer: string, explanation: string, source: string): Card => ({ question, answer, explanation, source })

// Difficulty describes the question, not the user's fitness or nutritional needs.
export const knowledgeDecks: Record<KnowledgeTopic, Record<KnowledgeLevel, Card[]>> = {
  Workout: {
    Beginner: [
      card('Does a short walk count as physical activity?', 'Yes.', 'Movement counts; some activity is better than none.', adult),
      card('Do adults need strength work as well as aerobic activity?', 'Yes, both.', 'Adult guidance includes muscle strengthening on at least two days weekly.', adult),
      card('Must adults do their weekly activity in one long workout?', 'No.', 'Activity can be spread through the week in smaller amounts.', adult),
    ],
    Intermediate: [
      card('You can talk, but cannot sing while exercising. What intensity does this suggest?', 'Moderate intensity.', 'The talk test is a practical guide to aerobic effort.', intensity),
      card('What is the weekly moderate-intensity aerobic target for adults?', 'At least 150 minutes.', 'Alternatively, 75 vigorous minutes or an equivalent mix meets the aerobic recommendation.', adult),
      card('Should strength work focus on just one muscle group?', 'No. Include all major muscle groups.', 'Adult guidance covers the legs, hips, back, abdomen, chest, shoulders and arms.', adult),
    ],
    Advanced: [
      card('Can the same activity feel moderate for one person and vigorous for another?', 'Yes.', 'Relative intensity depends on the person’s fitness.', intensity),
      card('What does a MET describe?', 'Energy use relative to sitting quietly.', 'One MET represents resting energy use.', intensity),
      card('In absolute intensity terms, how are 3–5.9 METs classified?', 'Moderate intensity.', 'Six METs and above is vigorous. Relative effort can still differ.', intensity),
    ],
  },
  Nutrition: {
    Beginner: [
      card('Where should you start when reading a Nutrition Facts label?', 'The serving size.', 'Nutrients and calories usually refer to one serving.', label),
      card('Is a label’s serving size a recommendation of how much you should eat?', 'No.', 'It describes an amount people typically consume.', label),
      card('Does “total sugars” include added sugars?', 'Yes.', 'It includes naturally present and added sugars.', label),
    ],
    Intermediate: [
      card('A serving has 200 kcal. You eat two servings. How many calories is that?', '400 kcal.', 'Multiply per-serving values by servings eaten.', label),
      card('Is 5% Daily Value considered low or high?', 'Low.', 'On U.S. labels, 5% DV or less is low.', label),
      card('Is 20% Daily Value considered low or high?', 'High.', '20% DV or more is high.', label),
    ],
    Advanced: [
      card('A label lists 8 g total sugar, including 3 g added sugar. Should you add them to get 11 g?', 'No. Total sugar is 8 g.', 'Added sugar is already included in the total.', label),
      card('A serving provides 10% DV sodium. What do two servings provide?', '20% DV.', 'Double the serving, double its nutrient contribution.', label),
      card('Is the 2,000-calorie label reference everyone’s exact daily requirement?', 'No.', 'Individual calorie needs vary.', label),
    ],
  },
}
