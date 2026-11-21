'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, LogOut, Trash2 } from 'lucide-react'
import { type GymMembership, type GymAction } from '@/lib/gym-groups'
import { AdminSectionCard } from './gym-admin-primitives'
import { useConfirmation } from './confirm-dialog'

export function GymAdminSettings({
  membership,
  locked,
  onAction,
}: {
  membership: GymMembership
  locked: boolean
  onAction: GymAction
}) {
  const gym = membership.gym!,
    confirm = useConfirmation()
  const [name, setName] = useState(gym.name),
    [welcome, setWelcome] = useState(gym.welcome_message || ''),
    [rules, setRules] = useState(gym.rules || ''),
    [zone, setZone] = useState(gym.time_zone || 'Asia/Manila'),
    [mode, setMode] = useState(gym.join_mode || 'open'),
    [successor, setSuccessor] = useState(''),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState('')
  useEffect(() => setName(gym.name), [gym.name])
  useEffect(() => {
    setWelcome(gym.welcome_message || '')
    setRules(gym.rules || '')
    setZone(gym.time_zone || 'Asia/Manila')
    setMode(gym.join_mode || 'open')
  }, [gym.welcome_message, gym.rules, gym.time_zone, gym.join_mode])
  const zones = useMemo(() => {
    const supported = (
      Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.('timeZone') || [
      'Asia/Manila',
      'UTC',
      'Asia/Tokyo',
      'Europe/London',
      'America/New_York',
      'Australia/Sydney',
    ]
    return [
      ...new Set([
        ...supported,
        'Asia/Manila',
        'UTC',
        gym.time_zone || 'Asia/Manila',
      ]),
    ].sort()
  }, [gym.time_zone])
  const members = membership.members.filter((m) => m.user_id !== gym.owner_id),
    selected = members.find((m) => m.user_id === successor)
  return (
    <div className="ga-settings-cards">
      <AdminSectionCard title="Gym name & code" defaultOpen>
        <form
          className="ga-settings-form"
          onSubmit={async (e) => {
            e.preventDefault()
            await onAction('rename_gym', { name }, 'Gym name saved.')
          }}
        >
          <fieldset disabled={locked}>
            <label>
              Gym name
              <input
                required
                minLength={3}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="gg-code">
              <div>
                <span>Gym code</span>
                <strong>{gym.join_code}</strong>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setCopyError('')
                  try {
                    await navigator.clipboard.writeText(gym.join_code || '')
                    setCopied(true)
                  } catch {
                    setCopyError('Select the gym code and copy it manually.')
                  }
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy code'}
              </button>
            </div>
            {copyError && (
              <p role="alert" className="gg-feedback gg-error">
                {copyError}
              </p>
            )}
            <div className="gg-actions">
              <button
                type="submit"
                className="gg-primary"
                disabled={name.trim() === gym.name}
              >
                Save gym name
              </button>
            </div>
          </fieldset>
        </form>
      </AdminSectionCard>
      <AdminSectionCard title="Welcome, rules & joining">
        <form
          className="ga-settings-form"
          onSubmit={async (e) => {
            e.preventDefault()
            await onAction(
              'save_gym_guidance',
              {
                welcomeMessage: welcome,
                rules,
                joinMode: mode,
                timeZone: zone,
              },
              'Welcome, rules and joining settings saved.',
            )
          }}
        >
          <fieldset disabled={locked}>
            <label>
              Welcome message / description
              <textarea
                aria-label="Welcome message"
                maxLength={1000}
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                placeholder="Welcome your team and explain how to get started."
              />
            </label>
            <label>
              Gym rules
              <textarea
                maxLength={4000}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Share expectations for conduct, equipment and training together."
              />
            </label>
            <div className="gg-field">
              <label htmlFor="gym-settings-zone">Time zone</label>
              <select
                id="gym-settings-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z === 'Asia/Manila'
                      ? 'Asia/Manila - Philippine time (UTC+08:00)'
                      : z.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <p className="gg-small">
              Session times use this zone. Existing sessions keep their
              scheduled moment when it changes.
            </p>
            <label htmlFor="gym-settings-joining">Join membership status</label>
            <select
              id="gym-settings-joining"
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="open">Open to all</option>
              <option value="approval">Approval required</option>
              <option value="invite">Invite only</option>
              <option value="closed">Closed</option>
            </select>
            <p className="gg-small">
              Changing the joining status clears pending requests. Closed blocks
              new joins, including by code.
            </p>
            <div className="gg-actions">
              <button type="submit" className="gg-primary">
                Save welcome & joining settings
              </button>
            </div>
          </fieldset>
        </form>
      </AdminSectionCard>
      <AdminSectionCard title="Ownership & deletion">
        <section className="ga-ownership-action">
          <h5>Transfer ownership &amp; leave</h5>
          <p className="gg-small">
            Choose a current member to become the gym admin. You will leave the
            gym after the transfer.
          </p>
          <label htmlFor="gym-next-owner">New gym admin</label>
          <select
            id="gym-next-owner"
            value={selected?.user_id || ''}
            disabled={locked || !members.length}
            onChange={(e) => setSuccessor(e.target.value)}
          >
            <option value="">Choose a member</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.username} - {m.role}
              </option>
            ))}
          </select>
          {!members.length && (
            <p className="gg-small">
              Another member must join before you can transfer ownership and
              leave.
            </p>
          )}
          <button
            type="button"
            disabled={locked || !selected}
            onClick={async () => {
              if (
                selected &&
                (await confirm({
                  title: 'Transfer ownership and leave?',
                  message: `${selected.username} will become the only gym admin. You will leave ${gym.name} and lose management access. Existing gym plans, payments and shared content stay with the gym.`,
                  confirmLabel: 'Transfer & leave',
                  destructive: true,
                }))
              )
                await onAction(
                  'transfer_leave',
                  { userId: selected.user_id },
                  'Ownership transferred. You left the gym.',
                )
            }}
          >
            <LogOut size={16} />
            Transfer ownership &amp; leave
          </button>
        </section>
        <section className="ga-ownership-action">
          <h5>Delete gym</h5>
          <p className="gg-small">
            Permanently remove this gym, its memberships, shared content and
            income records. Personal FitSync accounts and records stay intact.
          </p>
          <button
            type="button"
            className="gg-danger"
            disabled={locked}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Delete this gym?',
                  message: `Permanently delete ${gym.name}, its shared content, income records and all ${membership.members.length} memberships? This cannot be undone.`,
                  confirmLabel: 'Delete gym',
                  destructive: true,
                })
              )
                await onAction('disband', {}, 'Gym deleted.')
            }}
          >
            <Trash2 size={16} />
            Delete gym
          </button>
        </section>
      </AdminSectionCard>
    </div>
  )
}
