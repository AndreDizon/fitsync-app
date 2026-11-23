export type KnowledgeTopic = 'Workout' | 'Nutrition'
export const knowledgeLevels = ['Beginner', 'Intermediate', 'Advanced'] as const
export type KnowledgeLevel = typeof knowledgeLevels[number]
const adult = 'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html'
const starting = 'https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html'
const barriers = 'https://www.cdc.gov/physical-activity-basics/overcoming-barriers/index.html'
const intensity = 'https://www.cdc.gov/physical-activity-basics/measuring/index.html'
const strength = 'https://www.nhs.uk/live-well/exercise/strength-exercises/'
const warmup = 'https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/'
const resistance = 'https://acsm.org/resistance-training-guidelines-update-2026/'
const meals = 'https://www.cdc.gov/healthy-weight-growth/healthy-eating/meals-snacks.html'
const produce = 'https://www.cdc.gov/healthy-weight-growth/healthy-eating/fruits-vegetables.html'
const budget = 'https://www.cdc.gov/diabetes/healthy-eating/6-tips-eating-healthy-on-budget.html'
const diet = 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'
const label = 'https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label'
const sourceNames: Record<string, string> = { 'www.cdc.gov': 'CDC', 'www.nhs.uk': 'NHS', 'acsm.org': 'ACSM', 'www.who.int': 'WHO', 'www.fda.gov': 'FDA' }
export type KnowledgeCard = { question: string; options: readonly [string, string, string, string]; correctIndex: number; explanation: string; source: string; sourceName: string }
const card = (question: string, options: KnowledgeCard['options'], correctIndex: number, explanation: string, source: string): KnowledgeCard => ({ question, options, correctIndex, explanation, source, sourceName: sourceNames[new URL(source).hostname] })

