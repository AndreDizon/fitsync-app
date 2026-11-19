'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, LockKeyhole } from 'lucide-react'
import { type ProgressEntry } from '../../shared/progress'
import '@/app/progress-photo-timeline.css'

export function ProgressPhotoTimeline({ photos, disabled, onEdit, onDelete }: {
  photos: ProgressEntry[]; disabled: boolean; onEdit: (entry: ProgressEntry) => void; onDelete: (entry: ProgressEntry) => void
}) {
  const [sort, setSort] = useState('newest'), [page, setPage] = useState(0), [view, setView] = useState('timeline'), [compare, setCompare] = useState<string[]>([])
  const ordered = [...photos].sort((a,b) => (sort === 'newest' ? -1 : 1) * (a.date.localeCompare(b.date) || (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id)))
  const pages = Math.max(1, Math.ceil(ordered.length / 6)), current = Math.min(page, pages - 1), visible = ordered.slice(current * 6, current * 6 + 6)
  const selected = [photos.find(p => p.id === compare[0]) || photos[0], photos.find(p => p.id === compare[1]) || photos[photos.length - 1]]
  const photoIds = photos.map(p => p.id).join('|')
  useEffect(() => { setPage(0) }, [photoIds, sort])
  function image(entry: ProgressEntry) {
    return entry.photoUrl ? <img src={entry.photoUrl} alt={'Your private progress photo dated ' + entry.date} loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.alt = 'Photo access expired or unavailable. Use the page info button to refresh.' }}/>
      : <div className="pt-unavailable"><LockKeyhole size={25}/><p>Reconnect and refresh to view this private photo.</p></div>
  }
  function actions(entry: ProgressEntry) {
    return <div className="pr-photo-actions"><button type="button" disabled={disabled} onClick={() => onEdit(entry)}>Edit date / caption</button><button type="button" disabled={disabled} onClick={() => onDelete(entry)}>Delete photo</button></div>
  }
  return <div className="pt-content">
    <div className="pt-privacy"><LockKeyhole size={18} aria-hidden="true"/><div><strong>Private to your account</strong><p>Your photos are stored in private storage with access rules tied to your account. Other users cannot browse them. Viewing requires your signed-in session. Uploads are resized and embedded image metadata is removed.</p></div></div>
    {photos.length ? <>
      <div className="pt-toolbar"><p>{photos.length} private {photos.length === 1 ? 'photo' : 'photos'} in this period</p><label>Photo order<select value={sort} onChange={event => { setSort(event.target.value); setPage(0) }}><option value="newest">Newest first (descending)</option><option value="oldest">Oldest first (ascending)</option></select></label><button type="button" disabled={photos.length < 2} aria-pressed={view === 'compare'} onClick={() => setView(view === 'timeline' ? 'compare' : 'timeline')}>{view === 'timeline' ? 'Compare two photos' : 'Back to timeline'}</button></div>
      {view === 'compare' ? <>
        <div className="pt-compare-heading"><p>Choose two photos from this period to compare.</p><button type="button" onClick={() => setCompare([selected[1]?.id || '', selected[0]?.id || ''])}>Swap photos</button></div>
        <div className="pr-photo-compare" tabIndex={0} role="region" aria-label="Photo comparison; scroll horizontally on smaller screens">{selected.map((entry, index) => entry && <figure key={index}><label>{index ? 'Compare with' : 'Starting view'}<select aria-label={index ? 'Second comparison photo' : 'First comparison photo'} value={entry.id} onChange={event => setCompare(index ? [selected[0]?.id || '', event.target.value] : [event.target.value, selected[1]?.id || ''])}>{ordered.map(p => <option key={p.id} value={p.id}>{p.date}{p.payload.notes ? ' - ' + p.payload.notes.slice(0,45) : ''}</option>)}</select></label>{image(entry)}<figcaption>{entry.date}{entry.payload.notes && <span>{entry.payload.notes}</span>}</figcaption>{actions(entry)}</figure>)}</div>
      </> : <>
        <div className="pt-grid">{visible.map(entry => <figure key={entry.id}>{image(entry)}<figcaption><time dateTime={entry.date}>{entry.date}</time>{entry.payload.notes && <p>{entry.payload.notes}</p>}</figcaption>{actions(entry)}</figure>)}</div>
        <nav className="pt-pagination" aria-label="Photo timeline pages"><p aria-live="polite">Showing {current * 6 + 1}–{Math.min((current + 1) * 6, ordered.length)} of {ordered.length}<span>Page {current + 1} of {pages}</span></p><div><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}><ArrowLeft size={16}/>Previous</button><button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next<ArrowRight size={16}/></button></div></nav>
      </>}
      <p className="pt-help">Photos require an internet connection and a valid signed-in session. If a photo is unavailable, use the page info button to refresh. Use similar lighting and framing for easier comparisons.</p>
    </> : <div className="pr-photo-empty"><Camera size={32}/><h3>No photos in this period</h3><p>Choose a wider period or add a photo. Photos are optional and private. Use similar lighting and framing for easier comparisons.</p></div>}
  </div>
}
