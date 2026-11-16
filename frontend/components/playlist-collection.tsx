'use client'

import { ArrowUpRight, CalendarDays, Check, Plus, Search, X } from 'lucide-react'
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
  const filtered = collection.filter(item => (lengthFilter === 'all' || item.duration === lengthFilter) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase().trim()))
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
    {loading ? <p className="pc-loading" role="status">Loading your playlists…</p> : !collection.length ? <div className="pc-collection-placeholder"><div className="pc-empty-folder" aria-hidden="true"><div className="pc-folder-sheet"><i /><i /><i /></div><div className="pc-folder-front"><span>Saved playlists</span></div></div><div><h3>Your collection starts here</h3><p>Create a playlist above. Your saved playlists will appear here.</p><span>Build once. Come back and edit any time.</span></div></div> : filtered.length ? <ul className="pc-playlist-list" aria-label="Saved playlists">{filtered.map(item => <li key={item.id}><button className="pc-playlist-row" disabled={busy} onClick={() => onOpen(item)}>
      <span className="pc-row-calendar" aria-hidden="true"><CalendarDays size={20} /></span>
      <div className="pc-row-info"><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}<div className="pc-row-meta"><span>{item.duration === 'day' ? playlistDays[item.selectedDay] : 'Monday–Sunday'}</span><span>{item.items.length} {nutrition ? (item.items.length === 1 ? 'food portion' : 'food portions') : (item.items.length === 1 ? 'exercise' : 'exercises')}</span></div></div>
      <div className="pc-row-tools"><span className="pc-row-duration">{item.duration === 'day' ? 'One day' : 'One week'}</span><span className={'pc-row-status pc-sync is-' + item.syncStatus}>{item.syncStatus === 'pending' ? 'Pending sync' : item.syncStatus === 'conflict' ? 'Sync conflict' : 'Available offline'}</span></div><ArrowUpRight className="pc-row-arrow" size={18} aria-hidden="true" />
    </button></li>)}</ul> : <div className="pc-no-results"><Search size={24} /><h3>No matching playlists</h3><p>Try another name or include all playlist lengths.</p><button onClick={() => { setQuery(''); setLengthFilter('all') }}>Clear filters</button></div>}
  </div>
}
