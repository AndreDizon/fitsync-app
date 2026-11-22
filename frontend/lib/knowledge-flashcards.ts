export type KnowledgeTopic = 'Workout' | 'Nutrition'
export const knowledgeLevels = ['Beginner', 'Intermediate', 'Advanced'] as const
export type KnowledgeLevel = typeof knowledgeLevels[number]
const adult = 'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html'
const intensity = 'https://www.cdc.gov/physical-activity-basics/measuring/index.html'
const serving = 'https://www.fda.gov/food/nutrition-facts-label/serving-size-nutrition-facts-label'
const calories = 'https://www.fda.gov/food/nutrition-facts-label/calories-nutrition-facts-label'
const sugars = 'https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label'
const dailyValue = 'https://www.fda.gov/food/nutrition-facts-label/lows-and-highs-percent-daily-value-nutrition-facts-label'
export type KnowledgeCard = { question: string; options: readonly [string, string, string, string]; correctIndex: number; explanation: string; source: string }
const card = (question: string, options: KnowledgeCard['options'], correctIndex: number, explanation: string, source: string): KnowledgeCard => ({ question, options, correctIndex, explanation, source })

// Five questions per level, 15 per topic. Difficulty describes question complexity.
export const knowledgeDecks: Record<KnowledgeTopic, Record<KnowledgeLevel, KnowledgeCard[]>> = {
  Workout: {
    Beginner: [
      card('Which everyday activity gets your body moving?', ['Sitting at a desk', 'Walking to the shop', 'Watching a workout video', 'Reading a training plan'], 1, 'Walking is physical activity.', adult),
      card('What does adult activity guidance include?', ['Aerobic activity only', 'Stretching only', 'Both aerobic and strength work', 'Strength work only'], 2, 'Both types support health.', adult),
      card('How can adults spread their weekly activity?', ['Only in one workout', 'Only on weekends', 'Only in hour-long blocks', 'Across several days'], 3, 'Smaller amounts can add up.', adult),
      card('Which statement about being active is correct?', ['Some activity is better than none', 'Short walks never count', 'Only gym workouts count', 'Activity must be competitive'], 0, 'Moving more offers benefits.', adult),
      card('Which is an example of aerobic activity?', ['Writing down sets', 'Brisk walking', 'Reading food labels', 'Sitting between meetings'], 1, 'Brisk walking raises breathing and heart rate.', intensity),
    ],
    Intermediate: [
      card('You can talk, but cannot sing during exercise. What intensity does this suggest?', ['Resting', 'Maximal', 'Moderate', 'Vigorous'], 2, 'This is the moderate talk-test cue.', intensity),
      card('What is the minimum weekly moderate aerobic target in adult guidance?', ['60 minutes', '90 minutes', '300 minutes', '150 minutes'], 3, 'An alternative is 75 vigorous minutes.', adult),
      card('How often does adult guidance recommend muscle strengthening?', ['At least 2 days a week', 'Once a month', 'Only after reaching a goal weight', 'Every hour'], 0, 'Include all major muscle groups.', adult),
      card('Which muscle groups should adult strength work cover?', ['Only arms', 'All major muscle groups', 'Only the strongest muscles', 'Only legs'], 1, 'A balanced routine includes the whole body.', adult),
      card('You can say only a few words before pausing for breath. What intensity does this suggest?', ['Light', 'Resting', 'Vigorous', 'Always moderate'], 2, 'Vigorous effort makes conversation harder.', intensity),
    ],
    Advanced: [
      card('Why can the same activity feel harder for one person than another?', ['Relative effort is identical for everyone', 'Only exercise duration matters', 'Exercise names determine effort', 'Relative effort depends on fitness'], 3, 'Fitness changes the effort required.', intensity),
      card('What does one MET represent?', ['Energy use while sitting quietly', 'Maximum heart rate', 'One repetition', 'A fixed calorie amount for everyone'], 0, 'METs compare activity energy use with rest.', intensity),
      card('Which absolute MET range is moderate intensity?', ['Below 1 MET', '3 to 5.9 METs', '6 to 9 METs', '10 METs or above'], 1, 'Six METs and above is vigorous.', intensity),
      card('How would 50 moderate minutes plus 50 vigorous minutes compare with the adult aerobic minimum?', ['Below it', 'Only moderate minutes count', 'Equivalent to 150 moderate minutes', 'Equivalent to 50 moderate minutes'], 2, 'Vigorous minutes count roughly double.', adult),
      card('On a 0–10 effort scale, which range describes relatively moderate activity?', ['0–1', '2–3', '9–10', '5–6'], 3, 'Relative vigorous effort starts around 7–8.', intensity),
    ],
  },
  Nutrition: {
    Beginner: [
      card('What should you check first on a Nutrition Facts label?', ['Package colour', 'Serving size and servings per container', 'Brand popularity', 'Price only'], 1, 'Most values are per serving.', serving),
      card('What does the labelled serving size describe?', ['A personal meal prescription', 'A maximum daily limit', 'An amount people typically consume', 'The amount everyone must eat'], 2, 'It is not an intake recommendation.', serving),
      card('What do calories on a food label measure?', ['Food weight', 'Protein only', 'Water content', 'Energy from the food'], 3, 'Calories describe energy per labelled amount.', calories),
      card('Which statement about total sugars is correct?', ['It includes naturally present and added sugars', 'It means only added sugars', 'It excludes sugars in fruit', 'It is always zero in milk'], 0, 'Added sugars are part of total sugars.', sugars),
      card('Where do you find how many servings a package contains?', ['The barcode', 'Servings per container', 'The use-by date', 'The brand logo'], 1, 'A package may contain multiple servings.', serving),
    ],
    Intermediate: [
      card('A serving contains 200 kcal. How much energy is in two servings?', ['100 kcal', '200 kcal', '400 kcal', '600 kcal'], 2, 'Multiply calories by servings eaten.', calories),
      card('What does 5% Daily Value or less mean on a U.S. label?', ['High', 'Exactly your daily need', 'No nutrients', 'Low'], 3, 'This is the low %DV guide.', dailyValue),
      card('What does 20% Daily Value or more mean?', ['High', 'Low', 'Zero calories', 'One fifth of the package'], 0, 'This is the high %DV guide.', dailyValue),
      card('A package contains three servings of 120 kcal each. What is the whole-package energy?', ['120 kcal', '360 kcal', '240 kcal', '40 kcal'], 1, 'Three times 120 is 360.', calories),
      card('A serving has 6 g protein. How much is in 1.5 servings?', ['4 g', '6 g', '9 g', '12 g'], 2, 'Scale nutrients by the portion eaten.', serving),
    ],
    Advanced: [
      card('A label lists 8 g total sugars, including 3 g added sugars. What is the total?', ['3 g', '5 g', '11 g', '8 g'], 3, 'Do not count added sugars twice.', sugars),
      card('One serving has 10% DV sodium. What do two servings provide?', ['20% DV', '5% DV', '10% DV', '100% DV'], 0, 'Double the serving, double the contribution.', dailyValue),
      card('What does the 2,000-calorie reference on U.S. labels mean?', ['Everyone must eat exactly 2,000 kcal', 'A general reference; personal needs vary', 'A maximum for all athletes', 'Calories per package'], 1, 'It is not a personal target.', calories),
      card('Two similar foods list different serving sizes. How should you compare their nutrients?', ['Choose the smaller printed number', 'Ignore serving sizes', 'Compare equivalent amounts', 'Compare package colours'], 2, 'Use the same amount for a fair comparison.', dailyValue),
      card('A serving is 40 g and provides 160 kcal. How much energy is in 60 g?', ['160 kcal', '80 kcal', '320 kcal', '240 kcal'], 3, '60 g is 1.5 servings.', calories),
    ],
  },
}
