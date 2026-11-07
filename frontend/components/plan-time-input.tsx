'use client'
import { useEffect, useRef, useState } from 'react'

export function PlanTimeInput({ value, onChange, label, disabled = false }: { value: string; onChange: (value: string) => void; label: string; disabled?: boolean }) {
  const [draft, setDraft] = useState(value)
  const editing = useRef(false)
  useEffect(() => { if (!editing.current) setDraft(value) }, [value])
  return <input type="time" step={60} aria-label={label} value={draft} disabled={disabled}
    onClick={event => { try { event.currentTarget.showPicker?.() } catch { /* Keep native text editing available when a picker is unsupported. */ } }}
    onFocus={() => { editing.current = true }}
    onChange={event => { const time = event.currentTarget.value; setDraft(time); if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) onChange(time) }}
    onBlur={() => { editing.current = false; setDraft(value) }} />
}