// Five real-life decisions per level, 15 per topic. Levels describe question complexity.
// Advice is general education; no personal calorie, weight-loss or rehabilitation targets.
export const knowledgeDecks: Record<KnowledgeTopic, Record<KnowledgeLevel, KnowledgeCard[]>> = {
  Workout: {
    Beginner: [
      card('You have only 10 minutes free today. What is a useful way to stay active?', ['Skip activity until you have a full hour', 'Take a manageable walk during the break', 'Make tomorrow’s workout twice as hard', 'Spend the break choosing new equipment'], 1, 'Short activity breaks count. Use the time you have.', barriers),
      card('You are returning to exercise after months of inactivity. How should you begin?', ['Resume your hardest old workout', 'Train as long as your most active friend', 'Start with manageable activity and build up gradually', 'Increase speed and duration together every day'], 2, 'Build from your current ability rather than your old routine.', starting),
      card('Before your workout, what is a sensible first step?', ['Start with your hardest exercise', 'Use the first heavy set as the warm-up', 'Skip preparation if you are short on time', 'Warm up with easier movements before harder exercise'], 3, 'Prepare with gentle movement before increasing effort.', warmup),
      card('A movement causes sharp pain. What should you do?', ['Stop that exercise and get advice if pain persists or concerns you', 'Finish the set before deciding', 'Add weight to test the movement', 'Repeat it faster to get it over with'], 0, 'Stop painful exercise. Persistent or concerning symptoms need professional advice.', warmup),
      card('You cannot afford gym equipment. How can you start building strength?', ['Wait until you can buy a full set of weights', 'Try suitable bodyweight or resistance-band exercises', 'Replace all strength work with stretching', 'Copy advanced lifts using heavy household objects'], 1, 'Strength training can work at home with simple equipment.', resistance),
    ],
    Intermediate: [
      card('You want a moderate-paced walk, but can only speak a few words before catching your breath. What should you adjust?', ['Speed up to finish sooner', 'Keep the pace because distance matters most', 'Slow down until you can talk comfortably', 'Match the fastest person nearby'], 2, 'For moderate aerobic effort, you can talk but not sing.', intensity),
      card('Work keeps pushing your workouts aside. Which change is most likely to help you fit them in?', ['Leave every workout time undecided', 'Save all exercise for one perfect day', 'Choose a longer routine with more exercises', 'Put realistic activity slots in your calendar'], 3, 'A planned time makes activity part of your routine.', barriers),
      card('Rain cancels your usual outdoor walk. What is a practical backup?', ['Use a suitable indoor walking or exercise option', 'Give up on activity for the whole week', 'Move to a slippery outdoor route', 'Do a much harder workout to compensate'], 0, 'Keep an indoor alternative for weather disruptions.', barriers),
      card('Your usual strength repetitions feel manageable with controlled technique. How can you progress?', ['Double the repetitions immediately', 'Increase the challenge gradually', 'Rush the repetitions to fit in more', 'Change every exercise and weight at once'], 1, 'Progress in small steps rather than sudden jumps.', strength),
      card('Your adult weekly routine trains only chest and arms. What would make it more balanced?', ['Add more sets only for your favourite muscles', 'Replace all strength work with cardio', 'Include exercises for the other major muscle groups', 'Make every arm session longer'], 2, 'Include legs, hips, back, abdomen and shoulders too.', adult),
    ],
    Advanced: [
      card('A healthy adult thinks every strength set must end with a failed repetition. What is the better general approach?', ['Take every set to failure regardless of the exercise', 'Count only sets that need a partner’s help to finish', 'Avoid strength training unless failure is the goal', 'Use an appropriate challenge; failure on every set is not required'], 3, 'ACSM does not require failure training for general adult results.', resistance),
      card('As a healthy adult, you can sustain two strength days, but keep missing a complicated six-day plan. What is the more useful starting plan?', ['Two manageable sessions covering the major muscle groups', 'Keep the six-day plan even if most days are missed', 'Wait for a month with no commitments', 'Cram six hard sessions into one day'], 0, 'A consistent, achievable routine is a better foundation.', resistance),
      card('Your gym has machines and free weights. How should a healthy adult choose between them?', ['Use free weights only because machines never build strength', 'Choose suitable exercises you can perform safely and consistently', 'Use machines only because free weights never work', 'Select equipment only by how difficult it looks'], 1, 'Equipment can vary; fit the routine to your goals and ability.', resistance),
      card('Your friend finds a jogging pace easy, but you find it very hard. What should guide your pace?', ['Their usual speed', 'The speed shown in a social media workout', 'Your own breathing and relative effort', 'A rule that partners must use the same pace'], 2, 'The same activity can demand different effort from different people.', intensity),
      card('You want to increase activity after a steady few weeks. Which progression is more sensible?', ['Double the time and intensity on the same day', 'Replace every easy activity with a hard session', 'Ignore how demanding the current routine feels', 'Add a manageable amount and build up over time'], 3, 'Increase activity gradually from what you can currently manage.', starting),
    ],
  },
  Nutrition: {
    Beginner: [
      card('You are putting together rice for lunch. Which addition gives the meal more variety?', ['More rice and a sweet drink', 'Beans or eggs plus vegetables', 'Only a salty sauce', 'A larger plate with the same food'], 1, 'Combine different food groups, including protein foods and vegetables.', diet),
      card('You want to reduce added sugar in your usual lunch drink. Which swap helps?', ['A larger serving of the same sweet drink', 'A different sweet drink with similar sugar', 'Plain water instead of the sweet drink', 'Two small sweet drinks instead of one'], 2, 'Replacing a sugary drink removes that source of added sugar.', produce),
      card('Fresh vegetables are unavailable this week. Which is a useful alternative?', ['Leave vegetables out until fresh ones return', 'Use vegetable-flavoured chips instead', 'Choose fruit syrup as a substitute', 'Choose plain frozen or suitable canned vegetables'], 3, 'Frozen and canned produce can be nutritious options.', meals),
      card('You want more fibre in your usual breakfast. Which swap helps?', ['Choose oats or whole-grain bread instead of a refined-grain option', 'Replace breakfast with juice only', 'Choose bread only by its colour', 'Remove all grain foods'], 0, 'Whole grains are a useful source of dietary fibre.', diet),
      card('You often buy snacks in a rush. What can make a nutritious choice easier?', ['Rely on whatever is closest when hungry', 'Pack fruit and a suitable unsweetened yogurt ahead of time', 'Buy snacks only in the largest packs', 'Choose snacks only by the front-of-pack slogan'], 1, 'Keep convenient, nutritious snacks ready.', meals),
    ],
    Intermediate: [
      card('You eat a whole packet with two servings, each listed as 180 kcal. What should your food log record?', ['180 kcal because it is one packet', '90 kcal because there are two servings', '360 kcal for the amount eaten', 'Only the calories printed on the front'], 2, 'Check servings per container and record the portion you ate.', label),
      card('You want a lower-sodium canned soup. How should you compare two similar options?', ['Compare the pictures on the cans', 'Choose whichever can is smaller', 'Look only at the calorie number', 'Compare sodium for the same amount of soup'], 3, 'Use equivalent amounts so the comparison is fair.', label),
      card('A restaurant meal is larger than you want to eat now. What is a practical option?', ['Set some aside to take home', 'Finish it only because it was served', 'Skip vegetables to finish the rest', 'Order another side to balance its size'], 0, 'You can split a large meal or set part aside.', meals),
      card('You want varied meals on a tight grocery budget. Which plan helps?', ['Buy different ingredients for every dish without a list', 'Plan meals that reuse ingredients and shop with a list', 'Buy only expensive foods labelled “fitness”', 'Avoid all frozen and canned options'], 1, 'Planning and shared ingredients can stretch your budget.', budget),
      card('You want a fruit snack with more fibre. Which choice usually fits better?', ['A fruit-flavoured drink', 'Strained fruit juice', 'A piece of whole fruit', 'A sweet drink with a fruit picture'], 2, 'Whole fruit retains fibre that many juices lack.', produce),
    ],
    Advanced: [
      card('Cereal A lists fibre per 30 g, while cereal B lists it per 60 g. How can you compare them fairly?', ['Pick the larger printed fibre number', 'Assume the smaller serving is healthier', 'Compare only their package sizes', 'Convert the fibre values to the same weight'], 3, 'Different serving sizes can hide differences between products.', label),
      card('A snack is marketed as “high protein.” What else should guide your choice?', ['Its portion, other nutrients and how it fits your meals', 'The protein claim alone', 'Whether the packaging shows an athlete', 'Whether it costs more than other snacks'], 0, 'Look at the full label, not a single nutrient claim.', label),
      card('Your training partner uses a 2,000-kcal target. Should you copy it automatically?', ['Yes, because all adults need the same amount', 'No; energy needs vary with age, body size and activity', 'Yes, if you train at the same gym', 'No; everyone must use exactly 3,000 kcal'], 1, 'A label reference is not an individual calorie prescription.', label),
      card('You are choosing canned fruit without added sugar. What should you look for?', ['Fruit in heavy syrup', 'Fruit with the most colourful packaging', 'Fruit in water or its own juice, checking the label', 'Fruit labelled “premium” without checking ingredients'], 2, 'Check the packing liquid and added sugar rather than the marketing.', budget),
      card('Yogurt A has 10 g total sugars including 6 g added; yogurt B has 8 g total including 2 g added, per equal serving. Which has less added sugar?', ['A, because its total sugar is higher', 'They are equal because both contain milk', 'Add total and added sugars before comparing', 'B, comparing 2 g added with 6 g added'], 3, 'Added sugar is already included in total sugar; do not count it twice.', label),
    ],
  },
}
