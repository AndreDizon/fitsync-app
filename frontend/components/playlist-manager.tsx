'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowLeft, Check, Copy, ListMusic, Save, Trash2 } from 'lucide-react'
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
import { PlaylistCollection } from './playlist-collection'
import { HomeCardArt } from './home-card-art'
import '@/app/playlist-editor.css'

const draftOf = (playlist: Playlist): PlaylistInput => ({ id: playlist.id, kind: playlist.kind, duration: playlist.duration, selectedDay: playlist.selectedDay, restDays: playlist.kind === 'nutrition' || playlist.duration === 'day' ? [] : playlist.restDays, name: playlist.name, description: playlist.description, items: playlist.items })
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
  const playlistNameInput = useRef<HTMLInputElement | null>(null)
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
    if (!nutrition && draft.duration === 'week' && draft.restDays.includes(day)) return setError('This is a rest day. Unmark rest day before adding exercises.')
    const entry = newPlaylistItem(kind, catalogId, day)
    entry.time = newTime
    const [hours, minutes] = newTime.split(':').map(Number)
    const next = Math.min(1439, hours * 60 + minutes + 30)
    setNewTime(String(Math.floor(next / 60)).padStart(2, '0') + ':' + String(next % 60).padStart(2, '0'))
    setDraft({ ...draft, items: [...draft.items, entry] }); setNotice('')
  }
  const changeDuration = (duration: 'day' | 'week') => {
    if (!draft || busy || draft.duration === duration) return
    setError('')
    if (duration === 'day') {
      setDraft({ id: crypto.randomUUID(), kind, duration: 'day', selectedDay: day, restDays: [], name: '', description: '', items: [] })
      setBase(null)
      setNewTime('08:00')
      setConfirmDelete(false)
      setDetailsId(null)
      setNotice('Started a fresh one-day playlist. The previous draft was cleared. Your saved playlists are unchanged.')
      requestAnimationFrame(() => playlistNameInput.current?.focus())
    } else {
      setDraft({ ...draft, duration: 'week' })
      setDay(draft.selectedDay)
      setNotice('Switched to one week. Your existing entries stay on ' + playlistDays[draft.selectedDay] + '. Choose another day below to keep building.')
    }
  }
  return <section className={`playlist-workspace ${nutrition ? 'is-nutrition' : 'is-workout'}`} aria-label={`${nutrition ? 'Nutrition' : 'Workout'} playlists`}>
    <header className="playlist-heading plan-tab-page-heading"><div className="playlist-heading-copy"><div><p className="playlist-eyebrow">MADE BY YOU · BUILT FOR YOUR DAY</p><h2>{nutrition ? 'Your food playlists.' : 'Your workout playlists.'}</h2><p>Pick your favorites. Arrange a day or a week. Make the plan yours.</p></div></div></header>
    <details className="playlist-sync-details" open={draft ? undefined : true}><summary>{online ? 'Offline access & account sync' : 'You are offline - saved edits will sync when connected'}</summary><div className="playlist-status-row"><div className="playlist-account-note"><ListMusic size={19} /><span>{online ? 'Private account playlists with an offline device copy. Saved edits sync while connected.' : 'Offline mode. You can view and edit saved playlists; changes will sync after reconnecting.'} Sign out clears private device copies.</span><button disabled={busy || !online} onClick={() => setAttempt(value => value + 1)}>Sync now</button></div>
    <OfflineLibraryStatus catalog={nutrition ? 'food' : 'exercise'} /></div></details>
    {error && <div className="playlist-error" role="alert"><span>{error}</span><button onClick={() => setAttempt(value => value + 1)} disabled={loading || busy}>Retry loading collection</button>{base && <button disabled={busy} onClick={() => { if (canLeave()) { void reloadAccountPlaylist(base).then(() => { setDraft(null); setBase(null); setAttempt(value => value + 1) }).catch(error => setError(error.message)) } }}>Reload saved version</button>}</div>}
    {notice && <p className="playlist-notice" role="status"><Check size={16} />{notice}</p>}
    {draft ? <div className="playlist-editor">
      <div className="playlist-editor-top"><button className="playlist-text-button" disabled={busy} onClick={closeEditor}><ArrowLeft size={16} />Back to playlists</button><span className={dirty ? 'playlist-unsaved' : 'playlist-saved'}>{dirty ? 'Unsaved changes' : base?.syncStatus === 'pending' ? 'Saved on device - pending sync' : base?.syncStatus === 'conflict' ? 'Sync conflict' : 'Synced - available offline'}</span></div>
      {base?.syncError && <p className="playlist-error" role="status">Sync needs attention: {base.syncError}</p>}{base?.syncStatus === 'conflict' && <div className="playlist-error"><p>Your device edits are preserved. Make a copy to keep them as another playlist, or discard them and use the account version.</p><button disabled={busy || !online} onClick={useAccountVersion}>Use account version</button></div>}

      <div className="playlist-builder-main">
      <section className="playlist-build-step playlist-step-setup" aria-labelledby="playlist-setup-title">
        <div className="playlist-step-title"><span>1</span><div><h3 id="playlist-setup-title">Make it yours</h3><p>Give your playlist a name, then choose one day or a full week.</p></div><HomeCardArt subject="playlist" nutrition={nutrition} /></div>
        <div className="playlist-title-fields">
          <label>Playlist name<input ref={playlistNameInput} aria-label="Playlist name" maxLength={80} value={draft.name} placeholder={nutrition ? 'e.g. My weekday meals' : 'e.g. My full-body workout'} onChange={event => setDraft({ ...draft, name: event.target.value })} disabled={busy} /><small>A name helps you find it in your collection.</small></label>
          <fieldset className="playlist-duration-choice" aria-describedby="playlist-duration-help"><legend>Plan length</legend><div>{(['day', 'week'] as const).map(duration => <button type="button" key={duration} aria-pressed={draft.duration === duration} disabled={busy} onClick={() => changeDuration(duration)}>{duration === 'day' ? 'One day' : 'One week'}<small>{duration === 'day' ? 'A single-day routine' : 'Monday to Sunday'}</small></button>)}</div><p id="playlist-duration-help">{draft.duration === 'week' ? 'Switching to one day clears this draft, including its name, description, entries, and rest days. You will start a new playlist.' : 'Switch to one week to keep these entries and plan the remaining days.'}</p></fieldset>
          {draft.duration === 'day' && <label>Schedule this day<select aria-label="One-day weekday" disabled={busy} aria-describedby="playlist-weekday-help" value={draft.selectedDay} onChange={event => { const selectedDay = Number(event.target.value); setDraft({ ...draft, selectedDay, restDays: [], items: draft.items.map(item => ({ ...item, day: selectedDay })) }); setDay(selectedDay) }}>{playlistDays.map((name, index) => <option key={name} value={index}>{name}</option>)}</select><small id="playlist-weekday-help">Changing the day moves all entries in this playlist to that day.</small></label>}
        </div>
        <details className="playlist-optional-description" key={draft.id}><summary>Add a description <span>optional</span></summary><label>Description<textarea maxLength={240} rows={2} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} disabled={busy} placeholder="A short note about this playlist" /></label></details>
      </section>
      <section className="playlist-build-step playlist-step-items playlist-table-step" aria-labelledby="playlist-items-title">
        <div className="playlist-step-title"><span>2</span><div><h3 id="playlist-items-title">Your schedule</h3><p>Choose {nutrition ? 'your foods and portions' : 'your exercises and targets'}, then set a time for each entry.</p></div></div>
        {draft.duration === 'week' && <>
          <p className="playlist-week-help">Choose a day to edit its schedule. Switching days keeps your entries; save the playlist when you are finished.</p>
          <div className="playlist-week-picker" role="group" aria-label="Choose a day to schedule">
            {playlistDays.map((name, index) => {
              const count = draft.items.filter(item => item.day === index).length
              const rest = !nutrition && draft.restDays.includes(index)
              return <button type="button" key={name} disabled={busy} aria-pressed={day === index} aria-controls="playlist-day-schedule" aria-label={`${name}: ${rest ? 'rest day' : `${count} ${nutrition ? 'food portions' : 'exercises'}`}`} onClick={() => setDay(index)}>
                <span>{name}</span><small>{rest ? 'Rest day' : count ? `${count} ${nutrition ? (count === 1 ? 'portion' : 'portions') : (count === 1 ? 'exercise' : 'exercises')}` : 'Not planned'}</small>
              </button>
            })}
          </div>
        </>}
        <div className="playlist-schedule-top">
          <div className="playlist-day-heading" aria-live="polite"><h3>{playlistDays[day]}</h3><p>{!nutrition && draft.duration === 'week' && draft.restDays.includes(day) ? 'Recovery day. Uncheck rest day to add exercises.' : `${dayItems.length} ${nutrition ? 'food portions' : 'exercises'} scheduled${!dayItems.length ? '. Add your first entry below.' : '.'}`}</p></div>
          {!nutrition && draft.duration === 'week' && <label className="playlist-table-rest"><input type="checkbox" checked={draft.restDays.includes(day)} disabled={busy || dayItems.length > 0} aria-describedby="playlist-rest-help" onChange={event => { setError(''); setDraft({ ...draft, restDays: event.target.checked ? [...draft.restDays, day].sort() : draft.restDays.filter(value => value !== day) }) }} />Rest day</label>}
        </div>
        {!nutrition && draft.duration === 'week' && <p id="playlist-rest-help" className="playlist-day-help">{dayItems.length ? 'To mark this as a rest day, move or remove its exercises first.' : 'Taking a break? Mark this day as rest. Unplanned days are kept empty.'}</p>}

        <div id="playlist-day-schedule" className="playlist-schedule-wrap"><table className="playlist-schedule-table"><caption className="sr-only">{playlistDays[day]} {nutrition ? 'food' : 'exercise'} schedule</caption><thead><tr><th scope="col">Time</th><th scope="col">{nutrition ? 'Food' : 'Exercise'}</th><th scope="col">{nutrition ? 'Portion & meal' : 'Targets'}</th><th scope="col"><span className="sr-only">Remove</span></th></tr></thead><tbody>
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
          {!nutrition && draft.duration === 'week' && draft.restDays.includes(day) ? <tr><td colSpan={4} className="playlist-rest-cell">Rest day. Choose another day to schedule exercises.</td></tr> : <tr className="playlist-blank-row"><td data-label="Time"><input aria-label="Time for new item" type="time" value={newTime} disabled={busy} onChange={event => setNewTime(event.target.value)} /></td><td data-label={nutrition ? 'Food' : 'Exercise'}><select aria-label={nutrition ? 'Choose food' : 'Choose exercise'} value="" disabled={busy || draft.items.length >= 350 || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)} onChange={event => add(event.target.value)}><option value="" disabled>{nutrition ? '+ Choose a food' : '+ Choose an exercise'}</option>{catalog.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></td><td className="playlist-blank-note">{nutrition ? '100 g by default' : '3 sets by default'}</td><td /></tr>}
        </tbody></table></div>
        <p className="playlist-entry-help">{nutrition ? 'Choose a food to add it at 100 g, then adjust the grams and meal. Use View details to check its nutrients.' : 'Choose an exercise to add it with 3 sets. Select Edit beside its targets to change sets, repetitions, timing, and rest.'} A new empty row appears after each addition. The next entry starts 30 minutes later; you can change its time.</p>
        {nutrition && invalidPortions && <p className="playlist-error" role="alert">Enter 1-2,000 edible grams per food.</p>}
        {nutrition && dayItems.length > 0 && !invalidPortions && <div className="playlist-table-totals"><span>{formatNutrient(totals.energyKcal, 0)} kcal</span><span>{formatNutrient(totals.proteinG, 1)} g protein</span><span>{formatNutrient(totals.carbsG, 1)} g carbs</span><span>{formatNutrient(totals.fatG, 1)} g fat</span></div>}
      </section>
      </div>
      <section className="playlist-build-step playlist-step-review" aria-labelledby="playlist-review-title">
        <div className="playlist-review-overview">
        <div className="playlist-step-title"><span>3</span><div><h3 id="playlist-review-title">Review & save</h3><p>Check your schedule, then save your playlist to your collection.</p></div></div>
          <div className="playlist-review-agenda"><h4>Schedule at a glance</h4><p>Select a day to review or change its entries.</p>{(draft.duration === 'week' ? playlistDays.map((_, index) => index) : [draft.selectedDay]).map(index => {
            const entries = draft.items.filter(item => item.day === index)
            const times = entries.map(item => item.time).sort()
            const rest = !nutrition && draft.duration === 'week' && draft.restDays.includes(index)
            return <button type="button" className="playlist-review-day" key={index} disabled={busy} aria-label={'Edit ' + playlistDays[index] + ' schedule'} onClick={() => { setDay(index); requestAnimationFrame(() => { const field = document.querySelector<HTMLInputElement | HTMLSelectElement>('#playlist-day-schedule input, #playlist-day-schedule select'); if (field) field.focus(); else document.getElementById('playlist-items-title')?.scrollIntoView({ block: 'center', behavior: 'instant' }) }) }}><strong>{playlistDays[index]}</strong><span>{rest ? 'Rest day' : entries.length ? `${entries.length} ${nutrition ? 'food portions' : 'exercises'}` : 'Not planned'}</span><small>{times.length ? times[0] + (times.length > 1 ? ' – ' + times[times.length - 1] : '') : rest ? 'Recovery' : 'Add entries'}</small></button>
          })}</div>
        </div>
        <div className="playlist-review-content">
          <div className="playlist-review-identity"><div><span className="playlist-review-label">Playlist name</span><h4>{draft.name.trim() || 'Name your playlist'}</h4>{draft.description.trim() && <p>{draft.description}</p>}</div><button type="button" className="playlist-review-link" disabled={busy} onClick={() => playlistNameInput.current?.focus()}>{draft.name.trim() ? 'Edit name' : 'Add name'}</button></div>
          <dl className="playlist-review-facts"><div><dt>Plan length</dt><dd>{draft.duration === 'day' ? 'One day' : 'One week'}</dd></div><div><dt>{nutrition ? 'Food portions' : 'Exercises'}</dt><dd>{draft.items.length}</dd></div>{draft.duration === 'week' && <div><dt>Days planned</dt><dd>{new Set(draft.items.map(item => item.day)).size} of 7</dd></div>}{!nutrition && draft.duration === 'week' && <div><dt>Rest days</dt><dd>{draft.restDays.length}</dd></div>}</dl>

          <div className="playlist-review-save" aria-live="polite"><h4>{!draft.name.trim() ? 'One thing before you save' : !dirty ? 'Your changes are saved' : 'Ready to save'}</h4><p>{!draft.name.trim() ? 'Add a playlist name using Add name above to enable saving.' : !dirty ? 'Make a change to save an updated version.' : draft.items.length ? 'Save this playlist to keep your schedule. You can edit it again from your collection.' : 'This playlist has no entries yet. You can save it now and add them later.'}</p><button className="playlist-primary" onClick={save} disabled={busy || !dirty || !draft.name.trim()}><Save size={16} />{busy ? 'Saving...' : base ? 'Save changes' : 'Save playlist'}</button><p className="playlist-review-storage">{online ? 'Saves a copy on this device and tries to sync to your account.' : 'You are offline. Saves on this device and queues account sync for when you reconnect.'} Unsaved edits are lost when you leave this editor.</p></div>
        </div>
        <details className="playlist-extra-options" key={draft.id} open={base?.syncStatus === 'conflict' ? true : undefined}><summary>More options</summary><div><button className="playlist-secondary" disabled={busy} onClick={() => { setDraft({ ...draft, id: crypto.randomUUID(), name: `${draft.name || 'Playlist'} copy`.slice(0, 80), items: draft.items.map(item => ({ ...item, id: crypto.randomUUID() })) }); setBase(null); setConfirmDelete(false) }}><Copy size={15} />Make a copy</button>{base && <button className="playlist-delete" disabled={busy} onClick={() => setConfirmDelete(!confirmDelete)}><Trash2 size={15} />Delete</button>}</div></details>
      {confirmDelete && <div className="playlist-delete-confirm"><p>Delete “{base?.name}” from your account? This cannot be undone.</p><button onClick={remove} disabled={busy}>Delete playlist</button><button onClick={() => setConfirmDelete(false)} disabled={busy}>Keep playlist</button></div>}
      </section>
    </div> : <PlaylistCollection collection={collection} loading={loading} busy={busy} nutrition={nutrition} query={query} setQuery={setQuery} lengthFilter={lengthFilter} setLengthFilter={setLengthFilter} onOpen={open} />}
    {detailsId && nutrition && foodById(detailsId) && <FoodDetails food={foodById(detailsId)!} onClose={closeDetails} />}
    {detailsId && !nutrition && seedExerciseById(detailsId) && <ExerciseDetails exercise={seedExerciseById(detailsId)!} onClose={closeDetails} />}
  </section>
}
