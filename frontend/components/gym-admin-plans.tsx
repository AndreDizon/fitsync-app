'use client'
import { useState } from 'react'
import { ClipboardList, Users } from 'lucide-react'
import { type GymPlan, type GymPeriod, type GymMember } from '@/lib/gym-groups'
import {
  AdminModal,
  AdminSectionCard,
  AdminTable,
  adminDay,
  adminMoney,
} from './gym-admin-primitives'
import { type AdminPageProps } from './gym-admin-workspace'
import { useConfirmation } from './confirm-dialog'
import { dateInZone, shiftDate } from '../../shared/progress'
import { historyOverlaps } from '../../shared/gym-history'
import { gymCoverageSummary, gymCoverageDays } from '../../shared/gym-workflow'

export function GymAdminPlans({ data, locked, run }: AdminPageProps) {
  const [editor, setEditor] = useState<GymPlan | null | false>(false),
    [assignment, setAssignment] = useState<{
      member: GymMember
      period?: GymPeriod
    } | null>(null),
    [history, setHistory] = useState<GymMember | null>(null),
    [availability, setAvailability] = useState('all'),
    confirm = useConfirmation()
  const zone = data.gym!.time_zone || 'Asia/Manila',
    today = data.today || dateInZone(zone),
    plans = data.plans || [],
    periods = data.membershipPeriods || []
  const coverage = (id: string) => gymCoverageSummary(periods, id, today)
  const current = (id: string) => coverage(id)?.current
  return (
    <>
      <div className="ga-admin-cards">
        <AdminSectionCard
          title="Membership plans"
          icon={ClipboardList}
          description="The plans and fees your gym offers"
          tone="slate"
          defaultOpen
        >
          <div className="gg-section-heading">
            <div>
              <p className="gg-small">
                Your catalog of durations and fees. Create a plan before
                assigning it.
              </p>
            </div>
            <button
              type="button"
              className="gg-primary"
              disabled={locked}
              onClick={() => setEditor(null)}
            >
              Create plan
            </button>
          </div>
          <AdminTable
            searchable={false}
            rows={plans.filter(
              (p) =>
                availability === 'all' ||
                p.archived === (availability === 'archived'),
            )}
            label="Available plans"
            dateLabel="Plan created on"
            zone={zone}
            dateOf={(p) =>
              p.created_at ? dateInZone(zone, new Date(p.created_at)) : null
            }
            rowKey={(p) => p.id}
            searchText={(p) => p.name + ' ' + p.description}
            extraFilters={
              <label>
                Availability
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option value="all">All plans</option>
                  <option value="available">Available</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            }
            columns={[
              { label: 'Plan', render: (p) => p.name },
              { label: 'Duration', render: (p) => p.duration_days + ' days' },
              { label: 'Fee', render: (p) => adminMoney(p.price, p.currency) },
              {
                label: 'Status',
                render: (p) => (p.archived ? 'Archived' : 'Available'),
              },
              {
                label: 'Actions',
                render: (p) => (
                  <div className="gg-actions">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setEditor(p)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        void run(
                          'archive_plan',
                          { id: p.id, archived: !p.archived },
                          'Plan availability updated.',
                        )
                      }
                    >
                      {p.archived ? 'Restore' : 'Archive'}
                    </button>
                    <button
                      type="button"
                      className="gg-danger"
                      disabled={locked}
                      onClick={async () => {
                        if (
                          await confirm({
                            title: 'Delete catalog plan?',
                            message:
                              'Remove this plan from the catalog? Existing assignments keep their saved plan name, fee, coverage and payment history.',
                            confirmLabel: 'Delete plan',
                            destructive: true,
                          })
                        )
                          await run(
                            'delete_plan',
                            { id: p.id },
                            'Catalog plan deleted.',
                          )
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </AdminSectionCard>
        <AdminSectionCard
          title="Member plan assignments"
          icon={Users}
          description="Manage coverage, renewals and fees"
        >
          <p className="gg-small">
            Renewals add to continuous coverage days and total plan fees. Fees
            are recorded as outstanding until a payment is received.
          </p>
          <AdminTable
            rows={data.members}
            label="Member plan assignments"
            dateLabel="Member joined on"
            zone={zone}
            dateOf={(m) => dateInZone(zone, new Date(m.joined_at))}
            rowKey={(m) => m.user_id}
            searchText={(m) =>
              m.username + ' ' + (current(m.user_id)?.plan_name || 'No plan')
            }
            columns={[
              { label: 'Member', render: (m) => m.username },
              {
                label: 'Plan',
                render: (m) => {
                  const p = current(m.user_id)
                  return p ? (
                    <>
                      <strong>{p.plan_name}</strong>
                      <span className="gg-meta">
                        {p.starts_on <= today ? 'Active' : 'Upcoming'}
                      </span>
                    </>
                  ) : (
                    'No active or upcoming plan'
                  )
                },
              },
              {
                label: 'Coverage',
                render: (m) => {
                  const summary = coverage(m.user_id)
                  return summary ? (
                    <>
                      {adminDay(summary.startsOn)} to {adminDay(summary.endsOn)}
                      <span className="gg-meta">
                        {summary.days} days total
                        {summary.periods.length > 1
                          ? ' - includes renewals'
                          : ''}
                      </span>
                    </>
                  ) : (
                    '-'
                  )
                },
              },
              {
                label: 'Total plan fees',
                render: (m) => {
                  const summary = coverage(m.user_id)
                  return summary
                    ? summary.fees.map((f) => (
                        <span className="ga-plan-fee" key={f.currency}>
                          {adminMoney(f.amount, f.currency)}
                        </span>
                      ))
                    : '-'
                },
              },
              {
                label: 'Actions',
                render: (m) => {
                  const p = current(m.user_id)
                  return (
                    <div className="gg-actions">
                      <button
                        type="button"
                        className="gg-primary"
                        disabled={
                          locked || (!p && !plans.some((p) => !p.archived))
                        }
                        onClick={() => setAssignment({ member: m, period: p })}
                      >
                        {p ? 'Update plan' : 'Apply plan'}
                      </button>
                      <button type="button" onClick={() => setHistory(m)}>
                        Plan history
                      </button>
                    </div>
                  )
                },
              },
            ]}
          />
        </AdminSectionCard>
      </div>
      {editor !== false && (
        <PlanEditor
          plan={editor}
          locked={locked}
          run={run}
          onClose={() => setEditor(false)}
        />
      )}
      {assignment && (
        <Assignment
          member={assignment.member}
          period={assignment.period}
          plans={plans}
          periods={periods}
          today={today}
          locked={locked}
          run={run}
          onClose={() => setAssignment(null)}
        />
      )}
      {history && (
        <AdminModal
          title={history.username + ' - plan history'}
          onClose={() => setHistory(null)}
        >
          <AdminTable
            rows={periods.filter((p) => p.user_id === history.user_id)}
            label="Plan history"
            dateLabel="Coverage during"
            zone={zone}
            dateOf={(p) => p.starts_on}
            matches={(p, r) => historyOverlaps(p.starts_on, p.ends_on, r)}
            rowKey={(p) => p.id}
            searchText={(p) => p.plan_name + ' ' + p.status}
            columns={[
              { label: 'Plan', render: (p) => p.plan_name },
              { label: 'Starts', render: (p) => adminDay(p.starts_on) },
              { label: 'Expires', render: (p) => adminDay(p.ends_on) },
              { label: 'Fee', render: (p) => adminMoney(p.price, p.currency) },
              { label: 'Status', render: (p) => p.status },
              {
                label: 'Actions',
                render: (p) =>
                  !p.cancelled && (
                    <div className="gg-actions">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          setHistory(null)
                          setAssignment({ member: history, period: p })
                        }}
                      >
                        Update plan
                      </button>
                    </div>
                  ),
              },
            ]}
          />
        </AdminModal>
      )}
    </>
  )
}
function PlanEditor({
  plan,
  locked,
  run,
  onClose,
}: { plan: GymPlan | null; onClose: () => void } & Pick<
  AdminPageProps,
  'locked' | 'run'
>) {
  const [name, setName] = useState(plan?.name || ''),
    [description, setDescription] = useState(plan?.description || ''),
    [days, setDays] = useState(plan?.duration_days || 30),
    [price, setPrice] = useState(String(plan?.price || 0)),
    [currency, setCurrency] = useState(plan?.currency || 'PHP')
  return (
    <AdminModal
      title={plan ? 'Edit membership plan' : 'Create membership plan'}
      busy={locked}
      onClose={onClose}
    >
      <form
        className="ga-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (
            await run(
              'save_plan',
              {
                id: plan?.id,
                name,
                description,
                durationDays: days,
                price,
                currency,
              },
              'Membership plan saved.',
            )
          )
            onClose()
        }}
      >
        <fieldset disabled={locked}>
          <label>
            Plan name
            <input
              required
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Plan details
            <textarea
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="ga-form-grid">
            <label>
              Duration in days
              <input
                type="number"
                required
                min={1}
                max={730}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </label>
            <label>
              Fee
              <input
                type="number"
                min={0}
                max={999999}
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label>
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {['PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY'].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <p className="ga-form-note">
            Catalog changes apply to future assignments. Existing records keep
            their saved fee.
          </p>
          <button type="submit" className="gg-primary">
            Save plan
          </button>
        </fieldset>
      </form>
    </AdminModal>
  )
}
function Assignment({
  member,
  period,
  plans,
  periods,
  today,
  locked,
  run,
  onClose,
}: {
  member: GymMember
  period?: GymPeriod
  plans: GymPlan[]
  periods: GymPeriod[]
  today: string
  onClose: () => void
} & Pick<AdminPageProps, 'locked' | 'run'>) {
  const last = periods
    .filter((p) => p.user_id === member.user_id && !p.cancelled)
    .map((p) => p.ends_on)
    .sort()
    .at(-1)
  const nextStart = last && last >= today ? shiftDate(last, 1) : today
  const existingPlan = plans.find(
    (p) => p.id === period?.plan_id && !p.archived,
  )
  const [mode, setMode] = useState<'edit' | 'renew'>(period ? 'edit' : 'renew')
  const [editDraft, setEditDraft] = useState({
    chosen: existingPlan?.id || '',
    start: period?.starts_on || today,
    end: period?.ends_on || shiftDate(today, 29),
  })
  const [renewDraft, setRenewDraft] = useState({
    chosen: existingPlan?.id || '',
    start: nextStart,
    end: shiftDate(nextStart, (existingPlan?.duration_days || 30) - 1),
  })
  const editing = !!period && mode === 'edit',
    renewing = !!period && mode === 'renew'
  const { chosen, start, end } = editing ? editDraft : renewDraft
  function updateDraft(change: Partial<typeof editDraft>) {
    if (editing) setEditDraft((d) => ({ ...d, ...change }))
    else setRenewDraft((d) => ({ ...d, ...change }))
  }
  const setChosen = (value: string) => updateDraft({ chosen: value }),
    setStart = (value: string) => updateDraft({ start: value }),
    setEnd = (value: string) => updateDraft({ end: value })
  const confirm = useConfirmation()
  const selected = plans.find((p) => p.id === chosen)
  const addedDays = gymCoverageDays(start, end)
  const renewalPreview =
    renewing && period && selected && addedDays
      ? gymCoverageSummary(
          [
            ...periods,
            {
              id: 'renewal-preview',
              user_id: member.user_id,
              plan_id: selected.id,
              plan_name: selected.name,
              price: selected.price,
              currency: selected.currency,
              starts_on: start,
              ends_on: end,
              cancelled: false,
              status: 'upcoming',
            },
          ],
          member.user_id,
          today,
          'renewal-preview',
        )
      : null
  return (
    <AdminModal
      title={
        (period ? 'Update plan for ' : 'Apply plan for ') + member.username
      }
      onClose={onClose}
      busy={locked}
    >
      <form
        className="ga-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (
            !(await confirm({
              title: renewing
                ? 'Save renewal?'
                : editing
                  ? 'Save plan changes?'
                  : 'Save plan assignment?',
              message: `Save ${selected?.name} for ${member.username}, ${adminDay(start)} to ${adminDay(end)}? Listed fee: ${adminMoney(selected?.price || 0, selected?.currency || 'PHP')}. This does not confirm payment.`,
              confirmLabel: renewing
                ? 'Save renewal'
                : editing
                  ? 'Save changes'
                  : 'Save assignment',
            }))
          )
            return
          if (
            await run(
              'edit_member_plan',
              {
                id: editing ? period?.id : undefined,
                userId: member.user_id,
                planId: chosen,
                startsOn: start,
                endsOn: end,
              },
              renewing
                ? `Renewal saved: +${addedDays} days, +${adminMoney(selected?.price || 0, selected?.currency || 'PHP')}. Coverage extends through ${adminDay(end)}.`
                : editing
                  ? 'Member plan updated.'
                  : 'Member plan applied.',
            )
          )
            onClose()
        }}
      >
        <fieldset disabled={locked}>
          {period && (
            <>
              <div
                className="ga-assignment-actions"
                role="group"
                aria-label="Plan update action"
              >
                <button
                  type="button"
                  aria-pressed={editing}
                  onClick={() => setMode('edit')}
                >
                  Edit existing plan
                </button>
                <button
                  type="button"
                  aria-pressed={renewing}
                  onClick={() => setMode('renew')}
                >
                  Renew plan
                </button>
              </div>
              <p className="gg-small">
                Current assignment: <strong>{period.plan_name}</strong> -{' '}
                {adminDay(period.starts_on)} to {adminDay(period.ends_on)}.
              </p>
            </>
          )}
          <label>
            Membership plan
            <select
              aria-label="Membership plan"
              required
              value={chosen}
              onChange={(e) => {
                setChosen(e.target.value)
                const p = plans.find((p) => p.id === e.target.value)
                if (p && start) setEnd(shiftDate(start, p.duration_days - 1))
              }}
            >
              <option value="">Choose an available plan</option>
              {plans
                .filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {adminMoney(p.price, p.currency)} /{' '}
                    {p.duration_days} days
                  </option>
                ))}
            </select>
          </label>
          <div className="ga-form-grid">
            <label>
              Starts
              <input
                required
                type="date"
                min={renewing ? nextStart : undefined}
                value={start}
                onChange={(e) => {
                  setStart(e.target.value)
                  if (selected && e.target.value)
                    setEnd(
                      shiftDate(e.target.value, selected.duration_days - 1),
                    )
                }}
              />
            </label>
            <label>
              Expires
              <input
                required
                type="date"
                min={start}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          {renewalPreview && selected && (
            <div className="ga-renewal-summary" role="status">
              <strong>
                Renewal adds {addedDays} days +{' '}
                {adminMoney(selected.price, selected.currency)}
              </strong>
              <dl>
                <div>
                  <dt>Renewed coverage</dt>
                  <dd>
                    {adminDay(renewalPreview.startsOn)} to{' '}
                    {adminDay(renewalPreview.endsOn)} ({renewalPreview.days}{' '}
                    days)
                  </dd>
                </div>
                <div>
                  <dt>Total fees for this coverage</dt>
                  <dd>
                    {renewalPreview.fees.map((f) => (
                      <span className="ga-plan-fee" key={f.currency}>
                        {adminMoney(f.amount, f.currency)}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          )}
          <p className="ga-form-note">
            {renewing
              ? 'The renewal adds these days and its fee to your membership totals. Existing payments stay recorded; the renewal fee is outstanding until paid.'
              : editing
                ? 'Edit this assignment without creating a renewal. Coverage cannot overlap another record. A paid assignment must keep its currency and cover money already paid.'
                : 'Coverage cannot overlap another assignment. The fee is recorded as outstanding, not paid.'}
          </p>
          <button type="submit" className="gg-primary" disabled={!chosen}>
            {renewing
              ? 'Save renewal'
              : editing
                ? 'Save changes'
                : 'Save assignment'}
          </button>
        </fieldset>
      </form>
      {period && !period.cancelled && (
        <section className="ga-plan-removal">
          <h3>Remove current plan</h3>
          <p className="gg-small">
            Cancel {period.plan_name}, {adminDay(period.starts_on)} to{' '}
            {adminDay(period.ends_on)}. Payment history and outstanding fees are
            kept.
          </p>
          <button
            type="button"
            className="gg-danger"
            disabled={locked}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Remove this plan assignment?',
                  message:
                    'This ends the assignment and keeps its history. Payments are preserved. Outstanding fees remain until you adjust the record; no refund is issued.',
                  confirmLabel: 'Remove plan',
                  destructive: true,
                })
              ) {
                if (
                  await run(
                    'cancel_period',
                    { id: period.id },
                    'Plan assignment removed.',
                  )
                )
                  onClose()
              }
            }}
          >
            Remove plan
          </button>
        </section>
      )}
    </AdminModal>
  )
}
