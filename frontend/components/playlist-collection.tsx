'use client'

import { ArrowUpRight, CalendarDays, Check, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { KnowledgeFlashcards } from './knowledge-flashcards'
import type { Playlist } from '../../shared/playlists'
import { playlistDays } from '../../shared/playlists'
import { HomeCardArt } from './home-card-art'
import '@/app/playlist-collection.css'

export function PlaylistCollection({ collection, loading, busy, nutrition, query, setQuery, lengthFilter, setLengthFilter, onOpen }: {
  collection: Playlist[]; loading: boolean; busy: boolean; nutrition: boolean
  query: string; setQuery: (value: string) => void
  lengthFilter: string; setLengthFilter: (value: string) => void
  onOpen: (playlist: Playlist | null) => void
}) {
  const [paging, setPaging] = useState({ key: '', page: 1 })
  const filtered = collection.filter(item => (lengthFilter === 'all' || item.duration === lengthFilter) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase().trim()))
  const pageKey = `${nutrition}:${query}:${lengthFilter}`
  const pages = Math.max(1, Math.ceil(filtered.length / 5))
  const page = Math.min(paging.key === pageKey ? paging.page : 1, pages)
  const previews = filtered.slice((page - 1) * 5, page * 5)
  const filtering = query.trim().length > 0 || lengthFilter !== 'all'
  return <div className="pc-root">
    <div className="pc-welcome-grid">
      <article className="pc-start pc-surface">
        <div className="pc-start-copy"><h3>Make your next<br />{nutrition ? 'menu.' : 'routine.'}</h3><p>{nutrition ? 'Keep your go-to foods together. Arrange your meals for a day or a week.' : 'Keep your go-to moves together. Arrange your exercises for a day or a week.'}</p><button className="pc-create" onClick={() => onOpen(null)} disabled={busy}><Plus size={18} />Create playlist</button></div>
        <div className="pc-start-art"><HomeCardArt subject="playlist" nutrition={nutrition} /></div>
      </article>
      <aside className="pc-rhythm pc-surface" aria-label="Playlist lengths"><h3>Your schedule.<br />Your pace.</h3><dl className="pc-length-guide"><div><dt>One day</dt><dd>A routine for one weekday.</dd></div><div><dt>One week</dt><dd>A separate schedule for each day.</dd></div></dl><p>Choose the length when you create a playlist.</p></aside>
    </div>
    <header className="pc-heading"><div><h3>Your collection <span>{collection.length}</span></h3><p>{nutrition ? 'Your saved menus, ready to make your own.' : 'Your saved routines, ready when you are.'}</p></div><span className="pc-saved-label"><Check size={14} />Made by you</span></header>
    <div className="pc-toolbar">
      <div className="pc-search"><Search size={18} aria-hidden="true" /><input aria-label="Search your playlists" value={query} placeholder="Find a playlist" onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear playlist search" onClick={() => setQuery('')}><X size={16} /></button>}</div>
      <label className="pc-filter"><CalendarDays size={17} aria-hidden="true" /><select aria-label="Filter playlist length" value={lengthFilter} onChange={event => setLengthFilter(event.target.value)}><option value="all">All lengths</option><option value="day">One day</option><option value="week">One week</option></select></label>
    </div>
    <p className="pc-result-count" role="status">{!loading && filtering ? `${filtered.length} of ${collection.length} playlists match` : ''}</p>
    {loading ? <p className="pc-loading" role="status">Loading your playlists…</p> : !collection.length ? <div className="pc-collection-placeholder"><div className="pc-mascot-frame"><img src="/mascot/optimized/fox-collection-480.webp" loading="lazy" decoding="async" alt="FitSync fox organizing your collection" width={1254} height={1254} /></div><div><h3>Your collection starts here</h3><p>Create a playlist above. Your saved playlists will appear here.</p><span>Build once. Come back and edit any time.</span></div></div> : filtered.length ? <ul className="pc-playlist-list" aria-label="Saved playlists">{previews.map(item => <li key={item.id}><button className="pc-playlist-row" disabled={busy} onClick={() => onOpen(item)}>
      <span className="pc-row-calendar" aria-hidden="true"><CalendarDays size={20} /></span>
      <div className="pc-row-info"><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}<div className="pc-row-meta"><span>{item.duration === 'day' ? playlistDays[item.selectedDay] : 'Monday–Sunday'}</span><span>{item.items.length} {nutrition ? (item.items.length === 1 ? 'food portion' : 'food portions') : (item.items.length === 1 ? 'exercise' : 'exercises')}</span></div></div>
      <div className="pc-row-tools"><span className="pc-row-duration">{item.duration === 'day' ? 'One day' : 'One week'}</span><span className={'pc-row-status pc-sync is-' + item.syncStatus}>{item.syncStatus === 'pending' ? 'Pending sync' : item.syncStatus === 'conflict' ? 'Sync conflict' : 'Available offline'}</span></div><ArrowUpRight className="pc-row-arrow" size={18} aria-hidden="true" />
    </button></li>)}</ul> : <div className="pc-no-results"><Search size={24} /><h3>No matching playlists</h3><p>Try another name or include all playlist lengths.</p><button onClick={() => { setQuery(''); setLengthFilter('all') }}>Clear filters</button></div>}
    {!loading && <nav className="pc-pagination" aria-label="Playlist pages"><button disabled={busy || page === 1} onClick={() => setPaging({ key: pageKey, page: page - 1 })}>Previous</button><span role="status">Page {page} of {pages}<small>{filtered.length ? `${(page - 1) * 5 + 1}–${Math.min(page * 5, filtered.length)} of ${filtered.length} playlists` : '0 playlists'}</small></span><button disabled={busy || page === pages} onClick={() => setPaging({ key: pageKey, page: page + 1 })}>Next</button></nav>}
    <KnowledgeFlashcards key={nutrition ? 'nutrition' : 'workout'} initialTopic={nutrition ? 'Nutrition' : 'Workout'} />
  </div>
}
