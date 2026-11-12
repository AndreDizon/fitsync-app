'use client'

import { ArrowUpRight, CalendarDays, Check, Plus, Search } from 'lucide-react'
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
  return <div className="pc-root">
    <div className="pc-welcome-grid">
      <article className="pc-start pc-surface">
        <div className="pc-start-copy"><span className="pc-chip">{collection.length ? 'Make it yours' : 'Your first playlist'}</span><h3>A little structure.<br />A lot of you.</h3><p>{nutrition ? 'Bring your go-to meals together. Build a menu you’ll want to come back to.' : 'Bring your go-to moves together. Build a workout you’ll want to come back to.'}</p><button className="pc-create" onClick={() => onOpen(null)} disabled={busy}><Plus size={18} />Create playlist</button></div>
        <div className="pc-start-art"><HomeCardArt subject="playlist" nutrition={nutrition} /><span className="pc-art-note">Picked by you. Built for your day.</span></div>
      </article>
      <article className="pc-rhythm pc-surface"><HomeCardArt subject="plan" nutrition={nutrition} /><div><h3>Find your rhythm.</h3><p>Start with one day or make room for a whole week. You choose the pace.</p></div><div className="pc-schedule-options"><span><CalendarDays size={14} />One day</span><span>One week</span></div></article>
    </div>
    <header className="pc-heading"><div><h3>Your collection <span>{collection.length}</span></h3><p>{nutrition ? 'Your favorite foods. A rhythm that fits.' : 'Your favorite moves. A rhythm that fits.'}</p></div><span className="pc-saved-label"><Check size={14} />Made by you</span></header>
    <div className="pc-toolbar">
      <label className="pc-search"><Search size={18} /><input aria-label="Search your playlists" value={query} placeholder="Find a playlist" onChange={event => setQuery(event.target.value)} /></label>
      <label className="pc-filter"><CalendarDays size={17} /><select aria-label="Filter playlist length" value={lengthFilter} onChange={event => setLengthFilter(event.target.value)}><option value="all">All lengths</option><option value="day">One day</option><option value="week">One week</option></select></label>
    </div>
    {loading ? <p className="pc-loading" role="status">Loading your playlists…</p> : !collection.length ? <div className="pc-collection-placeholder"><div className="pc-empty-folder" aria-hidden="true"><div className="pc-folder-sheet"><i /><i /><i /></div><div className="pc-folder-front"><span>Saved playlists</span></div></div><div><h3>Your collection starts here</h3><p>Create a playlist above. Your saved playlists will appear here.</p><span><CalendarDays size={14} />One-day and weekly playlists, all in one place.</span></div></div> : filtered.length ? <div className="pc-grid">{filtered.map(item => <button className="pc-card pc-surface" key={item.id} onClick={() => onOpen(item)}>
      <div className="pc-card-top"><span className="pc-chip">{item.duration === 'day' ? playlistDays[item.selectedDay] : 'Weekly playlist'}</span><ArrowUpRight size={20} /></div>
      <div className="pc-card-art"><HomeCardArt subject={nutrition ? 'food' : 'movement'} nutrition={nutrition} /><span className="pc-duration">{item.duration === 'day' ? '1' : '7'}<small>{item.duration === 'day' ? 'day' : 'days'}</small></span></div>
      <div className="pc-card-copy"><h3>{item.name}</h3><p>{item.description || (nutrition ? 'Your favorite foods, on your schedule.' : 'Your favorite moves, in your own order.')}</p></div>
      <div className="pc-card-footer"><strong>{item.items.length} {nutrition ? 'food portions' : 'exercises'}</strong><span className={'pc-sync is-' + item.syncStatus}>{item.syncStatus === 'pending' ? 'Pending sync' : item.syncStatus === 'conflict' ? 'Sync conflict' : 'Available offline'}</span></div>
    </button>)}</div> : <div className="pc-no-results"><Search size={24} /><h3>No playlists found</h3><p>Try another name or choose a different length.</p><button onClick={() => { setQuery(''); setLengthFilter('all') }}>Clear filters</button></div>}
  </div>
}
