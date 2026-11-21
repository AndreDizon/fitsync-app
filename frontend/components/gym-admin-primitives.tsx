'use client'

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown } from 'lucide-react'
import { HistoryDateFilter } from './gym-history-filter'
import {
  emptyHistoryRange,
  historyContainsDay,
  type HistoryRange,
} from '../../shared/gym-history'
import { gymRequest } from '@/lib/gym-groups'
import '@/app/gym-admin.css'

export const AdminFeedbackContext = createContext('')
export function AdminSectionCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details className="ga-section-card" open={defaultOpen || undefined}>
      <summary>
        <h4>{title}</h4>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <div className="ga-section-card-body">{children}</div>
    </details>
  )
}
export const adminDay = (value?: string | null) =>
  value
    ? new Date(value.slice(0, 10) + 'T12:00:00Z').toLocaleDateString(
        undefined,
        { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' },
      )
    : 'Not recorded'
export const adminTime = (value: string | null | undefined, zone: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        timeZone: zone,
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(value))
    : '—'
export const adminMoney = (value: string | number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    Number(value),
  )
export function AdminModal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}) {
  const actionError = useContext(AdminFeedbackContext)
  const id = useId(),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    trigger.current = document.activeElement as HTMLElement
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    dialog.current
      ?.querySelector<HTMLElement>(
        'input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button',
      )
      ?.focus()
    return () => {
      document.body.style.overflow = previous
      trigger.current?.isConnected && trigger.current.focus()
    }
  }, [])
  return createPortal(
    <dialog
      ref={dialog}
      className="ga-modal sc-gyms"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          disabled={busy}
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="ga-modal-body">
        {actionError && (
          <p role="alert" className="gg-feedback gg-error">
            {actionError}
          </p>
        )}
        {children}
      </div>
    </dialog>,
    document.body,
  )
}
export type AdminColumn<T> = { label: string; render: (row: T) => ReactNode }
function TableBody<T>({
  rows,
  columns,
  rowKey,
  label,
}: {
  rows: T[]
  columns: AdminColumn<T>[]
  rowKey: (row: T) => string
  label: string
}) {
  return (
    <div
      className="ga-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="ga-table">
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c.label}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c, i) =>
                  i === 0 ? (
                    <th scope="row" key={c.label}>
                      {c.render(r)}
                    </th>
                  ) : (
                    <td key={c.label}>{c.render(r)}</td>
                  ),
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="ga-table-empty">
                No records match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
function Pager({
  page,
  total,
  onChange,
  busy,
  label,
}: {
  page: number
  total: number
  onChange: (page: number) => void
  busy?: boolean
  label: string
}) {
  return (
    <nav className="gg-pagination" aria-label={label}>
      <button
        type="button"
        disabled={busy || page === 0}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page + 1} of {Math.max(1, Math.ceil(total / 10))} · {total}{' '}
        records
      </span>
      <button
        type="button"
        disabled={busy || (page + 1) * 10 >= total}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
export function AdminTable<T>({
  rows,
  columns,
  rowKey,
  dateOf,
  searchText,
  label,
  dateLabel,
  zone,
  extraFilters,
  matches,
  searchable = true,
}: {
  rows: T[]
  columns: AdminColumn<T>[]
  rowKey: (row: T) => string
  dateOf: (row: T) => string | null | undefined
  searchText: (row: T) => string
  label: string
  dateLabel: string
  zone: string
  extraFilters?: ReactNode
  matches?: (row: T, range: HistoryRange) => boolean
  searchable?: boolean
}) {
  const [range, setRange] = useState(emptyHistoryRange),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    id = useId()
  const filtered = rows.filter(
    (r) =>
      (!searchable ||
        searchText(r).toLowerCase().includes(query.trim().toLowerCase())) &&
      (matches
        ? matches(r, range)
        : (!range.from && !range.to) ||
          (!!dateOf(r) && historyContainsDay(dateOf(r)!.slice(0, 10), range))),
  )
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 10) - 1),
  )
  return (
    <section className="ga-data">
      {(searchable || extraFilters) && (
        <div className="ga-table-toolbar">
          {searchable && (
            <div className="gg-field">
              <label htmlFor={id}>Search {label.toLowerCase()}</label>
              <input
                id={id}
                type="search"
                maxLength={100}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
              />
            </div>
          )}
          {extraFilters}
        </div>
      )}
      <HistoryDateFilter
        label={dateLabel}
        zone={zone}
        value={range}
        onChange={(next) => {
          setRange(next)
          setPage(0)
        }}
      />
      {rows.some((r) => !dateOf(r)) && (
        <p className="gg-meta">
          Older entries without a recorded date appear under All dates only.
        </p>
      )}
      <p className="gg-meta" role="status">
        {filtered.length} matching records · 10 per page
      </p>
      <p className="ga-scroll-hint">Scroll horizontally for all columns.</p>
      <TableBody
        rows={filtered.slice(current * 10, current * 10 + 10)}
        columns={columns}
        rowKey={rowKey}
        label={label}
      />
      <Pager
        page={current}
        total={filtered.length}
        onChange={setPage}
        label={label + ' pages'}
      />
    </section>
  )
}
export function AdminReport<T>({
  kind,
  userId,
  label,
  zone,
  columns,
  rowKey,
  version = 0,
}: {
  kind: 'visits' | 'payments'
  userId?: string
  label: string
  zone: string
  columns: AdminColumn<T>[]
  rowKey: (row: T) => string
  version?: number
}) {
  const [range, setRange] = useState(emptyHistoryRange),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [retry, setRetry] = useState(0),
    [rows, setRows] = useState<T[]>([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    id = useId()
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError('')
    gymRequest(
      'admin_report',
      { kind, userId: userId || '', ...range, q: query, page },
      AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
    )
      .then((data) => {
        if (!abort.signal.aborted) {
          setRows(data.entries)
          setTotal(data.total)
          if (page > 0 && page * 10 >= data.total)
            setPage(Math.max(0, Math.ceil(data.total / 10) - 1))
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setError(e.message)
          setRows([])
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [kind, userId, range.from, range.to, query, page, retry, version])
  return (
    <section className="ga-data">
      <div className="gg-field">
        <label htmlFor={id}>Search {label.toLowerCase()}</label>
        <input
          id={id}
          type="search"
          maxLength={100}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
        />
      </div>
      <HistoryDateFilter
        label={kind === 'visits' ? 'Visit date' : 'Payment date'}
        zone={zone}
        value={range}
        onChange={(next) => {
          setRange(next)
          setPage(0)
        }}
      />
      {error && (
        <p className="gg-feedback gg-error" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            Retry report
          </button>
        </p>
      )}
      {loading ? (
        <p role="status" className="gg-empty">
          Loading records…
        </p>
      ) : (
        <TableBody
          rows={rows}
          columns={columns}
          rowKey={rowKey}
          label={label}
        />
      )}
      <Pager
        page={page}
        total={total}
        onChange={setPage}
        busy={loading}
        label={label + ' pages'}
      />
    </section>
  )
}
