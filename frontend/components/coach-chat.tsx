'use client'
import { ArrowRight, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePlanAccount } from '@/lib/playlist-account'

type Message = { role: 'user' | 'assistant'; content: string }
export function CoachChat() {
  const owner = usePlanAccount(), dialog = useRef<HTMLDialogElement>(null), end = useRef<HTMLDivElement>(null), controller = useRef<AbortController | null>(null)
  const [messages, setMessages] = useState<Message[]>([]), [input, setInput] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retryAt, setRetryAt] = useState<string | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => { controller.current?.abort(); setMessages([]); setError(''); setBusy(false) }, [owner])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages, busy])
  function close() { controller.current?.abort(); setBusy(false); dialog.current?.close() }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!input.trim() || busy || !owner) return
    const question = input.trim(), history = [...messages, { role: 'user' as const, content: question }].slice(-19)
    if (JSON.stringify(history).length > 22000) { setError('This conversation is full. Use New chat to continue.'); return }
    setBusy(true); setError(''); setRetryAt(null)
    const pending = new AbortController(); controller.current = pending
    try {
      const response = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }), signal: AbortSignal.any([pending.signal, AbortSignal.timeout(55000)]) })
      const data = await response.json()
      if (pending.signal.aborted || controller.current !== pending) return
      if (!response.ok) { setRetryAt(data.retryAt || null); throw new Error(data.error || 'Chat is temporarily unavailable.') }
      if (typeof data.answer !== 'string') throw new Error('No answer was returned. Please try again.')
      setMessages([...history, { role: 'assistant', content: data.answer }]); setInput('')
    } catch (cause) { if (!pending.signal.aborted && controller.current === pending) setError((cause as Error).name === 'TimeoutError' ? 'The models took too long. Please try again shortly.' : (cause as Error).message) }
    finally { if (controller.current === pending) setBusy(false) }
  }
  return <>
    <button className="hb-chat-launch" onClick={() => dialog.current?.showModal()}><Sparkles size={20} /><span><strong>Ask the FitSync fox</strong><small>Fitness & nutrition questions</small></span><ArrowRight size={19} /></button>
    <dialog ref={dialog} className="hb-chat" onCancel={close} aria-labelledby="hb-chat-title">
      <header><div><span className="hb-kicker">A LITTLE GUIDANCE</span><h2 id="hb-chat-title">Ask the FitSync fox</h2></div><button onClick={close} aria-label="Close fitness chat"><X size={21} /></button></header>
      <p className="hb-chat-note">AI guidance for fitness and nutrition only. Not a substitute for a qualified instructor, dietitian or healthcare professional.</p>
      <p className="hb-chat-privacy">Your messages are sent to OpenRouter and its model providers. Chat stays in this tab and is not saved to your FitSync account. Avoid sharing sensitive personal information.</p>
      <div className="hb-chat-log" role="log" aria-label="Fitness conversation" aria-live="polite">
        {!messages.length && <div className="hb-chat-welcome"><img src="/mascot/hero-fox-head.png" width="80" height="80" alt=""/><h3>What would you like to learn?</h3><p>Ask about movement, food, hydration or recovery.</p>{['How can I start exercising consistently?', 'What makes a balanced meal?', 'How can I recover after a workout?'].map(text => <button key={text} onClick={() => setInput(text)}>{text}</button>)}</div>}
        {messages.map((message, index) => <article className={'hb-chat-message ' + message.role} key={index}><small>{message.role === 'user' ? 'You' : 'FitSync fox'}</small><p>{message.content}</p></article>)}
        {busy && <p role="status">The fox is thinking. Trying a free model…</p>}<div ref={end}/>
      </div>
      {!owner && <p className="hb-chat-error">Sign in with a regular account to use AI chat. Local tester access does not include this service.</p>}
      {error && <p className="hb-chat-error" role="alert">{error}{retryAt && <span> Provider suggests retrying at {new Date(retryAt).toLocaleString()}.</span>}</p>}
      <form onSubmit={submit}><label htmlFor="hb-question">Your fitness or nutrition question</label><textarea id="hb-question" rows={2} maxLength={3000} value={input} onChange={e => setInput(e.target.value)} placeholder="For example: how do I build a workout habit?"/><div><button type="button" disabled={busy} onClick={() => { setMessages([]); setError(''); setRetryAt(null) }}>New chat</button><button type="submit" disabled={busy || !owner || !input.trim()}><Send size={16}/>Send</button></div></form>
    </dialog>
  </>
}
