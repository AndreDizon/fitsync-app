'use client'

import { useChat } from '@ai-sdk/react'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function CoachChat() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
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
    <button className="coach-launcher" onClick={() => setOpen(true)}><Sparkles size={16} /> Ask AI Chatbot <ArrowRight size={14} /></button>
    {open && <div className="coach-chat" role="dialog" aria-label="AI Chatbot chat">
      <div className="coach-chat-head"><button className="coach-back" onClick={() => setOpen(false)} aria-label="Back to social page">Back</button><div><strong><Sparkles size={16} /> AI Chatbot</strong><span>Personalized support</span></div><button onClick={() => setOpen(false)} aria-label="Close chat"><X size={17} /></button></div>
      <div className="coach-messages">{messages.length === 0 && <p className="coach-welcome">What would make today feel like a win?</p>}{messages.map((message) => <div key={message.id} className={`coach-message ${message.role === 'user' ? 'user' : 'assistant'}`}>{message.parts.filter((part) => part.type === 'text').map((part, index) => <span key={index}>{part.text}</span>)}</div>)}{isLoading && <div className="coach-message assistant">Thinking...</div>}</div>
      <form className="coach-chat-form" onSubmit={submit}><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Message chatbot" aria-label="Message chatbot" /><button aria-label="Send message" disabled={!input.trim() || isLoading}><ArrowRight size={17} /></button></form>
    </div>}
  </>
}
