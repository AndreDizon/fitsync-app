'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Plus, RefreshCw } from 'lucide-react'
import { gymRequest, gymTimeZoneLabel, type GymMembership } from '@/lib/gym-groups'
import { incomeCsv, incomeMoney, type GymIncomeData, type IncomeEntry } from '@/lib/gym-income'
import { dateInZone } from '../../shared/progress'
import { useConfirmation } from './confirm-dialog'
import '@/app/gym-income.css'

const months=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat(undefined,{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,i,1))))
const methods=[['cash','Cash'],['bank','Bank transfer'],['ewallet','E-wallet'],['card','Card (received outside FitSync)'],['other','Other']]
const day=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',year:'numeric',month:'short',day:'numeric'})

export function GymIncome({membership,locked}:{membership:GymMembership;locked:boolean}){
 const today=dateInZone(membership.gym?.time_zone||'Asia/Manila')
 const [year,setYear]=useState(Number(today.slice(0,4))),[month,setMonth]=useState(Number(today.slice(5,7))),[page,setPage]=useState(0),[version,setVersion]=useState(0),[currency,setCurrency]=useState('')
 const [data,setData]=useState<GymIncomeData|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [periodId,setPeriodId]=useState(''),[amount,setAmount]=useState(''),[receivedOn,setReceivedOn]=useState(today),[method,setMethod]=useState('cash'),[notes,setNotes]=useState('')
 const [refund,setRefund]=useState<IncomeEntry|null>(null),[voiding,setVoiding]=useState<IncomeEntry|null>(null),[reason,setReason]=useState('')
 const generation=useRef(0),requestKey=useRef<string|null>(null),composer=useRef<HTMLDetailsElement>(null),actions=useRef<HTMLDivElement>(null),live=useRef(true)
 const confirm=useConfirmation(),filters={year,month,page}
 useEffect(()=>{requestKey.current=null},[periodId,amount,receivedOn,method,notes,refund?.id])
 useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
 useEffect(()=>{
  const abort=new AbortController(),run=++generation.current
  setLoading(true);setError('')
  gymRequest('income',{year,month,page},AbortSignal.any([abort.signal,AbortSignal.timeout(30000)])).then((result:GymIncomeData)=>{
   if(run!==generation.current)return;setData(result)
   if(page>0&&page*25>=result.total)setPage(Math.max(0,Math.ceil(result.total/25)-1))
  }).catch(e=>{if(!abort.signal.aborted&&run===generation.current){setError(e.message);setData(null)}}).finally(()=>{if(!abort.signal.aborted&&run===generation.current)setLoading(false)})
  return()=>{generation.current++;abort.abort()}
 },[membership,year,month,page,version])
 const disabled=locked||loading||busy,selected=data?.periods.find(p=>p.id===periodId)
 const currencyOptions=data?.currencies||['PHP'],shownCurrency=currencyOptions.includes(currency)?currency:data?.summary[0]?.currency||data?.periods[0]?.currency||currencyOptions[0]
 const visibleMonths=data?.summary.filter(row=>row.currency===shownCurrency)||[]
 const selectedTotal=visibleMonths.find(row=>row.month===`${year}-${String(month).padStart(2,'0')}`)

 async function write(action:string,doc:Record<string,unknown>,message:string){
  if(disabled||!live.current)return false
  const run=generation.current;setBusy(true);setError('');setNotice('')
  try{
   const result:GymIncomeData=await gymRequest(action,{...filters,...doc})
   if(run!==generation.current)return false
   setData(result);setNotice(message);return true
  }catch(e){if(run===generation.current)setError((e as Error).message);return false}
  finally{setBusy(false)}
 }
 async function submit(event:React.FormEvent){
  event.preventDefault()
  if(!await confirm({title:refund?'Record a refund paid?':'Record a payment received?',message:`Record ${incomeMoney(amount,refund?.currency||selected?.currency||'PHP')} on ${day(receivedOn)}? Confirm that the money was ${refund?'refunded':'received'} outside FitSync.`,confirmLabel:refund?'Record refund':'Record payment'}))return
  requestKey.current??=crypto.randomUUID()
  const ok=await write(refund?'record_refund':'record_payment',{periodId:refund?undefined:periodId,paymentId:refund?.id,amount,receivedOn,method,notes,requestId:requestKey.current},refund?'Refund recorded.':'Payment recorded.')
  if(ok){setYear(Number(receivedOn.slice(0,4)));setMonth(Number(receivedOn.slice(5,7)));setPage(0);setCurrency(refund?.currency||selected?.currency||shownCurrency);setPeriodId('');setAmount('');setNotes('');setRefund(null);requestKey.current=null;if(composer.current)composer.current.open=false}
 }
 function openRefund(entry:IncomeEntry){
  setRefund(entry);setVoiding(null);setAmount(entry.refundable);setReceivedOn(today);setMethod(entry.method);setNotes('');setError('');setNotice('')
  if(composer.current){composer.current.open=true;composer.current.scrollIntoView({block:'center',behavior:'instant'});requestAnimationFrame(()=>composer.current?.querySelector<HTMLInputElement>('input')?.focus())}
 }
 async function exportMonth(){
  if(disabled)return
  const run=generation.current;setBusy(true);setError('')
  try{
   const entries:IncomeEntry[]=[];let total=0,snapshot:string|null=null
   for(let cursor=0;cursor<10;cursor++){
    const exported:{entries:IncomeEntry[];total:number;snapshot:string|null}=await gymRequest('income_export',{year,month,page:cursor})
    if(run!==generation.current)return
    if(cursor===0){total=exported.total;snapshot=exported.snapshot}
    else if(total!==exported.total||snapshot!==exported.snapshot)throw new Error('Records changed during export. Refresh and export again.')
    entries.push(...exported.entries);if(entries.length>=total)break
   }
   if(entries.length!==total||new Set(entries.map(e=>e.id)).size!==total)throw new Error('The export was incomplete. Refresh and try again.')
   const url=URL.createObjectURL(new Blob([incomeCsv(entries)],{type:'text/csv;charset=utf-8'})),link=document.createElement('a')
   link.href=url;link.download=`gym-income-${year}-${String(month).padStart(2,'0')}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
   setNotice('Monthly payment records exported, including voided records.')
  }catch(e){if(run===generation.current)setError((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="gg-income"><div className="gg-section-heading"><div><h3>Gym income</h3><p>Track payments you received and refunds you paid.</p></div><div className="gg-actions"><button className="gg-primary" type="button" disabled={disabled} onClick={()=>{if(refund){setRefund(null);setPeriodId('');setAmount('');setNotes('');setReceivedOn(today)}if(composer.current){composer.current.open=true;composer.current.scrollIntoView({block:'center',behavior:'instant'});requestAnimationFrame(()=>composer.current?.querySelector<HTMLSelectElement>('#income-period')?.focus())}}}><Plus size={16}/>Record payment</button><button type="button" disabled={disabled} aria-label="Refresh income" onClick={()=>setVersion(n=>n+1)}><RefreshCw size={16}/></button></div></div>

  {error&&<p className="gg-feedback gg-error" role="alert">{error}<button type="button" disabled={busy} onClick={()=>setVersion(n=>n+1)}>Retry income</button></p>}
  {notice&&<p className="gg-feedback gg-success" role="status">{notice}</p>}
  {loading&&<p className="gg-empty" role="status">Loading income records…</p>}
  {data&&!loading&&<>
   <div className="gg-income-filters"><div className="gg-field"><label htmlFor="income-month">Month</label><select id="income-month" disabled={disabled} value={month} onChange={e=>{setMonth(Number(e.target.value));setPage(0)}}>{months.map((label,index)=><option key={label} value={index+1}>{label}</option>)}</select></div><div className="gg-field"><label htmlFor="income-year">Year</label><select id="income-year" disabled={disabled} value={year} onChange={e=>{setYear(Number(e.target.value));setPage(0)}}>{data.years.map(y=><option key={y}>{y}</option>)}</select></div><div className="gg-field"><label htmlFor="income-currency">Summary currency</label><select id="income-currency" value={shownCurrency} onChange={e=>setCurrency(e.target.value)}>{currencyOptions.map(c=><option key={c}>{c}</option>)}</select></div></div>

   <dl className="gg-income-summary" aria-label="Selected month totals">{[['Received',selectedTotal?.received],['Refunds',selectedTotal?.refunds],['Net received',selectedTotal?.net]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{incomeMoney(value||'0',shownCurrency)}</dd></div>)}</dl>
   <details className="gg-compose gg-payment-compose" ref={composer}><summary><Plus size={16}/>{refund?'Record a refund':'Record a payment received'}</summary><form onSubmit={submit}><fieldset disabled={disabled}>
    {refund?<div><strong>Refund for {refund.member_name}</strong><p className="gg-small">{refund.plan_name} · Paid {day(refund.received_on)} · Up to {incomeMoney(refund.refundable,refund.currency)} refundable.</p><button type="button" onClick={()=>{setRefund(null);setAmount('');setNotes('')}}>Switch to payment</button></div>:<div className="gg-field"><label htmlFor="income-period">Membership record</label><select id="income-period" required value={periodId} onChange={e=>{setPeriodId(e.target.value);setAmount(data.periods.find(p=>p.id===e.target.value)?.outstanding||'')}}><option value="">Choose a membership record</option>{data.periods.map(p=><option key={p.id} value={p.id} disabled={Number(p.outstanding)<=0}>{p.member_name} · {p.plan_name} · {day(p.starts_on)} · {incomeMoney(p.outstanding,p.currency)} outstanding{p.cancelled?' · cancelled record':''}</option>)}</select>{!data.periods.length&&<p className="gg-small">Record a member’s plan dates in Membership first.</p>}</div>}
    <div className="gg-income-payment-fields"><label>{refund?'Refund amount':'Amount received'} ({refund?.currency||selected?.currency||'PHP'})<input type="number" inputMode="decimal" required min="0.01" max={refund?.refundable||selected?.outstanding||'999999'} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>{refund?'Refund date':'Date received'} (gym local)<input type="date" required min={refund?.received_on||'2000-01-01'} max={today} value={receivedOn} onChange={e=>setReceivedOn(e.target.value)}/></label></div>
    <div className="gg-field"><label htmlFor="income-method">Payment method</label><select id="income-method" value={method} onChange={e=>setMethod(e.target.value)}>{methods.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><label>Payment note (optional)<input maxLength={240} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="A short note to identify this record"/></label><p className="gg-small">Record money already received or refunded outside FitSync.</p><button className="gg-primary" type="submit" disabled={!refund&&!selected}>{refund?'Record refund':'Save payment record'}</button>
   </fieldset></form></details>
   <div className="gg-section-heading gg-income-records-heading"><div><h3>{months[month-1]} {year} payment records</h3><p>{data.total} records · All currencies · Voided entries stay visible and do not count in totals.</p></div><button type="button" disabled={disabled||!data.total} onClick={()=>void exportMonth()}><Download size={16}/>Export month CSV</button></div>

   {!data.entries.length?<p className="gg-empty">No payments or refunds recorded for this month.</p>:<div className="gg-income-table-wrap gg-income-desktop-ledger" role="region" aria-label="Payment records" tabIndex={0}><table className="gg-income-table gg-income-ledger"><thead><tr><th scope="col">Date</th><th scope="col">Member & plan</th><th scope="col">Type</th><th scope="col">Amount</th><th scope="col">Method</th><th scope="col">Status & actions</th></tr></thead><tbody>{data.entries.map(e=><tr key={e.id} className={e.voided?'is-voided':''}><td>{day(e.received_on)}</td><td><strong>{e.member_name}</strong><span>{e.plan_name}</span>{e.notes&&<small>{e.notes}</small>}<small>Recorded by {e.recorded_by}</small></td><td>{e.kind==='refund'?'Refund':'Payment'}</td><td>{incomeMoney(e.amount,e.currency)}<small>{e.currency}</small></td><td>{methods.find(([key])=>key===e.method)?.[1]||e.method}</td><td>{e.voided?<><strong>Voided</strong><small>{e.void_reason}</small></>:<div className="gg-actions">{e.kind==='payment'&&Number(e.refundable)>0&&<button type="button" disabled={disabled} onClick={()=>openRefund(e)}>Refund</button>}<button type="button" className="gg-danger" disabled={disabled} onClick={()=>{setVoiding(e);setReason('');requestAnimationFrame(()=>actions.current?.scrollIntoView({block:'center',behavior:'instant'}))}}>Void record</button></div>}</td></tr>)}</tbody></table></div>}

   {!!data.entries.length&&<ul className="gg-income-mobile-ledger" aria-label="Payment records">{data.entries.map(e=><li key={e.id} className={e.voided?'is-voided':''}><div className="gg-income-entry-heading"><strong>{e.member_name}</strong><strong>{incomeMoney(e.amount,e.currency)}</strong></div><p>{e.kind==='refund'?'Refund':'Payment'} &middot; {day(e.received_on)}{e.voided?' \u00b7 Voided':''}</p><details><summary>Details & actions</summary><p>{e.plan_name} &middot; {methods.find(([key])=>key===e.method)?.[1]||e.method}</p>{e.notes&&<p>{e.notes}</p>}<p>Recorded by {e.recorded_by}</p>{e.voided?<p>Voided: {e.void_reason}</p>:<div className="gg-actions">{e.kind==='payment'&&Number(e.refundable)>0&&<button type="button" disabled={disabled} onClick={()=>openRefund(e)}>Refund</button>}<button type="button" className="gg-danger" disabled={disabled} onClick={()=>{setVoiding(e);setReason('');requestAnimationFrame(()=>actions.current?.scrollIntoView({block:'center',behavior:'instant'}))}}>Void record</button></div>}</details></li>)}</ul>}
   {voiding&&<div className="gg-void-editor" ref={actions}><h4>Void this {voiding.kind} record?</h4><p className="gg-small">{voiding.member_name} · {incomeMoney(voiding.amount,voiding.currency)} · {day(voiding.received_on)}. Voiding corrects the ledger; it does not move money.</p><form onSubmit={async e=>{e.preventDefault();if(!await confirm({title:'Void this income record?',message:'Keep the record for history but exclude it from all income totals?',confirmLabel:'Void record',destructive:true}))return;if(await write('void_income',{id:voiding.id,reason},'Record voided. Monthly totals updated.'))setVoiding(null)}}><fieldset disabled={disabled}><label>Reason for voiding<input required minLength={3} maxLength={240} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="gg-actions"><button className="gg-danger" type="submit">Void record</button><button type="button" onClick={()=>setVoiding(null)}>Cancel</button></div></fieldset></form></div>}
   {data.total>25&&<nav className="gg-pagination" aria-label="Income record pages"><button type="button" disabled={disabled||page===0} onClick={()=>setPage(n=>n-1)}>Previous</button><span>Page {page+1} of {Math.ceil(data.total/25)}</span><button type="button" disabled={disabled||(page+1)*25>=data.total} onClick={()=>setPage(n=>n+1)}>Next</button></nav>}
   <details className="gg-income-yearly"><summary>View yearly summary &middot; {year}</summary>   <div className="gg-income-table-wrap" role="region" aria-label="Monthly income totals" tabIndex={0}><table className="gg-income-table"><caption>{year} monthly income · {shownCurrency}</caption><thead><tr><th scope="col">Month</th><th scope="col">Received</th><th scope="col">Refunds</th><th scope="col">Net received</th></tr></thead><tbody>{months.map((label,index)=>{const item=visibleMonths.find(row=>row.month===`${year}-${String(index+1).padStart(2,'0')}`);return <tr className={month===index+1?'is-selected':''} key={label}><th scope="row"><button type="button" disabled={disabled} aria-pressed={month===index+1} onClick={()=>{setMonth(index+1);setPage(0)}}>{label}</button></th><td>{incomeMoney(item?.received||'0',shownCurrency)}</td><td>{incomeMoney(item?.refunds||'0',shownCurrency)}</td><td><strong>{incomeMoney(item?.net||'0',shownCurrency)}</strong></td></tr>})}</tbody></table></div></details>
   <details className="gg-income-help"><summary>How totals work</summary><p className="gg-small">Plan fees count only after you record a payment. Voided records stay in history but do not count in totals.</p>  <p className="gg-small">Dates follow {gymTimeZoneLabel(membership.gym?.time_zone||'Asia/Manila')}. Currencies are kept separate. Net received excludes expenses.</p></details>
  </>}
 </section>
}
