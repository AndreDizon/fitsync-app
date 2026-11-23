'use client'
import { ArrowRight, Camera, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePlanAccount } from '@/lib/playlist-account'
import { prepareMealPhoto } from '@/lib/meal-photo'
import { isMealEstimate, type MealEstimate } from '../../shared/meal-scan'
import { MealEstimateCard, mealSummary } from './meal-estimate'
import '@/app/meal-scanner.css'

type Message = { role: 'user' | 'assistant'; content: string; display?: string; meal?: MealEstimate }
export function CoachChat() {
  const owner = usePlanAccount(), dialog = useRef<HTMLDialogElement>(null), end = useRef<HTMLDivElement>(null), controller = useRef<AbortController | null>(null)
  const [messages, setMessages] = useState<Message[]>([]), [input, setInput] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retryAt, setRetryAt] = useState<string | null>(null)
  const picker = useRef<HTMLInputElement>(null), photoRun = useRef(0)
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null), [preparing, setPreparing] = useState(false)
  useEffect(() => () => { controller.current?.abort(); photoRun.current++ }, [])
  useEffect(() => { controller.current?.abort(); photoRun.current++; setPhoto(null); setPreparing(false); setMessages([]); setInput(''); setError(''); setRetryAt(null); setBusy(false) }, [owner])
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview) }, [photo])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages, busy])
  function close() { controller.current?.abort(); photoRun.current++; setPreparing(false); setPhoto(null); setBusy(false); dialog.current?.close() }
  async function attach(file: File) {
    const run = ++photoRun.current
    setPreparing(true); setError(''); setRetryAt(null)
    try { const prepared = await prepareMealPhoto(file); if (photoRun.current === run) setPhoto({ file: prepared, preview: URL.createObjectURL(prepared) }) }
    catch (cause) { if (photoRun.current === run) setError((cause as Error).message) }
    finally { if (photoRun.current === run) setPreparing(false) }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if ((!input.trim() && !photo) || busy || preparing || !owner) return
    if (photo && input.trim().length > 500) { setError('Keep meal details under 500 characters.'); return }
    const question = photo ? 'Scan my meal photo.' + (input.trim() ? ' Food details: ' + input.trim() : '') : input.trim(), history = [...messages, { role: 'user' as const, content: question }].slice(-19)
    const plainHistory = history.map(({ role, content }) => ({ role, content }))
    if (!photo && JSON.stringify(plainHistory).length > 22000) { setError('This conversation is full. Use New chat to continue.'); return }
    setBusy(true); setError(''); setRetryAt(null)
    const pending = new AbortController(); controller.current = pending
    try {
      const form = new FormData()
      if (photo) { form.set('photo', photo.file); form.set('details', input.trim()) }
      const response = await fetch(photo ? '/api/coach/meal' : '/api/coach', { method: 'POST', headers: photo ? undefined : { 'Content-Type': 'application/json' }, body: photo ? form : JSON.stringify({ messages: plainHistory }), signal: AbortSignal.any([pending.signal, AbortSignal.timeout(55000)]) })
      const data = await response.json().catch(() => { throw new Error('The AI service is temporarily unavailable. Please retry later.') })
      if (pending.signal.aborted || controller.current !== pending) return
      if (!response.ok) { setRetryAt(data.retryAt || null); throw new Error(data.error || 'Chat is temporarily unavailable.') }
      if (typeof data.answer !== 'string') throw new Error('No answer was returned. Please try again.')
      if (data.meal !== undefined && !isMealEstimate(data.meal)) throw new Error('No valid meal estimate was returned. Please try again.')
      const meal = data.meal as MealEstimate | undefined
      setMessages([...history, { role: 'assistant', content: meal ? mealSummary(meal) : data.answer, display: data.answer, ...(meal ? { meal } : {}) }]); setInput(''); setPhoto(null)
    } catch (cause) { if (!pending.signal.aborted && controller.current === pending) setError((cause as Error).name === 'TimeoutError' ? 'The models took too long. Please try again shortly.' : (cause as Error).message) }
    finally { if (controller.current === pending) setBusy(false) }
  }
  return <>
    <button className="hb-chat-launch" onClick={() => dialog.current?.showModal()}><Sparkles size={20} /><span><strong>Ask the FitSync fox</strong><small>Workout, nutrition & meal photos</small></span><ArrowRight size={19} /></button>
    <dialog ref={dialog} className="hb-chat hb-meal-enabled" onCancel={close} aria-labelledby="hb-chat-title">
      <header><div><span className="hb-kicker">A LITTLE GUIDANCE</span><h2 id="hb-chat-title">Ask the FitSync fox</h2></div><button onClick={close} aria-label="Close fitness chat"><X size={21} /></button></header>
      <p className="hb-chat-note">Workout & nutrition only. Meal photos give approximate estimates, not professional dietary advice.</p>
      <p className="hb-chat-privacy">Messages and submitted photos go to OpenRouter and its providers. Chat stays in this tab, not your FitSync account. Avoid sensitive information.</p>
      <div className="hb-chat-log" role="log" aria-label="Fitness conversation" aria-live="polite">
        {!messages.length && <div className="hb-chat-welcome"><img src="/mascot/hero-fox-head.png" width="80" height="80" alt=""/><h3>What would you like to learn?</h3><p>Ask a question, or add a meal photo for estimated nutrients and potential benefits.</p>{['How can I start exercising consistently?', 'What makes a balanced meal?', 'How can I recover after a workout?'].map(text => <button key={text} disabled={busy || preparing} onClick={() => { setPhoto(null); setInput(text) }}>{text}</button>)}</div>}
        {messages.map((message, index) => <article className={'hb-chat-message ' + message.role} key={index}><small>{message.role === 'user' ? 'You' : 'FitSync fox'}</small><p>{message.display || message.content}</p>{message.meal && <MealEstimateCard meal={message.meal}/>}</article>)}
        {(busy || preparing) && <p role="status">{preparing ? 'Preparing your meal photo...' : photo ? 'Checking the visible meal with a free image model...' : 'Checking your workout or nutrition question...'}</p>}<div ref={end}/>
      </div>
      {error && <p className="hb-chat-error" role="alert">{error}{retryAt && <span> Provider suggests retrying at {new Date(retryAt).toLocaleString()}.</span>}</p>}
      <form onSubmit={submit}>
        {photo && <figure className="hb-meal-attachment"><img src={photo.preview} alt="Meal photo ready to scan"/><figcaption><strong>Meal photo ready</strong><span>Add ingredients or portions below if known.</span></figcaption><button type="button" disabled={busy} aria-label="Remove meal photo" onClick={() => setPhoto(null)}><X size={16}/></button></figure>}
        <label htmlFor="hb-question">{photo ? 'Meal details (optional)' : 'Your workout or nutrition question'}</label><textarea id="hb-question" rows={2} maxLength={photo ? 500 : 3000} disabled={busy || preparing} value={input} onChange={e => setInput(e.target.value)} placeholder={photo ? 'For example: one cup of cooked rice; chicken cooked with oil.' : 'For example: how do I build a workout habit?'}/>
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Choose a meal photo" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void attach(file) }}/>
        <div className="hb-chat-actions"><div className="hb-chat-tools"><button type="button" disabled={busy || preparing || !owner} onClick={() => picker.current?.click()}><Camera size={16}/>{photo ? 'Change photo' : 'Meal photo'}</button><button type="button" disabled={busy || preparing} onClick={() => { setMessages([]); setInput(''); setPhoto(null); setError(''); setRetryAt(null) }}>New chat</button></div><button type="submit" disabled={busy || preparing || !owner || (!input.trim() && !photo)}><Send size={16}/>{photo ? 'Scan meal' : 'Send'}</button></div>
      </form>
    </dialog>
  </>
}

