'use client'
import { useEffect, useRef, useState } from 'react'
import { gymRequest } from '@/lib/gym-groups'
import {
  AdminModal,
  AdminSectionCard,
  AdminTable,
  AdminReport,
  adminDay,
  adminMoney,
} from './gym-admin-primitives'
import { type AdminPageProps } from './gym-admin-workspace'
import { useConfirmation } from './confirm-dialog'
import { historyOverlaps } from '../../shared/gym-history'
import { gymCollectionsSummary } from '../../shared/gym-collections'
import {
  incomeCsv,
  type GymIncomeData,
  type IncomeEntry,
} from '@/lib/gym-income'

export function GymAdminPayments({ data, locked, run }: AdminPageProps) {
  const [payment, setPayment] = useState(false),
    [currency, setCurrency] = useState('all'),
    [status, setStatus] = useState('all'),
    [year, setYear] = useState(Number(data.today.slice(0, 4))),
    [month, setMonth] = useState(Number(data.today.slice(5, 7))),
    [income, setIncome] = useState<GymIncomeData | null>(null),
    [error, setError] = useState(''),
    [summaryError, setSummaryError] = useState(''),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0),
    [adjust, setAdjust] = useState<{
      entry: IncomeEntry
      kind: 'refund' | 'void'
    } | null>(null)
  const zone = data.gym!.time_zone || 'Asia/Manila',
    currencies = Array.from(new Set(data.balances.map((p) => p.currency))),
    confirm = useConfirmation()
  useEffect(() => {
    const abort = new AbortController()
    setIncome(null)
    setSummaryError('')
    gymRequest(
      'income',
      { year, month, page: 0 },
      AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
    )
      .then((d) => {
        if (!abort.signal.aborted) setIncome(d)
      })
      .catch((e) => {
        if (!abort.signal.aborted) setSummaryError(e.message)
      })
    return () => abort.abort()
  }, [year, month, data, version])
  async function exportMonth() {
    setBusy(true)
    setError('')
    try {
      const all: IncomeEntry[] = []
      let snapshot = '',
        total = 0
      for (let page = 0; page < 10; page++) {
        const r = await gymRequest('income_export', { year, month, page })
        if (page === 0) {
          snapshot = r.snapshot
          total = r.total
          if (total > 5000)
            throw new Error(
              'This month has over 5,000 records. Export a smaller report.',
            )
        } else if (r.snapshot !== snapshot || r.total !== total)
          throw new Error('Records changed during export. Try again.')
        all.push(...r.entries)
        if (all.length >= total) break
      }
      if (all.length !== total)
        throw new Error('Could not export every record. Try again.')
      const blob = new Blob([incomeCsv(all)], {
          type: 'text/csv;charset=utf-8',
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a')
      a.href = url
      a.download = `gym-income-${year}-${String(month).padStart(2, '0')}.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="ga-admin-cards">
        <AdminSectionCard title="Payment history" defaultOpen>
          <div className="gg-section-heading">
            <div>
              <p className="gg-small">
                Payments and refunds recorded for your gym. Filter by the date
                money was received or refunded.
              </p>
            </div>
            <button
              type="button"
              className="gg-primary"
              disabled={locked}
              onClick={() => setPayment(true)}
            >
              Make payment record
            </button>
          </div>
          {error && (
            <p role="alert" className="gg-feedback gg-error">
              {error}
            </p>
          )}
          <AdminReport<IncomeEntry>
            kind="payments"
            zone={zone}
            version={version}
            refreshToken={data}
            label="Payment history"
            rowKey={(r) => r.id}
            columns={[
              { label: 'Member', render: (r) => r.member_name },
              { label: 'Date', render: (r) => adminDay(r.received_on) },
              { label: 'Plan', render: (r) => r.plan_name },
              {
                label: 'Amount',
                render: (r) => adminMoney(r.amount, r.currency),
              },
              {
                label: 'Type / status',
                render: (r) => r.kind + (r.voided ? ' - voided' : ''),
              },
              {
                label: 'Actions',
                render: (r) =>
                  !r.voided && (
                    <div className="gg-actions">
                      {r.kind === 'payment' && Number(r.refundable) > 0 && (
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() =>
                            setAdjust({ entry: r, kind: 'refund' })
                          }
                        >
                          Record refund
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setAdjust({ entry: r, kind: 'void' })}
                      >
                        Void record
                      </button>
                    </div>
                  ),
              },
            ]}
          />
        </AdminSectionCard>
        <AdminSectionCard title="Balances & revenue">
          <div className="gg-section-heading">
            <div>
              <p className="gg-small">
                Each row is a saved plan assignment. Fees, payments and
                remaining balance stay together.
              </p>
            </div>
          </div>
          <AdminTable
            rows={data.balances.filter(
              (p) =>
                (currency === 'all' || p.currency === currency) &&
                (status === 'all' ||
                  (status === 'outstanding'
                    ? Number(p.outstanding) > 0
                    : Number(p.outstanding) === 0)),
            )}
            label="Member balances"
            dateLabel="Coverage during"
            zone={zone}
            dateOf={(p) => p.starts_on}
            matches={(p, r) => historyOverlaps(p.starts_on, p.ends_on, r)}
            rowKey={(p) => p.id}
            searchText={(p) => p.username + ' ' + p.plan_name}
            extraFilters={
              <>
                <label>
                  Currency
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="all">All currencies</option>
                    {currencies.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Balance status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">All balances</option>
                    <option value="outstanding">Outstanding</option>
                    <option value="settled">Settled</option>
                  </select>
                </label>
              </>
            }
            columns={[
              { label: 'Member', render: (p) => p.username },
              {
                label: 'Plan / coverage',
                render: (p) => (
                  <>
                    {p.plan_name}
                    <span className="gg-meta">
                      {adminDay(p.starts_on)} to {adminDay(p.ends_on)}
                      {p.cancelled ? ' - removed' : ''}
                    </span>
                  </>
                ),
              },
              { label: 'Fee', render: (p) => adminMoney(p.price, p.currency) },
              {
                label: 'Paid, less refunds',
                render: (p) => adminMoney(p.paid, p.currency),
              },
              {
                label: 'Outstanding',
                render: (p) => (
                  <strong
                    className={
                      Number(p.outstanding) > 0 ? 'ga-outstanding' : ''
                    }
                  >
                    {adminMoney(p.outstanding, p.currency)}
                  </strong>
                ),
              },
              {
                label: 'Status',
                render: (p) => (
                  <span
                    className={
                      'gg-period-status ' +
                      (Number(p.outstanding) > 0
                        ? 'gg-period-upcoming'
                        : 'gg-period-active')
                    }
                  >
                    {Number(p.outstanding) > 0 ? 'Outstanding' : 'Settled'}
                  </span>
                ),
              },
            ]}
          />
          <h4>Monthly collections & unpaid balances</h4>
          <div className="ga-table-toolbar">
            <label>
              Year
              <input
                type="number"
                min={2020}
                max={Number(data.today.slice(0, 4)) + 1}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <label>
              Month
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString(undefined, {
                      month: 'long',
                    })}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || locked || !income}
              onClick={() => void exportMonth()}
            >
              Download monthly CSV
            </button>
          </div>
          <p className="gg-small">
            Cash totals use the selected month in {zone}. Balances show what is
            unpaid now, across all plan dates. Net cash is received money less
            refunds; it is not profit because expenses are not tracked.
          </p>
          {summaryError ? (
            <p className="gg-feedback gg-error" role="alert">
              {summaryError}{' '}
              <button type="button" onClick={() => setVersion((v) => v + 1)}>
                Retry summary
              </button>
            </p>
          ) : !income ? (
            <p role="status">Loading collections...</p>
          ) : (
            <CollectionsSummary
              data={data}
              income={income}
              year={year}
              month={month}
            />
          )}
        </AdminSectionCard>
      </div>
      {payment && (
        <PaymentForm
          data={data}
          locked={locked}
          run={run}
          onClose={() => setPayment(false)}
        />
      )}
      {adjust && (
        <Adjustment
          item={adjust}
          locked={locked || busy}
          today={data.today}
          onClose={() => setAdjust(null)}
          save={async (action, doc) => {
            if (
              !(await confirm({
                title:
                  action === 'void_income'
                    ? 'Void this record?'
                    : 'Record money refunded?',
                message:
                  'Confirm this correction. The ledger will preserve the original record.',
                confirmLabel: 'Confirm correction',
                destructive: action === 'void_income',
              }))
            )
              return false
            setBusy(true)
            setError('')
            try {
              await gymRequest(action, { year, month, ...doc })
              setVersion((v) => v + 1)
              await run('admin_data', {}, 'Payment records refreshed.')
              return true
            } catch (e) {
              setError((e as Error).message)
              return false
            } finally {
              setBusy(false)
            }
          }}
        />
      )}
    </>
  )
}
function CollectionsSummary({
  data,
  income,
  year,
  month,
}: Pick<AdminPageProps, 'data'> & {
  income: GymIncomeData
  year: number
  month: number
}) {
  const rows = gymCollectionsSummary(
    data.balances,
    income.summary,
    year,
    month,
    data.today,
  )
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
  return (
    <div className="ga-collections">
      {!rows.length && (
        <p>No payments or plan fees recorded for {monthLabel}.</p>
      )}
      {rows.map((r) => {
        const tone =
          r.net < 0
            ? 'negative'
            : r.startedOutstanding > 0
              ? 'warning'
              : r.futureOutstanding > 0
                ? 'neutral'
                : 'settled'
        const label =
          r.net < 0
            ? 'Refunds exceed receipts'
            : r.startedOutstanding > 0
              ? 'Payments outstanding'
              : r.futureOutstanding > 0
                ? 'Future fees pending'
                : 'No outstanding fees'
        return (
          <section
            className={'ga-collection ga-collection-' + tone}
            key={r.currency}
            aria-label={r.currency + ' collection summary'}
          >
            <header>
              <h5>{r.currency} summary</h5>
              <span className="ga-collection-status">{label}</span>
            </header>
            <div className="ga-collection-columns">
              <div>
                <h6>{monthLabel} cash</h6>
                <dl>
                  <div>
                    <dt>Received</dt>
                    <dd>{adminMoney(r.received, r.currency)}</dd>
                  </div>
                  <div>
                    <dt>Refunded</dt>
                    <dd>{adminMoney(r.refunded, r.currency)}</dd>
                  </div>
                  <div>
                    <dt>Net cash received</dt>
                    <dd>{adminMoney(r.net, r.currency)}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h6>Unpaid balances now</h6>
                <dl>
                  <div className="ga-collection-total">
                    <dt>Total unpaid</dt>
                    <dd>{adminMoney(r.outstanding, r.currency)}</dd>
                  </div>
                  <div>
                    <dt>Started plans</dt>
                    <dd>{adminMoney(r.startedOutstanding, r.currency)}</dd>
                  </div>
                  <div>
                    <dt>Future plans / renewals</dt>
                    <dd>{adminMoney(r.futureOutstanding, r.currency)}</dd>
                  </div>
                </dl>
                <p className="gg-small">
                  {r.unpaidMembers}{' '}
                  {r.unpaidMembers === 1 ? 'member has' : 'members have'} an
                  unpaid balance. As of {adminDay(data.today)}.
                </p>
              </div>
            </div>
            {r.monthFees > 0 && (
              <div className="ga-collection-cohort">
                <strong>Plans starting in {monthLabel}</strong>
                <p>
                  {adminMoney(r.monthPaid, r.currency)} collected of{' '}
                  {adminMoney(r.monthFees, r.currency)} in plan fees (
                  {r.collectionPercent}% collected).{' '}
                  <strong>
                    {adminMoney(r.monthOutstanding, r.currency)} still unpaid.
                  </strong>
                </p>
                <span>
                  Plan balances are current, including payments received after
                  the selected month.
                </span>
              </div>
            )}
            {r.startedOutstanding > 0 && (
              <p className="ga-collection-notice" role="status">
                Follow up with members who still owe for started plans.
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}

function PaymentForm({
  data,
  locked,
  run,
  onClose,
}: AdminPageProps & { onClose: () => void }) {
  const [person, setPerson] = useState(''),
    [currency, setCurrency] = useState(''),
    [amount, setAmount] = useState(''),
    [receivedOn, setReceivedOn] = useState(data.today),
    [method, setMethod] = useState('cash'),
    [notes, setNotes] = useState(''),
    key = useRef<string | null>(null),
    confirm = useConfirmation()
  const rows = data.balances.filter(
      (p) => p.user_id === person && Number(p.outstanding) > 0,
    ),
    currencies = Array.from(new Set(rows.map((p) => p.currency))),
    selected = currencies.includes(currency) ? currency : currencies[0] || '',
    due =
      rows
        .filter((p) => p.currency === selected)
        .reduce((n, p) => n + Math.round(Number(p.outstanding) * 100), 0) / 100
  useEffect(() => {
    key.current = null
  }, [person, selected, amount, receivedOn, method, notes])
  return (
    <AdminModal title="Record payment received" busy={locked} onClose={onClose}>
      <form
        className="ga-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (Number(amount) <= 0 || Number(amount) > due) return
          if (
            !(await confirm({
              title: 'Record payment received?',
              message: `Confirm ${adminMoney(amount, selected)} was received from ${data.members.find((m) => m.user_id === person)?.username}. It will be applied to their oldest outstanding plan fees first.`,
              confirmLabel: 'Record payment',
            }))
          )
            return
          key.current ??= crypto.randomUUID()
          if (
            await run(
              'pay_member',
              {
                userId: person,
                currency: selected,
                amount,
                receivedOn,
                method,
                notes,
                requestId: key.current,
              },
              'Payment recorded.',
            )
          )
            onClose()
        }}
      >
        <fieldset disabled={locked}>
          <label>
            Member
            <select
              aria-label="Member"
              required
              value={person}
              onChange={(e) => {
                setPerson(e.target.value)
                setAmount('')
              }}
            >
              <option value="">Choose a member</option>
              {data.members.map((m) => (
                <option value={m.user_id} key={m.user_id}>
                  {m.username}
                </option>
              ))}
            </select>
          </label>
          {currencies.length > 0 && (
            <label>
              Payment currency
              <select
                value={selected}
                onChange={(e) => {
                  setCurrency(e.target.value)
                  setAmount('')
                }}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          <p className="ga-form-note">
            <strong>
              Outstanding:{' '}
              {selected ? adminMoney(due, selected) : 'Choose a member'}
            </strong>
            {person && !due && ' - no outstanding fee in this currency.'}
          </p>
          <label>
            Total payment received
            <input
              required
              type="number"
              min="0.01"
              max={Math.min(due, 999999)}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <div className="ga-form-grid">
            <label>
              Received on
              <input
                type="date"
                required
                max={data.today}
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
              />
            </label>
            <label>
              Method
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {['cash', 'bank', 'ewallet', 'card', 'other'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Note (optional)
            <textarea
              maxLength={240}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="gg-primary"
            disabled={!selected || !due || !amount || Number(amount) > due}
          >
            Record payment
          </button>
        </fieldset>
      </form>
    </AdminModal>
  )
}
function Adjustment({
  item,
  locked,
  today,
  onClose,
  save,
}: {
  item: { entry: IncomeEntry; kind: 'refund' | 'void' }
  locked: boolean
  today: string
  onClose: () => void
  save: (action: string, doc: Record<string, unknown>) => Promise<boolean>
}) {
  const [amount, setAmount] = useState(item.entry.refundable),
    [reason, setReason] = useState(''),
    [date, setDate] = useState(today),
    key = useRef(crypto.randomUUID()),
    [error, setError] = useState('')
  return (
    <AdminModal
      title={item.kind === 'void' ? 'Void ledger record' : 'Record refund paid'}
      onClose={onClose}
      busy={locked}
    >
      <form
        className="ga-form"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          const ok = await save(
            item.kind === 'void' ? 'void_income' : 'record_refund',
            item.kind === 'void'
              ? { id: item.entry.id, reason }
              : {
                  paymentId: item.entry.id,
                  requestId: key.current,
                  amount,
                  receivedOn: date,
                  method: item.entry.method,
                  notes: reason,
                },
          )
          if (ok) onClose()
          else
            setError(
              'Correction was not saved. Review the workspace message and try again.',
            )
        }}
      >
        <fieldset disabled={locked}>
          <p>
            {item.entry.member_name} -{' '}
            {adminMoney(item.entry.amount, item.entry.currency)}
          </p>
          {item.kind === 'refund' && (
            <>
              <label>
                Refund amount
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  max={item.entry.refundable}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    key.current = crypto.randomUUID()
                  }}
                />
              </label>
              <label>
                Refund date
                <input
                  type="date"
                  required
                  min={item.entry.received_on}
                  max={today}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    key.current = crypto.randomUUID()
                  }}
                />
              </label>
            </>
          )}
          <label>
            Reason
            <textarea
              required
              minLength={3}
              maxLength={240}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                key.current = crypto.randomUUID()
              }}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button
            type="submit"
            className={item.kind === 'void' ? 'gg-danger' : 'gg-primary'}
          >
            Save correction
          </button>
        </fieldset>
      </form>
    </AdminModal>
  )
}
