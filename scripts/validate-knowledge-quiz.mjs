import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../frontend/lib/knowledge-flashcards.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { knowledgeDecks, knowledgeLevels } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
const questions = new Set()
assert.deepEqual(Object.keys(knowledgeDecks), ['Workout', 'Nutrition'])
for (const [topic, levels] of Object.entries(knowledgeDecks)) {
  assert.deepEqual(Object.keys(levels), knowledgeLevels)
  assert.equal(Object.values(levels).flat().length, 15, topic + ' question total')
  for (const [level, deck] of Object.entries(levels)) {
    assert.equal(deck.length, 5, topic + ' ' + level)
    for (const card of deck) {
      assert(!questions.has(card.question), 'Duplicate question: ' + card.question)
      questions.add(card.question)
      assert.equal(card.options.length, 4)
      assert.equal(new Set(card.options).size, 4, 'Options must be distinct')
      assert(Number.isInteger(card.correctIndex) && card.correctIndex >= 0 && card.correctIndex < 4)
      assert(card.options.every(option => typeof option === 'string' && option.trim()))
      assert(card.explanation.trim())
      const url = new URL(card.source)
      assert.equal(url.protocol, 'https:')
      const publishers = { 'www.cdc.gov': 'CDC', 'www.nhs.uk': 'NHS', 'acsm.org': 'ACSM', 'www.who.int': 'WHO', 'www.fda.gov': 'FDA' }
      const allowed = topic === 'Workout' ? ['www.cdc.gov', 'www.nhs.uk', 'acsm.org'] : ['www.cdc.gov', 'www.who.int', 'www.fda.gov']
      assert(allowed.includes(url.hostname), 'Use an approved primary source for this topic')
      assert.equal(card.sourceName, publishers[url.hostname], 'Source link must name the actual publisher')
    }
  }
}
assert.equal(questions.size, 30)
console.log('PASS: 30 unique questions, 15 per topic, 5 per difficulty, 4 distinct choices and one answer key each.')
