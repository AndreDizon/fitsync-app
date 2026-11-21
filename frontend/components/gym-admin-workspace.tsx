'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Building2,
  Users,
  ClipboardCheck,
  ClipboardList,
  MessageCircle,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import {
  gymRequest,
  type GymMembership,
  type GymAction,
  type GymMember,
  type GymPeriod,
  type GymPlan,
} from '@/lib/gym-groups'
import {
  AdminFeedbackContext,
  AdminModal,
  AdminTable,
  AdminReport,
  adminDay,
  adminTime,
  adminMoney,
} from './gym-admin-primitives'
import { useConfirmation } from './confirm-dialog'
import { GymAdminPlans } from './gym-admin-plans'
import { GymAdminPayments } from './gym-admin-payments'
import { GymAttendance } from './gym-management-tools'
import { GymDiscussion } from './gym-discussion'
import { dateInZone } from '../../shared/progress'

export type AdminData = Omit<GymMembership, 'bans' | 'activity'> & {
  today: string
  balances: (GymPeriod & {
    username: string
    paid: number
    outstanding: number
  })[]
  bans: { user_id: string; username: string; banned_at?: string }[]
  activity: {
    id: string
    actor: string
    actor_role: string
    target: string
    action: string
    created_at: string
  }[]
}
export type AdminPageProps = {
  data: AdminData
  locked: boolean
  run: GymAction
}
const sections = [
  {
    id: 'settings',
    label: 'Manage gym',
    Icon: Building2,
    note: 'Gym details, welcome, rules and joining.',
  },
  {
    id: 'members',
    label: 'Manage members',
    Icon: Users,
    note: 'Requests, roles, bans and team activity.',
  },
  {
    id: 'attendance',
    label: 'Gym attendance',
    Icon: ClipboardCheck,
    note: 'Review visits and confirm member check-ins.',
  },
  {
    id: 'plans',
    label: 'Plans & assignments',
    Icon: ClipboardList,
    note: 'Create plans, apply them and renew members.',
  },
  {
    id: 'discussion',
    label: 'Discussion',
    Icon: MessageCircle,
    note: 'Chat, announcements, events and shared workouts.',
  },
  {
    id: 'payments',
    label: 'Payments & revenue',
    Icon: Wallet,
    note: 'Record money received and review outstanding balances.',
  },
]
export function GymAdminWorkspace({
  membership,
  owner,
  locked,
  onAction,
  settings,
  initialTab,
  actionError,
}: {
  membership: GymMembership
  owner: string
  locked: boolean
  onAction: GymAction
  settings?: ReactNode
  initialTab?: string
  actionError?: string
}) {
  const aliases: Record<string, string> = {
    team: 'members',
    activity: 'members',
    membership: 'plans',
    'membership-plans': 'plans',
    income: 'payments',
    announcements: 'discussion',
    sessions: 'discussion',
    playlists: 'discussion',
  }
  const [tab, setTab] = useState(
      aliases[initialTab || ''] ||
        (sections.some((s) => s.id === initialTab) ? initialTab! : 'settings'),
    ),
    [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(''),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true)
  const panel = useRef<HTMLDivElement>(null),
    focusNext = useRef(false)
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError('')
    gymRequest(
      'admin_data',
      {},
      AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
    )
      .then((d) => {
        if (!abort.signal.aborted) setData(d)
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setData(null)
          setError(e.message)
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [membership, version])
  useEffect(() => {
    if (focusNext.current) {
      focusNext.current = false
      panel.current?.focus({ preventScroll: true })
    }
  }, [tab])
  const run: GymAction = async (action, doc, message) => {
    const ok = await onAction(action, doc, message)
    if (ok) setVersion((v) => v + 1)
    return ok
  }
  const active = sections.find((s) => s.id === tab) || sections[0]
  return (
    <AdminFeedbackContext.Provider value={actionError || ''}>
      <div className="ga-workspace">
        <nav className="ga-menu" aria-label="Gym administration">
          {sections.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={active.id === s.id}
              aria-controls="gym-admin-panel"
              onClick={() => {
                focusNext.current = true
                setTab(s.id)
              }}
            >
              <s.Icon size={17} />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="ga-mobile-menu">
          <label htmlFor="gym-admin-section">Manage your gym</label>
          <select
            id="gym-admin-section"
            value={active.id}
            onChange={(e) => setTab(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div
          className="ga-content"
          data-section={active.id}
          id="gym-admin-panel"
          ref={panel}
          tabIndex={-1}
          role="region"
          aria-label={active.label}
        >
          <header className="ga-page-heading">
            <active.Icon size={24} />
            <div>
              <h3>{active.label}</h3>
              <p>{active.note}</p>
            </div>
            <button
              type="button"
              aria-label="Refresh gym workspace"
              disabled={loading || locked}
              onClick={() => setVersion((v) => v + 1)}
            >
              <RefreshCw size={17} />
            </button>
          </header>
          <div className="ga-page-body">
            {loading && <p role="status">Refreshing gym records...</p>}
            {error && (
              <p role="alert" className="gg-feedback gg-error">
                {error}{' '}
                <button type="button" onClick={() => setVersion((v) => v + 1)}>
                  Retry
                </button>
              </p>
            )}
            {data && !error && (
              <>
                {active.id === 'settings' && settings}
                {active.id === 'members' && (
                  <Members data={data} locked={locked || loading} run={run} />
                )}{' '}
                {active.id === 'attendance' && (
                  <Attendance
                    data={data}
                    locked={locked || loading}
                    run={run}
                  />
                )}{' '}
                {active.id === 'plans' && (
                  <GymAdminPlans
                    data={data}
                    locked={locked || loading}
                    run={run}
                  />
                )}{' '}
                {active.id === 'discussion' && (
                  <GymDiscussion
                    membership={data}
                    owner={owner}
                    locked={locked || loading}
                    onAction={run}
                  />
                )}{' '}
                {active.id === 'payments' && (
                  <GymAdminPayments
                    data={data}
                    locked={locked || loading}
                    run={run}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminFeedbackContext.Provider>
  )
}
function Members({ data, locked, run }: AdminPageProps) {
  const [activity, setActivity] = useState(false),
    [role, setRole] = useState('all'),
    confirm = useConfirmation(),
    zone = data.gym!.time_zone || 'Asia/Manila'
  async function act(
    action: string,
    user: GymMember,
    doc: Record<string, unknown> = {},
  ) {
    if (
      await confirm({
        title:
          action === 'transfer'
            ? 'Transfer gym ownership?'
            : action === 'role'
              ? 'Change member role?'
              : action === 'ban'
                ? 'Ban this member?'
                : 'Remove this member?',
        message:
          action === 'transfer'
            ? `${user.username} will become the only admin. You will lose admin access.`
            : action === 'ban'
              ? `${user.username} will be removed and unable to rejoin until unbanned.`
              : `Apply this change to ${user.username}? Historical payments are preserved.`,
        confirmLabel: action === 'transfer' ? 'Transfer ownership' : 'Confirm',
        destructive: ['ban', 'remove', 'transfer'].includes(action),
      })
    )
      await run(action, { userId: user.user_id, ...doc }, 'Member updated.')
  }
  return (
    <div className="ga-member-cards">
      <section className="ga-member-card">
        <h4>
          Pending requests{' '}
          <span className="gg-inline-count">{data.requests?.length || 0}</span>
        </h4>
        <AdminTable
          searchable={false}
          rows={data.requests || []}
          label="Pending requests"
          dateLabel="Requested on"
          zone={zone}
          rowKey={(r) => r.user_id}
          dateOf={(r) => dateInZone(zone, new Date(r.created_at))}
          searchText={(r) => r.username}
          columns={[
            { label: 'Name', render: (r) => r.username },
            {
              label: 'Requested',
              render: (r) => adminDay(dateInZone(zone, new Date(r.created_at))),
            },
            {
              label: 'Actions',
              render: (r) => (
                <div className="gg-actions">
                  <button
                    type="button"
                    className="gg-primary"
                    disabled={locked || data.members.length >= 100}
                    onClick={() =>
                      void run(
                        'approve',
                        { userId: r.user_id },
                        'Request accepted.',
                      )
                    }
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Decline request?',
                          message: `Decline ${r.username}'s request? They can apply again.`,
                          confirmLabel: 'Decline',
                        })
                      )
                        await run(
                          'reject',
                          { userId: r.user_id },
                          'Request declined.',
                        )
                    }}
                  >
                    Decline
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
      <section className="ga-member-card">
        <h4>
          All members{' '}
          <span className="gg-inline-count">{data.members.length}/100</span>
        </h4>
        <AdminTable
          searchable={false}
          rows={data.members}
          label="All members"
          dateLabel="Joined on"
          zone={zone}
          dateOf={(r) => dateInZone(zone, new Date(r.joined_at))}
          rowKey={(r) => r.user_id}
          searchText={(r) => r.username + ' ' + r.role}
          columns={[
            { label: 'Name', render: (r) => r.username },
            {
              label: 'Role',
              render: (r) => <span className="gg-period-status">{r.role}</span>,
            },
            {
              label: 'Joined',
              render: (r) => adminDay(dateInZone(zone, new Date(r.joined_at))),
            },
            {
              label: 'Actions',
              render: (r) =>
                r.role === 'admin' ? (
                  'Gym owner'
                ) : (
                  <div className="gg-actions">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        void act('role', r, {
                          role: r.role === 'staff' ? 'member' : 'staff',
                        })
                      }
                    >
                      {r.role === 'staff' ? 'Make member' : 'Make staff'}
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => void act('transfer', r)}
                    >
                      Transfer ownership
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => void act('remove', r)}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      className="gg-danger"
                      disabled={locked}
                      onClick={() => void act('ban', r)}
                    >
                      Ban
                    </button>
                  </div>
                ),
            },
          ]}
        />
      </section>
      <section className="ga-member-card">
        <h4>Banned accounts</h4>
        <AdminTable
          searchable={false}
          rows={data.bans || []}
          label="Banned accounts"
          dateLabel="Banned on"
          zone={zone}
          dateOf={(r) =>
            r.banned_at ? dateInZone(zone, new Date(r.banned_at)) : null
          }
          rowKey={(r) => r.user_id}
          searchText={(r) => r.username}
          columns={[
            { label: 'Name', render: (r) => r.username },
            {
              label: 'Banned',
              render: (r) =>
                adminDay(
                  r.banned_at ? dateInZone(zone, new Date(r.banned_at)) : null,
                ),
            },
            {
              label: 'Actions',
              render: (r) => (
                <button
                  type="button"
                  disabled={locked}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: 'Unban account?',
                        message: `Allow ${r.username} to join or request membership again?`,
                        confirmLabel: 'Unban',
                      })
                    )
                      await run(
                        'unban',
                        { userId: r.user_id },
                        'Account unbanned.',
                      )
                  }}
                >
                  Unban
                </button>
              ),
            },
          ]}
        />
      </section>
      <section className="ga-member-card">
        <h4>Team activity</h4>
        <p className="gg-small">Review the latest 200 management actions.</p>
        <button type="button" onClick={() => setActivity(true)}>
          See activity
        </button>
      </section>
      {activity && (
        <AdminModal title="Team activity" onClose={() => setActivity(false)}>
          <p className="gg-small">
            Role filters use the actor's current role. Former members are
            labelled separately.
          </p>
          <AdminTable
            searchable={false}
            rows={(data.activity || []).filter(
              (r) => role === 'all' || r.actor_role === role,
            )}
            label="Team activity"
            dateLabel="Activity date"
            zone={zone}
            dateOf={(r) => dateInZone(zone, new Date(r.created_at))}
            rowKey={(r) => r.id}
            searchText={(r) =>
              r.actor + ' ' + r.target + ' ' + r.action.replaceAll('_', ' ')
            }
            extraFilters={
              <label>
                Current actor role
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {['all', 'admin', 'staff', 'member', 'former'].map((r) => (
                    <option key={r} value={r}>
                      {r === 'all' ? 'All roles' : r}
                    </option>
                  ))}
                </select>
              </label>
            }
            columns={[
              { label: 'Who', render: (r) => r.actor },
              { label: 'Role', render: (r) => r.actor_role },
              { label: 'Action', render: (r) => r.action.replaceAll('_', ' ') },
              { label: 'Member', render: (r) => r.target },
              {
                label: 'Date',
                render: (r) =>
                  adminDay(dateInZone(zone, new Date(r.created_at))),
              },
            ]}
          />
        </AdminModal>
      )}
    </div>
  )
}
type Visit = {
  user_id: string
  username: string
  checked_on: string
  checked_at: string
  checked_out_at: string | null
  confirmed_at: string | null
}
function Attendance({ data, locked, run }: AdminPageProps) {
  const [sessions, setSessions] = useState(false),
    [person, setPerson] = useState<Visit | null>(null),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    zone = data.gym!.time_zone || 'Asia/Manila'
  const times = [
    { label: 'Visit date', render: (r: Visit) => adminDay(r.checked_on) },
    {
      label: 'Last check-in',
      render: (r: Visit) => adminTime(r.checked_at, zone),
    },
    {
      label: 'Last checkout',
      render: (r: Visit) => adminTime(r.checked_out_at, zone),
    },
  ]
  return (
    <>
      <div className="gg-actions">
        <button type="button" onClick={() => setSessions(true)}>
          Scheduled-session attendance
        </button>
      </div>
      {sessions && (
        <AdminModal
          title="Scheduled-session attendance"
          onClose={() => setSessions(false)}
        >
          <GymAttendance
            membership={data}
            locked={locked}
            onAction={run}
            view="sessions"
          />
        </AdminModal>
      )}
      <p className="gg-small">
        Times use {zone}. One visit per gym-local day. Check-ins require your
        confirmation; checkout records when a member leaves.
      </p>
      {error && (
        <p role="alert" className="gg-feedback gg-error">
          {error}
        </p>
      )}
      <AdminReport<Visit>
        kind="visits"
        version={version}
        label="Gym attendance"
        zone={zone}
        rowKey={(r) => r.user_id + r.checked_on}
        columns={[
          { label: 'Name', render: (r) => r.username },
          ...times,
          {
            label: 'Confirmation',
            render: (r) =>
              r.confirmed_at ? (
                'Confirmed'
              ) : (
                <button
                  type="button"
                  className="gg-primary"
                  disabled={locked || busy}
                  onClick={async () => {
                    setBusy(true)
                    setError('')
                    try {
                      await gymRequest('confirm_checkin', {
                        userId: r.user_id,
                        checkedOn: r.checked_on,
                        scope: 'gym',
                      })
                      setVersion((v) => v + 1)
                    } catch (e) {
                      setError((e as Error).message)
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Confirm check-in
                </button>
              ),
          },
          {
            label: 'History',
            render: (r) => (
              <button type="button" onClick={() => setPerson(r)}>
                See all history
              </button>
            ),
          },
        ]}
      />
      {person && (
        <AdminModal
          title={person.username + ' - attendance history'}
          onClose={() => setPerson(null)}
        >
          <p className="gg-small">
            All recorded time in and time out in {zone}.
          </p>
          <AdminReport<Visit>
            kind="visits"
            userId={person.user_id}
            version={version}
            label="Member attendance history"
            zone={zone}
            rowKey={(r) => r.checked_on}
            columns={times}
          />
        </AdminModal>
      )}
    </>
  )
}
