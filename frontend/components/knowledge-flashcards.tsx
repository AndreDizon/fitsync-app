'use client'

import { useId, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, ExternalLink, RotateCcw } from 'lucide-react'
import { knowledgeDecks, knowledgeLevels, type KnowledgeLevel, type KnowledgeTopic } from '../lib/knowledge-flashcards'
import '@/app/knowledge-flashcards.css'

export function KnowledgeFlashcards({ initialTopic }: { initialTopic: KnowledgeTopic }) {
  const titleId = useId()
  const questionRef = useRef<HTMLHeadingElement>(null)
  const [topic, setTopic] = useState(initialTopic)
  const [level, setLevel] = useState<KnowledgeLevel>('Beginner')
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [recalled, setRecalled] = useState(0)
  const deck = knowledgeDecks[topic][level]
  const done = index === deck.length
  const current = deck[Math.min(index, deck.length - 1)]
  function reset() { setIndex(0); setRevealed(false); setRecalled(0) }
  function advance(remembered: boolean) {
    if (remembered) setRecalled(value => value + 1)
    setIndex(value => value + 1); setRevealed(false)
    questionRef.current?.focus()
  }
  return <section className="kf-root" aria-labelledby={titleId}>
    <header className="kf-header"><span className="kf-icon"><BookOpen size={22} aria-hidden="true" /></span><div><h3 id={titleId}>Put your knowledge to work</h3><p>A quick flashcard quiz for your next workout or meal.</p></div></header>
    <div className="kf-body">
      <div className="kf-controls"><fieldset><legend>Topic</legend><div>{(['Workout', 'Nutrition'] as const).map(value => <button key={value} aria-pressed={topic === value} onClick={() => { setTopic(value); reset() }}>{value}</button>)}</div></fieldset><fieldset><legend>Difficulty</legend><div>{knowledgeLevels.map(value => <button key={value} aria-pressed={level === value} onClick={() => { setLevel(value); reset() }}>{value}</button>)}</div></fieldset></div>
      <div className="kf-progress"><span>{topic} · {level}</span><span aria-live="polite">{done ? 'Deck complete' : `Card ${index + 1} of ${deck.length}`}</span></div>
      <progress value={index} max={deck.length} aria-label="Flashcards completed" />
      <div className={'kf-card' + (revealed ? ' is-revealed' : '')}>
        <h4 ref={questionRef} tabIndex={-1}>{done ? 'A little practice goes a long way.' : current.question}</h4>
        {done ? <div className="kf-complete"><p>You marked <strong>{recalled} of {deck.length}</strong> answers as remembered. Try again or choose another topic or difficulty.</p><button className="kf-primary" onClick={reset}><RotateCcw size={17} />Practice again</button></div> : revealed ? <div className="kf-answer" aria-live="polite"><strong>{current.answer}</strong><p>{current.explanation}</p><a href={current.source} target="_blank" rel="noopener noreferrer">Read the {topic === 'Workout' ? 'CDC' : 'FDA'} source <ExternalLink size={14} aria-hidden="true" /><span className="kf-sr-only"> (opens in a new tab)</span></a><div className="kf-actions"><button onClick={() => advance(false)}><RotateCcw size={16} />Still learning</button><button className="kf-primary" onClick={() => advance(true)}><Check size={17} />I remembered</button></div></div> : <><p className="kf-prompt">Think of your answer, then turn the card over.</p><button className="kf-primary" onClick={() => setRevealed(true)}>Reveal answer <ArrowRight size={17} /></button></>}
      </div>
      <p className="kf-footnote">For learning, not a fitness assessment. Changing topic or difficulty starts a new deck. Nutrition label questions use U.S. FDA labels.</p>
    </div>
  </section>
}
