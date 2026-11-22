'use client'

import { useId, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, ExternalLink, RotateCcw, X } from 'lucide-react'
import { knowledgeDecks, knowledgeLevels, type KnowledgeLevel, type KnowledgeTopic } from '../lib/knowledge-flashcards'
import '@/app/knowledge-flashcards.css'

export function KnowledgeFlashcards({ topic }: { topic: KnowledgeTopic }) {
  // The page header selects the topic. Switching clears the old deck and score.
  return <QuizDeck key={topic} topic={topic} />
}

function QuizDeck({ topic }: { topic: KnowledgeTopic }) {
  const titleId = useId()
  const questionRef = useRef<HTMLHeadingElement>(null)
  const [level, setLevel] = useState<KnowledgeLevel>('Beginner')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const deck = knowledgeDecks[topic][level]
  const done = index === deck.length
  const current = deck[Math.min(index, deck.length - 1)]
  const answered = selected !== null
  function reset() { setIndex(0); setSelected(null); setScore(0) }
  function answer(option: number) {
    if (answered) return
    setSelected(option)
    if (option === current.correctIndex) setScore(value => value + 1)
  }
  function advance() {
    setIndex(value => value + 1); setSelected(null)
    questionRef.current?.focus()
  }
  return <section className="kf-root" aria-labelledby={titleId}>
    <header className="kf-header"><span className="kf-icon"><BookOpen size={22} aria-hidden="true" /></span><div><h3 id={titleId}>Put your knowledge to work</h3><p>{topic} quiz · 15 questions across three difficulty levels.</p></div></header>
    <div className="kf-body">
      <div className="kf-controls"><fieldset><legend>Difficulty</legend><div>{knowledgeLevels.map(value => <button key={value} aria-pressed={level === value} onClick={() => { setLevel(value); reset() }}>{value}</button>)}</div></fieldset></div>
      <div className="kf-progress"><span>{topic} · {level}</span><span aria-live="polite">{done ? 'Quiz complete' : `Question ${index + 1} of ${deck.length}`}</span></div>
      <progress value={done ? deck.length : index + (answered ? 1 : 0)} max={deck.length} aria-label="Questions answered" />
      <div className={'kf-card' + (answered ? ' is-revealed' : '')}>
        <h4 id={titleId + '-question'} ref={questionRef} tabIndex={-1}>{done ? 'Your results' : current.question}</h4>
        {done ? <div className="kf-complete"><p>You answered <strong>{score} of {deck.length}</strong> correctly. Practice again or try another difficulty.</p><button className="kf-primary" onClick={reset}><RotateCcw size={17} />Practice again</button></div> : <>
          <p className="kf-prompt">Choose one answer.</p>
          <div className="kf-options" role="group" aria-labelledby={titleId + '-question'}>{current.options.map((option, position) => {
            const correct = answered && position === current.correctIndex
            const wrong = answered && selected === position && !correct
            return <button key={option} className={(correct ? 'is-correct' : '') + (wrong ? ' is-wrong' : '')} aria-disabled={answered} onClick={() => answer(position)}><span className="kf-option-letter" aria-hidden="true">{'ABCD'[position]}</span><span>{option}{correct && <small>Correct answer</small>}{wrong && <small>Your answer</small>}</span>{correct ? <Check size={18} aria-hidden="true" /> : wrong ? <X size={18} aria-hidden="true" /> : null}</button>
          })}</div>
          {answered && <div className="kf-answer" role="status"><strong>{selected === current.correctIndex ? 'Correct!' : 'Not quite.'}</strong><p>{current.explanation}</p><a href={current.source} target="_blank" rel="noopener noreferrer">Read the {topic === 'Workout' ? 'CDC' : 'FDA'} source <ExternalLink size={14} aria-hidden="true" /><span className="kf-sr-only"> (opens in a new tab)</span></a><div className="kf-actions"><button className="kf-primary" onClick={advance}>{index === deck.length - 1 ? 'See results' : 'Next question'}<ArrowRight size={17} /></button></div></div>}
        </>}
      </div>
      <p className="kf-footnote">Use the page’s Workout/Nutrition toggle to change topic. Changing topic or difficulty starts a new quiz. Nutrition questions use U.S. labels.</p>
    </div>
  </section>
}
