'use client'

import { useChat } from '@ai-sdk/react'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

export function CoachChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat()
  const isLoading = status === 'submitted' || status === 'streaming'

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage({ text })
  }

  return <>
    <button className="coach-launcher" onClick={() => setOpen(true)}><Sparkles size={16} /> Ask AI Coach <ArrowRight size={14} /></button>
    {open && <div className="coach-chat" role="dialog" aria-label="AI Coach chat">
      <div className="coach-chat-head"><div><strong><Sparkles size={16} /> AI Coach</strong><span>Personalized support</span></div><button onClick={() => setOpen(false)} aria-label="Close chat"><X size={17} /></button></div>
      <div className="coach-messages">{messages.length === 0 && <p className="coach-welcome">What would make today feel like a win?</p>}{messages.map((message) => <div key={message.id} className={`coach-message ${message.role === 'user' ? 'user' : 'assistant'}`}>{message.parts.filter((part) => part.type === 'text').map((part, index) => <span key={index}>{part.text}</span>)}</div>)}{isLoading && <div className="coach-message assistant">Thinking...</div>}</div>
      <form className="coach-chat-form" onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask your coach" aria-label="Ask your coach" /><button aria-label="Send message" disabled={!input.trim() || isLoading}><ArrowRight size={17} /></button></form>
    </div>}
  </>
}
