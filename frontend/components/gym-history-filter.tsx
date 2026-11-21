'use client'

import { useEffect, useId, useState } from 'react'
import { gymTimeZoneLabel } from '@/lib/gym-groups'
import { emptyHistoryRange, type HistoryRange } from '../../shared/gym-history'

export function HistoryDateFilter({ label, zone, value, onChange, disabled = false }: { label: string; zone: string; value: HistoryRange; onChange: (range: HistoryRange) => void; disabled?: boolean }) {
 const id = useId(), [draft, setDraft] = useState(value)
 useEffect(() => { setDraft(value) }, [value])
 const invalid = !!draft.from && !!draft.to && draft.from > draft.to
 return <form className="gg-history-filter" onSubmit={event => { event.preventDefault(); if (!invalid) onChange({ ...draft }) }}>
  <fieldset disabled={disabled}><legend>{label}</legend><div className="gg-history-filter-controls">
   <div className="gg-field"><label htmlFor={id + '-from'}>From</label><input id={id + '-from'} type="date" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })}/></div>
   <div className="gg-field"><label htmlFor={id + '-to'}>To</label><input id={id + '-to'} type="date" min={draft.from || undefined} value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })}/></div>
   <div className="gg-actions"><button className="gg-primary" type="submit" disabled={invalid}>Apply dates</button><button type="button" disabled={!draft.from && !draft.to && !value.from && !value.to} onClick={() => { setDraft(emptyHistoryRange); onChange(emptyHistoryRange) }}>Clear filters</button></div>
  </div></fieldset>
  {invalid && <p className="gg-error" role="alert">From must be on or before To.</p>}
  <p className="gg-meta">{value.from || value.to ? `${value.from || 'Any date'} to ${value.to || 'Any date'}` : 'All dates'} &middot; {gymTimeZoneLabel(zone)}</p>
 </form>
}

export function HistoryPagination({ page, total, onChange, disabled = false, label, pageSize = 20, previousLabel = 'Newer', nextLabel = 'Older', always = false }: { page: number; total: number; onChange: (page: number) => void; disabled?: boolean; label: string; pageSize?: number; previousLabel?: string; nextLabel?: string; always?: boolean }) {
 if (!always && total <= pageSize) return null
 return <nav className="gg-pagination" aria-label={label}><button type="button" disabled={disabled || page === 0} onClick={() => onChange(page - 1)}>{previousLabel}</button><span>Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}</span><button type="button" disabled={disabled || (page + 1) * pageSize >= total} onClick={() => onChange(page + 1)}>{nextLabel}</button></nav>
}
