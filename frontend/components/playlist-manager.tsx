'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Apple, CalendarDays, Check, Copy, Dumbbell, ListMusic, Plus, Save, Search, Trash2 } from 'lucide-react'
import exercises from '../../backend/data/exercises.json'
import { foods, foodById, formatNutrient, nutritionTotals } from '@/lib/nutrition'
import { usePlaylistNavigation } from '@/lib/playlist-navigation'
import { FoodDetails } from './food-library'
import { ExerciseDetails } from './exercise-library'
import { seedExerciseById } from '@/lib/exercise-offline'
import { OfflineLibraryStatus } from './offline-library-status'
import { deletePlaylist, listPlaylists, savePlaylist, reloadAccountPlaylist } from '@/lib/playlists'
import { defaultMealTime, movePlaylistItem, newPlaylistItem, playlistDays, playlistMeals, type Playlist, type PlaylistInput, type PlaylistItem, type PlaylistKind } from '../../shared/playlists'
import '@/app/playlists.css'

const draftOf = (playlist: Playlist): PlaylistInput => ({ id: playlist.id, kind: playlist.kind, duration: playlist.duration, selectedDay: playlist.selectedDay, restDays: playlist.kind === 'nutrition' ? [] : playlist.restDays, name: playlist.name, description: playlist.description, items: playlist.items })
const exerciseById = (id: string) => exercises.find(item => item.id === id)
export function PlaylistManager({ kind }: { kind: PlaylistKind }) {
  const navigation = usePlaylistNavigation()
  const [collection, setCollection] = useState<Playlist[]>([])
  const [draft, setDraft] = useState<PlaylistInput | null>(null)
  const [base, setBase] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [day, setDay] = useState(0)
  const [query, setQuery] = useState('')
  const [lengthFilter, setLengthFilter] = useState('all')
  const [online, setOnline] = useState(true)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const detailsTrigger = useRef<HTMLButtonElement | null>(null)
  const showDetails = (id: string, trigger: HTMLButtonElement) => { detailsTrigger.current = trigger; setDetailsId(id) }
  const closeDetails = () => { setDetailsId(null); requestAnimationFrame(() => detailsTrigger.current?.focus()) }
  const [newTime, setNewTime] = useState('08:00')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nutrition = kind === 'nutrition'
  const latest = useRef({ draft, dirty: false })
  const dirty = !!draft && (!base || JSON.stringify(draft) !== JSON.stringify(draftOf(base)))
  latest.current = { draft, dirty }
  useEffect(() => {
    const changed = () => { setOnline(navigator.onLine); if (navigator.onLine) setAttempt(value => value + 1) }
    setOnline(navigator.onLine)
    window.addEventListener('online', changed); window.addEventListener('offline', changed)
    return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed) }
  }, [])
  useEffect(() => {
    let active = true; setLoading(true); setError('')
    listPlaylists(kind).then(items => { if (active) { setCollection(items); const open = latest.current; const saved = items.find(item => item.id === open.draft?.id); if (!open.dirty && saved) { setBase(saved); setDraft(draftOf(saved)) } } }).catch(error => { if (active) setError(error.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [kind, attempt])
  useEffect(() => {
    if (!dirty) return
    const before = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', before)
    return () => window.removeEventListener('beforeunload', before)
  }, [dirty])
  useEffect(() => {
    if (!navigation) return
    navigation.current = () => !dirty || window.confirm('Discard your unsaved playlist changes?')
    return () => { navigation.current = () => true }
  }, [dirty, navigation])
  const canLeave = () => !dirty || window.confirm('Discard your unsaved playlist changes?')
  const closeEditor = () => {
    setDraft(null); setBase(null); setNewTime('08:00'); setConfirmDelete(false); setDetailsId(null); setNotice(''); setError('')
  }
  const open = (playlist: Playlist | null) => {
    if (!canLeave()) return
    setBase(playlist); setDraft(playlist ? draftOf(playlist) : { id: crypto.randomUUID(), kind, duration: 'day', selectedDay: 0, restDays: [], name: '', description: '', items: [] }); setDay(playlist?.selectedDay ?? 0); setNewTime('08:00'); setConfirmDelete(false); setNotice(''); setError('')
  }
  const save = async () => {
    if (!draft) return
    setBusy(true); setError(''); setNotice('')
    try {
      const saved = await savePlaylist(draft, base)
      closeEditor(); setCollection(items => [saved, ...items.filter(item => item.id !== saved.id)]); setNotice(saved.syncStatus === 'synced' ? 'Playlist saved to your account and available offline.' : 'Playlist saved on this device. Changes are queued for syncing when connected.')
    } catch (error) { setError((error as Error).message); void listPlaylists(kind).then(setCollection).catch(() => {}) } finally { setBusy(false) }
  }
  const useAccountVersion = async () => {
    if (!base || !window.confirm('Discard this device’s unsynced changes and load the account version?')) return
    setBusy(true); setError('')
    try { await reloadAccountPlaylist(base); const items = await listPlaylists(kind); setCollection(items); const saved = items.find(item => item.id === base.id); setBase(saved ?? null); setDraft(saved ? draftOf(saved) : null) }
    catch (error) { setError((error as Error).message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!base) return
    setBusy(true); setError('')
    try { const result = await deletePlaylist(base); setCollection(items => items.filter(item => item.id !== base.id)); setBase(null); setDraft(null); setConfirmDelete(false); setNotice(result.pending ? 'Deleted on this device. Account deletion will sync when connected.' : 'Playlist deleted from your account and this device.') }
    catch (error) { setError((error as Error).message) } finally { setBusy(false) }
  }
  const updateItem = (id: string, patch: Partial<PlaylistItem>) => {
    if (!nutrition && patch.day !== undefined && draft?.restDays.includes(patch.day)) return setError('Choose an active day; this day is marked as rest.')
    const previous = draft?.items.find(item => item.id === id)
    if ('meal' in patch && previous && 'meal' in previous && previous.time === defaultMealTime(previous.meal)) patch.time = defaultMealTime(patch.meal)
    setDraft(current => current ? { ...current, items: current.items.map(item => item.id === id ? { ...item, ...patch } as PlaylistItem : item) } : current)
  }
  const dayItems = draft?.items.filter(item => item.day === day) ?? []
  const invalidPortions = dayItems.some(item => 'foodId' in item && (!Number.isFinite(item.grams) || item.grams < 1 || item.grams > 2000))
  const totals = nutritionTotals(dayItems.flatMap(item => 'foodId' in item && Number.isFinite(item.grams) && item.grams >= 1 && item.grams <= 2000 ? [{ id: item.id, foodId: item.foodId, grams: item.grams, slot: item.meal, day: item.day }] : []))
  const catalog = nutrition ? foods.map(food => ({ id: food.id, name: food.name, detail: `${food.category} · ${food.state}`, blocked: false })) : exercises.map(exercise => ({ id: exercise.id, name: exercise.name, detail: `${exercise.target} · ${exercise.equipment}`, blocked: false }))
  const add = (catalogId: string) => {
    if (!draft || draft.items.length >= 350) return setError('A playlist can contain up to 350 entries.')
    if (!nutrition && draft.restDays.includes(day)) return setError('This is a rest day. Unmark rest day before adding exercises.')
    const entry = newPlaylistItem(kind, catalogId, day)
    entry.time = newTime
    const [hours, minutes] = newTime.split(':').map(Number)
    const next = Math.min(1439, hours * 60 + minutes + 30)
    setNewTime(String(Math.floor(next / 60)).padStart(2, '0') + ':' + String(next % 60).padStart(2, '0'))
    setDraft({ ...draft, items: [...draft.items, entry] }); setNotice('')
  }
  return <section className={`playlist-workspace ${nutrition ? 'is-nutrition' : 'is-workout'}`} aria-label={`${nutrition ? 'Nutrition' : 'Workout'} playlists`}>
    <header className="playlist-heading plan-tab-page-heading"><div className="playlist-heading-copy"><div><p className="playlist-eyebrow">MADE BY YOU · BUILT FOR YOUR DAY</p><h2>{nutrition ? 'Your food playlists.' : 'Your workout playlists.'}</h2><p>Pick your favorites. Arrange a day or a week. Make the plan yours.</p></div></div>{!draft ? <button className="playlist-primary" onClick={() => open(null)} disabled={busy}><Plus size={18} />Create playlist</button> : <span className="playlist-editing-label">{base ? 'Editing playlist' : 'New playlist'}</span>}</header>
    <details className="playlist-sync-details" open={draft ? undefined : true}><summary>{online ? 'Offline access & account sync' : 'You are offline - saved edits will sync when connected'}</summary><div className="playlist-status-row"><div className="playlist-account-note"><ListMusic size={19} /><span>{online ? 'Private account playlists with an offline device copy. Saved edits sync while connected.' : 'Offline mode. You can view and edit saved playlists; changes will sync after reconnecting.'} Sign out clears private device copies.</span><button disabled={busy || !online} onClick={() => setAttempt(value => value + 1)}>Sync now</button></div>
    <OfflineLibraryStatus catalog={nutrition ? 'food' : 'exercise'} /></div></details>
    {error && <div className="playlist-error" role="alert"><span>{error}</span><button onClick={() => setAttempt(value => value + 1)} disabled={loading || busy}>Retry loading collection</button>{base && <button disabled={busy} onClick={() => { if (canLeave()) { void reloadAccountPlaylist(base).then(() => { setDraft(null); setBase(null); setAttempt(value => value + 1) }).catch(error => setError(error.message)) } }}>Reload saved version</button>}</div>}
    {notice && <p className="playlist-notice" role="status"><Check size={16} />{notice}</p>}
    {draft ? <div className="playlist-editor">
      <div className="playlist-editor-top"><button className="playlist-text-button" disabled={busy} onClick={closeEditor}><ArrowLeft size={16} />Back to playlists</button><span className={dirty ? 'playlist-unsaved' : 'playlist-saved'}>{dirty ? 'Unsaved changes' : base?.syncStatus === 'pending' ? 'Saved on device - pending sync' : base?.syncStatus === 'conflict' ? 'Sync conflict' : 'Synced - available offline'}</span></div>
      {base?.syncError && <p className="playlist-error" role="status">Sync needs attention: {base.syncError}</p>}{base?.syncStatus === 'conflict' && <div className="playlist-error"><p>Your device edits are preserved. Make a copy to keep them as another playlist, or discard them and use the account version.</p><button disabled={busy || !online} onClick={useAccountVersion}>Use account version</button></div>}
      <ol className="playlist-quick-guide" aria-label="How to build your playlist"><li><span>1</span>Name & schedule</li><li><span>2</span>{nutrition ? 'Choose foods' : 'Choose exercises'}</li><li><span>3</span>Review & save</li></ol>
      <section className="playlist-build-step playlist-step-setup" aria-labelledby="playlist-setup-title">
        <div className="playlist-step-title"><span>1</span><div><h3 id="playlist-setup-title">Make it yours</h3><p>Give your playlist a name, then choose one day or a full week.</p></div></div>
        <div className="playlist-title-fields">
          <label>Playlist name<input aria-label="Playlist name" maxLength={80} value={draft.name} placeholder={nutrition ? 'e.g. My weekday meals' : 'e.g. My full-body workout'} onChange={event => setDraft({ ...draft, name: event.target.value })} disabled={busy} /><small>A name helps you find it in your collection.</small></label>
          <label>Plan length<select aria-label="Plan length" value={draft.duration} disabled={busy} onChange={event => { const duration = event.target.value as 'day' | 'week'; if (duration === 'day' && draft.items.some(item => item.day !== draft.selectedDay)) return setError('Move entries to the selected one-day weekday before switching. Your entries have been kept.'); setDraft({ ...draft, duration, restDays: duration === 'day' ? draft.restDays.filter(day => day === draft.selectedDay) : draft.restDays }); setDay(draft.selectedDay) }}><option value="day">One day</option><option value="week">One week</option></select></label>{draft.duration === 'day' && <label>Weekday<select aria-label="One-day weekday" value={draft.selectedDay} onChange={event => { const selectedDay = Number(event.target.value); setDraft({ ...draft, selectedDay, restDays: draft.restDays.length ? [selectedDay] : [], items: draft.items.map(item => ({ ...item, day: selectedDay })) }); setDay(selectedDay) }}>{playlistDays.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>}
        </div>
        <details className="playlist-optional-description" key={draft.id}><summary>Add a description <span>optional</span></summary><label>Description<textarea maxLength={240} rows={2} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} disabled={busy} placeholder="A short note about this playlist" /></label></details>
      </section>
      <section className="playlist-build-step playlist-step-items playlist-table-step" aria-labelledby="playlist-items-title">
        <div className="playlist-step-title"><span>2</span><div><h3 id="playlist-items-title">Your schedule</h3><p>Set a time and choose {nutrition ? 'a food' : 'an exercise'} in the empty row. Another row appears automatically.</p></div></div>
        <div className="playlist-schedule-top">{draft.duration === 'week' ? <label className="playlist-table-day">Day<select aria-label="Schedule day" value={day} disabled={busy} onChange={event => setDay(Number(event.target.value))}>{playlistDays.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label> : <h3>{playlistDays[day]}</h3>}{!nutrition && <label className="playlist-table-rest"><input type="checkbox" checked={draft.restDays.includes(day)} disabled={busy} onChange={event => { if (event.target.checked && !nutrition && dayItems.length) return setError('Move or remove exercises before marking this day as rest.'); setError(''); setDraft({ ...draft, restDays: event.target.checked ? [...draft.restDays, day].sort() : draft.restDays.filter(value => value !== day) }) }} />Rest day</label>}</div>

        <div className="playlist-schedule-wrap"><table className="playlist-schedule-table"><caption className="sr-only">{playlistDays[day]} {nutrition ? 'food' : 'exercise'} schedule</caption><thead><tr><th scope="col">Time</th><th scope="col">{nutrition ? 'Food' : 'Exercise'}</th><th scope="col">{nutrition ? 'Portion & meal' : 'Targets'}</th><th scope="col"><span className="sr-only">Remove</span></th></tr></thead><tbody>
          {dayItems.map((item, index) => {
            const id = 'foodId' in item ? item.foodId : item.exerciseId
            const name = catalog.find(entry => entry.id === id)?.name ?? 'Library item'
            return <tr key={item.id}>
              <td data-label="Time"><input aria-label={'Time for ' + name} type="time" value={item.time} disabled={busy} onChange={event => updateItem(item.id, { time: event.target.value })} /></td>
              <td data-label={nutrition ? 'Food' : 'Exercise'}><select aria-label={'Choose replacement for ' + name} value={id} disabled={busy} onChange={event => updateItem(item.id, nutrition ? { foodId: event.target.value } : { exerciseId: event.target.value })}>{catalog.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><button className="playlist-details-button" onClick={event => showDetails(id, event.currentTarget)}>View details</button></td>
              <td data-label={nutrition ? 'Portion & meal' : 'Targets'}>{'foodId' in item ? <div className="playlist-table-food-fields"><label><span>Grams</span><input aria-label={'Grams for ' + name} type="number" min={1} max={2000} step="0.01" value={item.grams} disabled={busy} onChange={event => updateItem(item.id, { grams: Number(event.target.value) })} /></label><select aria-label={'Meal for ' + name} value={item.meal} disabled={busy} onChange={event => updateItem(item.id, { meal: event.target.value as typeof item.meal })}>{playlistMeals.map(meal => <option key={meal}>{meal}</option>)}</select></div> : <details className="playlist-table-targets"><summary>{item.sets} sets &times; {item.target} {item.targetType === 'reps' ? 'reps' : 'sec'} <span>Edit</span></summary><div className="playlist-item-fields"><label>Sets<input aria-label={'Sets for ' + name} type="number" min={1} max={20} value={item.sets} disabled={busy} onChange={event => updateItem(item.id, { sets: Number(event.target.value) })} /></label><label>Target type<select aria-label={'Target type for ' + name} value={item.targetType} disabled={busy} onChange={event => updateItem(item.id, { targetType: event.target.value as 'reps' | 'time' })}><option value="reps">Repetitions</option><option value="time">Seconds</option></select></label><label>Per set<input aria-label={'Target for ' + name} type="number" min={1} max={item.targetType === 'reps' ? 100 : 3600} value={item.target} disabled={busy} onChange={event => updateItem(item.id, { target: Number(event.target.value) })} /></label><label>Rest seconds<input aria-label={'Rest for ' + name} type="number" min={0} max={600} value={item.restSeconds} disabled={busy} onChange={event => updateItem(item.id, { restSeconds: Number(event.target.value) })} /></label></div></details>}
                {draft.duration === 'week' && <details className="playlist-row-options"><summary>Move / reorder</summary><select aria-label={'Day for ' + name} value={item.day} disabled={busy} onChange={event => updateItem(item.id, { day: Number(event.target.value) })}>{playlistDays.map((name, index) => <option key={name} value={index}>{name}</option>)}</select><div><button disabled={busy || index === 0} aria-label={'Move ' + name + ' up'} onClick={() => setDraft({ ...draft, items: movePlaylistItem(draft.items, item.id, -1) })}><ArrowUp size={15} /></button><button disabled={busy || index === dayItems.length - 1} aria-label={'Move ' + name + ' down'} onClick={() => setDraft({ ...draft, items: movePlaylistItem(draft.items, item.id, 1) })}><ArrowDown size={15} /></button></div></details>}
              </td>
              <td className="playlist-table-remove"><button disabled={busy} aria-label={'Remove ' + name} onClick={() => setDraft({ ...draft, items: draft.items.filter(entry => entry.id !== item.id) })}><Trash2 size={16} /></button></td>
            </tr>
          })}
          {!nutrition && draft.restDays.includes(day) ? <tr><td colSpan={4} className="playlist-rest-cell">Rest day. Choose another day to schedule exercises.</td></tr> : <tr className="playlist-blank-row"><td data-label="Time"><input aria-label="Time for new item" type="time" value={newTime} disabled={busy} onChange={event => setNewTime(event.target.value)} /></td><td data-label={nutrition ? 'Food' : 'Exercise'}><select aria-label={nutrition ? 'Choose food' : 'Choose exercise'} value="" disabled={busy || draft.items.length >= 350 || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)} onChange={event => add(event.target.value)}><option value="" disabled>{nutrition ? '+ Choose a food' : '+ Choose an exercise'}</option>{catalog.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></td><td className="playlist-blank-note">{nutrition ? '100 g by default' : '3 sets by default'}</td><td /></tr>}
        </tbody></table></div>
        {nutrition && invalidPortions && <p className="playlist-error" role="alert">Enter 1-2,000 edible grams per food.</p>}
        {nutrition && dayItems.length > 0 && !invalidPortions && <div className="playlist-table-totals"><span>{formatNutrient(totals.energyKcal, 0)} kcal</span><span>{formatNutrient(totals.proteinG, 1)} g protein</span><span>{formatNutrient(totals.carbsG, 1)} g carbs</span><span>{formatNutrient(totals.fatG, 1)} g fat</span></div>}
      </section>
      <section className="playlist-build-step playlist-step-review" aria-labelledby="playlist-review-title">
        <div className="playlist-step-title"><span>3</span><div><h3 id="playlist-review-title">Ready when you are</h3><p>Check your choices and times, then save. You can come back and edit later.</p></div></div>
        <div className="playlist-review-summary"><strong>{draft.name.trim() || 'Your new playlist'}</strong><span>{draft.duration === 'day' ? 'One day - ' + playlistDays[draft.selectedDay] : 'Monday to Sunday'} &middot; {draft.items.length} {nutrition ? 'food portions' : 'exercises'} &middot; {!nutrition && <>{draft.restDays.length} rest {draft.restDays.length === 1 ? 'day' : 'days'}</>}</span></div>
        {!draft.name.trim() && <p className="playlist-save-hint">First, add a playlist name in step 1 to enable saving.</p>}
        <div className="playlist-editor-actions"><button className="playlist-primary" onClick={save} disabled={busy || !dirty || !draft.name.trim()}><Save size={16} />{busy ? 'Saving...' : 'Save playlist'}</button></div>
        <p className="playlist-save-explainer">Back to playlists discards unsaved changes. Only Save playlist keeps your edits.</p>
        <p className="playlist-save-explainer">{online ? 'Save keeps a device copy and attempts to sync it to your account.' : 'Save keeps this playlist on your device. It will sync when you reconnect.'}</p>
        <details className="playlist-extra-options" key={draft.id} open={base?.syncStatus === 'conflict' ? true : undefined}><summary>More options</summary><div><button className="playlist-secondary" disabled={busy} onClick={() => { setDraft({ ...draft, id: crypto.randomUUID(), name: `${draft.name || 'Playlist'} copy`.slice(0, 80), items: draft.items.map(item => ({ ...item, id: crypto.randomUUID() })) }); setBase(null); setConfirmDelete(false) }}><Copy size={15} />Make a copy</button>{base && <button className="playlist-delete" disabled={busy} onClick={() => setConfirmDelete(!confirmDelete)}><Trash2 size={15} />Delete</button>}</div></details>
      {confirmDelete && <div className="playlist-delete-confirm"><p>Delete “{base?.name}” from your account? This cannot be undone.</p><button onClick={remove} disabled={busy}>Delete playlist</button><button onClick={() => setConfirmDelete(false)} disabled={busy}>Keep playlist</button></div>}
      </section>
    </div> : <><div className="playlist-collection-heading"><h3>Your collection <span>{collection.length}</span></h3><p>{nutrition ? 'Meals you enjoy, on your schedule.' : 'Your favorite moves, in your own order.'}</p></div><div className="playlist-collection-toolbar"><label className="playlist-search"><Search size={18} /><input aria-label="Search your playlists" value={query} placeholder="Search your collection" onChange={event => setQuery(event.target.value)} /></label><label className="playlist-length-filter"><CalendarDays size={17} aria-hidden="true" /><select aria-label="Filter playlist length" value={lengthFilter} onChange={event => setLengthFilter(event.target.value)}><option value="all">All lengths</option><option value="day">One day</option><option value="week">One week</option></select></label></div>{loading ? <div className="playlist-loading" role="status">Loading your account playlists…</div> : !collection.length ? <div className="playlist-collection-empty"><div className="playlist-empty-art" aria-hidden="true"><span /><span /><span>{nutrition ? <Apple size={32} /> : <Dumbbell size={32} />}</span></div><div><p className="playlist-eyebrow">A LITTLE STRUCTURE. ALL YOURS.</p><h3>Your next {nutrition ? 'menu' : 'lineup'} starts here.</h3><p>Collect {nutrition ? 'foods you love' : 'your favorite exercises'}, choose your days, and set your own pace.</p><small>Use Create playlist above to begin.</small></div></div> : <div className="playlist-collection">{collection.filter(item => (lengthFilter === 'all' || item.duration === lengthFilter) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase().trim())).map(item => <button className="playlist-collection-card" key={item.id} onClick={() => open(item)}><div className="playlist-cover-art">{nutrition ? <Apple size={34} /> : <Dumbbell size={34} />}<span>{item.duration === 'day' ? '01 DAY' : '07 DAYS'}</span></div><div><p className="playlist-eyebrow">{item.duration === 'day' ? `ONE DAY - ${playlistDays[item.selectedDay]}` : 'ONE WEEK'}</p><h3>{item.name}</h3><p>{item.items.length} {nutrition ? 'food portions' : 'exercises'} - {item.syncStatus === 'pending' ? 'Pending sync' : item.syncStatus === 'conflict' ? 'Sync conflict' : 'Available offline'}</p><small>{item.description || 'Your own plan, at your own pace.'}</small></div><ArrowRight size={19} /></button>)}</div>}{!loading && collection.length > 0 && !collection.some(item => (lengthFilter === 'all' || item.duration === lengthFilter) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase().trim())) && <p className="playlist-empty-day">No playlists match this search and plan length.</p>}</>}
    {detailsId && nutrition && foodById(detailsId) && <FoodDetails food={foodById(detailsId)!} onClose={closeDetails} />}
    {detailsId && !nutrition && seedExerciseById(detailsId) && <ExerciseDetails exercise={seedExerciseById(detailsId)!} onClose={closeDetails} />}
  </section>
}
