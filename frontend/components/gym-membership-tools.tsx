'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { type GymAction, type GymMembership, type GymPeriod, type GymPlan } from '@/lib/gym-groups'
import { dateInZone, shiftDate } from '../../shared/progress'
import { gymRenewalRecords } from '../../shared/gym-workflow'
import { emptyHistoryRange, historyOverlaps } from '../../shared/gym-history'
import { HistoryDateFilter, HistoryPagination } from './gym-history-filter'
import { useConfirmation } from './confirm-dialog'

const pageSize = 10
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
const day = (date: string) => new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })

export function GymMembershipPlans({ membership, owner, locked, onAction, view: controlledView, renewalsOnly = false, initialMember, referenceDay }: { membership: GymMembership; owner: string; locked: boolean; onAction: GymAction; view?: 'records' | 'plans'; renewalsOnly?: boolean; initialMember?: string; referenceDay?: string }) {
 const admin = membership.role === 'admin', manager = admin || membership.role === 'staff'
 const plans = membership.plans || [], periods = membership.membershipPeriods || []
 const zone = membership.gym?.time_zone || 'Asia/Manila', today = referenceDay || dateInZone(zone)
 const [localView, setView] = useState('records')
 const view = controlledView || localView
 const [endingSoon,setEndingSoon]=useState(renewalsOnly)
 useEffect(()=>{setEndingSoon(renewalsOnly)},[renewalsOnly])
 const renewalIds=new Set(gymRenewalRecords(membership,today).map(p=>p.id))
 const [edit, setEdit] = useState<string | null>(null), [name, setName] = useState(''), [description, setDescription] = useState('')
 const [duration, setDuration] = useState(30), [price, setPrice] = useState('0'), [currency, setCurrency] = useState('PHP')
 const [person, setPerson] = useState(owner), [chosen, setChosen] = useState(''), [start, setStart] = useState(today), [end, setEnd] = useState(shiftDate(today, 29))
 const [member, setMember] = useState(initialMember || (manager ? 'all' : owner)), [status, setStatus] = useState('all'), [search, setSearch] = useState(''), [range, setRange] = useState(emptyHistoryRange), [recordPage, setRecordPage] = useState(0)
 useEffect(()=>{setMember(initialMember || (manager?'all':owner));setRecordPage(0)},[initialMember,manager,owner])
 const [planSearch, setPlanSearch] = useState(''), [availability, setAvailability] = useState('all'), [planPage, setPlanPage] = useState(0)
 const editor = useRef<HTMLDetailsElement>(null), assigner = useRef<HTMLDetailsElement>(null), confirm = useConfirmation()
 const memberName = (id: string) => membership.members.find(m => m.user_id === id)?.username || 'Former member'
 const selected = plans.find(p => p.id === chosen)
 const rows = periods.filter(p => (!endingSoon || renewalIds.has(p.id)) && (manager ? member === 'all' || p.user_id === member : p.user_id === owner) && (status === 'all' || p.status === status) && historyOverlaps(p.starts_on, p.ends_on, range) && `${memberName(p.user_id)} ${p.plan_name}`.toLowerCase().includes(search.trim().toLowerCase()))
 const catalog = plans.filter(p => (availability === 'all' || p.archived === (availability === 'archived')) && `${p.name} ${p.description}`.toLowerCase().includes(planSearch.trim().toLowerCase()))
 const rp = Math.min(recordPage, Math.max(0, Math.ceil(rows.length / pageSize) - 1)), pp = Math.min(planPage, Math.max(0, Math.ceil(catalog.length / pageSize) - 1))
 function choosePlan(id: string) { setChosen(id); const plan = plans.find(p => p.id === id); if (plan && start) setEnd(shiftDate(start, plan.duration_days - 1)) }
 function resetPlan() { setEdit(null); setName(''); setDescription(''); setDuration(30); setPrice('0'); setCurrency('PHP') }
 function editPlan(plan: GymPlan) {
  setEdit(plan.id); setName(plan.name); setDescription(plan.description); setDuration(plan.duration_days); setPrice(String(plan.price)); setCurrency(plan.currency)
  if (editor.current) { editor.current.open = true; editor.current.querySelector('input')?.focus() }
 }
 function renew(record: GymPeriod) {
  const plan = plans.find(p => p.id === record.plan_id && !p.archived)
  const lastEnd = periods.filter(p => p.user_id === record.user_id && !p.cancelled).map(p => p.ends_on).sort().at(-1)
  const nextStart = lastEnd && lastEnd >= today ? shiftDate(lastEnd, 1) : today
  setPerson(record.user_id); setChosen(plan?.id || ''); setStart(nextStart); setEnd(shiftDate(nextStart, (plan?.duration_days || 30) - 1))
  if (assigner.current) { assigner.current.open = true; assigner.current.scrollIntoView({ block: 'center', behavior: 'instant' }); requestAnimationFrame(() => assigner.current?.querySelector('select')?.focus()) }
 }
 function clearRecords() { setEndingSoon(false); setMember(manager ? 'all' : owner); setStatus('all'); setSearch(''); setRange(emptyHistoryRange); setRecordPage(0) }
 const recordFilters = !!(endingSoon || search || range.from || range.to || status !== 'all' || manager && member !== 'all')
 const recordEmpty = recordFilters ? 'No membership records match these filters.' : 'No membership dates recorded yet.'

 return <section className="gg-membership-workspace">
  <h3>Memberships</h3><p className="gg-small">Member dates and renewals are separate from the plans you offer. Listed fees do not confirm payment.</p>
  {!controlledView && <nav className="gg-membership-modes" aria-label="Membership workspace">
   <button type="button" className="gg-member-mode" aria-pressed={view === 'records'} aria-controls="gym-member-records" onClick={() => setView('records')}><strong>Member records &amp; renewals</strong><span>Who is enrolled and when their plan ends</span></button>
   <button type="button" className="gg-catalog-mode" aria-pressed={view === 'plans'} aria-controls="gym-plan-catalog" onClick={() => setView('plans')}><strong>Plan catalog</strong><span>Plan names, durations and listed fees</span></button>
  </nav>}
  {view === 'records' ? <section id="gym-member-records" className="gg-membership-records-panel" aria-label="Member records and renewals">
   <header className="gg-membership-section-heading"><h4>Member records &amp; renewals</h4><p>Review coverage dates, then add a new record to renew a member.</p></header>
   {manager && <details className="gg-compose gg-renewal-compose" ref={assigner}><summary><Plus size={16}/>Add or renew a member</summary>
    <form onSubmit={async e => {
     e.preventDefault()
     if (!await confirm({ title: 'Record this membership?', message: `Record ${selected?.name || 'this plan'} for ${memberName(person)} from ${day(start)} to ${day(end)}? This does not confirm a payment.`, confirmLabel: 'Record membership' })) return
     if (await onAction('assign_plan', { userId: person, planId: chosen, startsOn: start, endsOn: end }, 'Membership dates recorded.')) { setEndingSoon(false); setMember(person); setStatus('all'); setSearch(''); setRange(emptyHistoryRange); setRecordPage(0); if (assigner.current) assigner.current.open = false }
    }}><fieldset disabled={locked}>
     <div className="gg-field"><label htmlFor="gym-plan-member">Member</label><select id="gym-plan-member" value={person} onChange={e => setPerson(e.target.value)}>{membership.members.map(m => <option key={m.user_id} value={m.user_id}>{m.username}{m.user_id === owner ? ' (you)' : ''}</option>)}</select></div>
     <div className="gg-field"><label htmlFor="gym-plan-choice">Membership plan</label><select id="gym-plan-choice" required value={chosen} onChange={e => choosePlan(e.target.value)}><option value="">Choose a plan</option>{plans.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name} · {p.duration_days} days · {money(p.price, p.currency)}</option>)}</select></div>
     {!plans.some(p => !p.archived) && <p className="gg-small">No available plans. {admin ? 'Open Plan catalog to create or restore one.' : 'Ask the gym admin to add a plan.'}</p>}
     <div className="gg-date-fields"><label>Membership starts<input type="date" required value={start} onChange={e => { setStart(e.target.value); if (selected && e.target.value) setEnd(shiftDate(e.target.value, selected.duration_days - 1)) }}/></label><label>Membership expires<input type="date" required min={start || undefined} value={end} onChange={e => setEnd(e.target.value)}/></label></div>
     <p className="gg-small">Renew adds a separate record after existing coverage ends. Check the suggested dates before saving; memberships cannot overlap.</p>
     <button className="gg-primary" type="submit" disabled={!chosen}>Record membership</button>
    </fieldset></form>
   </details>}
   <div className="gg-membership-filter-row">
    <div className="gg-field"><label htmlFor="gym-record-search">Search records</label><input id="gym-record-search" type="search" maxLength={100} placeholder={manager ? 'Member or plan name' : 'Plan name'} value={search} onChange={e => { setSearch(e.target.value); setRecordPage(0) }}/></div>
    {manager && <div className="gg-field"><label htmlFor="gym-history-member">Filter by member</label><select id="gym-history-member" value={member} onChange={e => { setMember(e.target.value); setRecordPage(0) }}><option value="all">All members</option>{membership.members.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}</select></div>}
    <div className="gg-field"><label htmlFor="gym-record-status">Record status</label><select id="gym-record-status" value={status} onChange={e => { setStatus(e.target.value); setRecordPage(0) }}>{['all', 'active', 'upcoming', 'expired', 'cancelled'].map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s[0].toUpperCase() + s.slice(1)}</option>)}</select></div>
   </div>
   {manager&&<label className="gg-renewal-filter"><input type="checkbox" checked={endingSoon} onChange={e=>{setEndingSoon(e.target.checked);setRecordPage(0)}}/>Needs renewal within 7 days</label>}
   <HistoryDateFilter label="Active during date range" zone={zone} value={range} onChange={next => { setRange(next); setRecordPage(0) }}/>
   <div className="gg-membership-result-count"><p className="gg-meta" role="status">{rows.length} {rows.length === 1 ? 'record' : 'records'} · {pageSize} per page · Dates include the expiry day.</p>{recordFilters && <button type="button" onClick={clearRecords}>Reset all filters</button>}</div>
   {!rows.length ? <p className="gg-empty">{recordEmpty}</p> : <>
    <p className="gg-membership-table-hint">Scroll the table sideways to see every column and action.</p>
    <div className="gg-membership-table-wrap" role="region" aria-label="Membership records table" tabIndex={0}><table className="gg-membership-table"><caption>Member coverage records</caption><thead><tr>{manager && <th scope="col">Member</th>}<th scope="col">Plan</th><th scope="col">Starts</th><th scope="col">Expires</th><th scope="col">Status</th><th scope="col">Listed fee</th>{manager && <th scope="col">Actions</th>}</tr></thead><tbody>{rows.slice(rp * pageSize, rp * pageSize + pageSize).map(p => <tr key={p.id}>
     {manager && <th scope="row">{memberName(p.user_id)}</th>}<td className="gg-membership-plan-name">{p.plan_name}</td><td>{day(p.starts_on)}</td><td>{day(p.ends_on)}</td><td><span className={'gg-period-status gg-period-' + p.status}>{p.status}</span></td><td>{money(p.price, p.currency)}</td>
     {manager && <td><div className="gg-actions">{!p.cancelled && membership.members.some(m => m.user_id === p.user_id) && <button type="button" disabled={locked} onClick={() => renew(p)}>Renew</button>}{!p.cancelled && <button type="button" className="gg-danger" disabled={locked} onClick={async () => { if (await confirm({ title: 'Cancel this membership record?', message: 'Keep the record in history but stop its renewal reminders. This does not refund a payment or remove the gym member.', confirmLabel: 'Cancel record', destructive: true })) await onAction('cancel_period', { id: p.id }, 'Membership record cancelled.') }}>Cancel record</button>}</div></td>}
    </tr>)}</tbody></table></div>
    <HistoryPagination page={rp} total={rows.length} pageSize={pageSize} previousLabel="Previous" nextLabel="Next" onChange={setRecordPage} label="Membership history pages" disabled={locked}/>
   </>}
  </section> : <section id="gym-plan-catalog" className="gg-membership-catalog-panel" aria-label="Plan catalog">
   <header className="gg-membership-section-heading"><h4>Plan catalog</h4><p>Templates for new memberships. Editing a plan does not change existing member records.</p></header>
   {admin && <details className="gg-compose gg-plan-compose" ref={editor}><summary><Plus size={16}/>{edit ? 'Edit membership plan' : 'Create a membership plan'}</summary><form onSubmit={async e => { e.preventDefault(); if (await onAction('save_plan', { id: edit, name, description, durationDays: duration, price: Number(price), currency }, 'Membership plan saved.')) { resetPlan(); if (editor.current) editor.current.open = false } }}><fieldset disabled={locked}>
    <label>Plan name<input required minLength={3} maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label><label>Plan description<textarea maxLength={500} value={description} onChange={e => setDescription(e.target.value)}/></label>
    <div className="gg-plan-fields"><label>Duration (days)<input type="number" required min={1} max={730} value={duration} onChange={e => setDuration(Number(e.target.value))}/></label><label>Listed fee<input type="number" required min={0} max={999999} step="0.01" value={price} onChange={e => setPrice(e.target.value)}/></label><div className="gg-field"><label htmlFor="gym-plan-currency">Currency</label><select id="gym-plan-currency" value={currency} onChange={e => setCurrency(e.target.value)}>{[...new Set(['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', currency])].map(c => <option key={c}>{c}</option>)}</select></div></div>
    <div className="gg-actions"><button type="submit" className="gg-primary">{edit ? 'Save plan changes' : 'Create plan'}</button>{edit && <button type="button" onClick={() => { resetPlan(); if (editor.current) editor.current.open = false }}>Cancel edit</button>}</div>
   </fieldset></form></details>}
   <div className="gg-membership-filter-row"><div className="gg-field"><label htmlFor="gym-catalog-search">Search plans</label><input id="gym-catalog-search" type="search" maxLength={100} placeholder="Plan name or description" value={planSearch} onChange={e => { setPlanSearch(e.target.value); setPlanPage(0) }}/></div><div className="gg-field"><label htmlFor="gym-catalog-status">Plan availability</label><select id="gym-catalog-status" value={availability} onChange={e => { setAvailability(e.target.value); setPlanPage(0) }}><option value="all">All plans</option><option value="available">Available</option><option value="archived">Archived</option></select></div>{(planSearch || availability !== 'all') && <button type="button" onClick={() => { setPlanSearch(''); setAvailability('all'); setPlanPage(0) }}>Clear plan filters</button>}</div>
   <p className="gg-meta" role="status">{catalog.length} {catalog.length === 1 ? 'plan' : 'plans'} · {pageSize} per page</p>
   {!catalog.length ? <p className="gg-empty">{plans.length ? 'No plans match these filters.' : 'No membership plans yet.'}</p> : <>
    <p className="gg-membership-table-hint">Scroll the table sideways to see every column and action.</p>
    <div className="gg-membership-table-wrap" role="region" aria-label="Membership plans table" tabIndex={0}><table className="gg-membership-table"><caption>Plan templates</caption><thead><tr><th scope="col">Plan</th><th scope="col">Duration</th><th scope="col">Listed fee</th><th scope="col">Availability</th>{admin && <th scope="col">Actions</th>}</tr></thead><tbody>{catalog.slice(pp * pageSize, pp * pageSize + pageSize).map(p => <tr key={p.id}><th scope="row">{p.name}{p.description && <small>{p.description}</small>}</th><td>{p.duration_days} days</td><td>{money(p.price, p.currency)}</td><td><span className={'gg-period-status ' + (p.archived ? 'gg-period-cancelled' : 'gg-period-active')}>{p.archived ? 'Archived' : 'Available'}</span></td>{admin && <td><div className="gg-actions"><button type="button" disabled={locked} onClick={() => editPlan(p)}>Edit plan</button><button type="button" disabled={locked} onClick={async () => { if (await confirm({ title: p.archived ? 'Restore this plan?' : 'Archive this plan?', message: p.archived ? 'Make this plan available for new memberships?' : 'Hide this plan from new memberships? Existing member records stay unchanged.', confirmLabel: p.archived ? 'Restore plan' : 'Archive plan' })) await onAction('archive_plan', { id: p.id, archived: !p.archived }, p.archived ? 'Plan restored.' : 'Plan archived.') }}>{p.archived ? 'Restore' : 'Archive'}</button></div></td>}</tr>)}</tbody></table></div>
    <HistoryPagination page={pp} total={catalog.length} pageSize={pageSize} previousLabel="Previous" nextLabel="Next" onChange={setPlanPage} label="Plan catalog pages" disabled={locked}/>
   </>}
  </section>}
 </section>
}
