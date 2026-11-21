'use client'
import { useEffect, useRef, useState } from 'react'
import { Pin, Send, Share2, MessageCircle } from 'lucide-react'
import {
  gymRequest,
  type GymMembership,
  type GymAction,
  type GymAnnouncement,
} from '@/lib/gym-groups'
import {
  AdminModal,
  AdminSectionCard,
  AdminTable,
  adminDay,
  adminTime,
} from './gym-admin-primitives'
import { useConfirmation } from './confirm-dialog'
import { dateInZone } from '../../shared/progress'
import { SharedPlaylists, Sessions } from './gym-community-tools'

type Message = {
  id: string
  body: string
  username: string
  author_id: string
  created_at: string
}
export function GymDiscussion({
  membership,
  owner,
  locked,
  onAction,
  initialAnnouncements = false,
  framed = false,
}: {
  membership: GymMembership
  owner: string
  locked: boolean
  onAction: GymAction
  initialAnnouncements?: boolean
  framed?: boolean
}) {
  const admin = membership.role === 'admin',
    manager = admin || membership.role === 'staff',
    zone = membership.gym!.time_zone || 'Asia/Manila'
  const [editing, setEditing] = useState<GymAnnouncement | null>(null)
  const [showUnpinned, setShowUnpinned] = useState(false)
  const [messages, setMessages] = useState<Message[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(0),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    [modal, setModal] = useState<
      'pinned' | 'share' | 'post' | 'sessions' | null
    >(initialAnnouncements ? 'pinned' : null),
    [registered, setRegistered] = useState<{
      id: string
      title: string
    } | null>(null),
    [registrationRows, setRegistrationRows] = useState<
      { user_id: string; username: string; registered_at?: string }[] | null
    >(null),
    [registrationError, setRegistrationError] = useState(''),
    [registrationRetry, setRegistrationRetry] = useState(0),
    confirm = useConfirmation(),
    bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) setRetry((n) => n + 1)
    }, 30000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError('')
    gymRequest(
      'discussion',
      { page },
      AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
    )
      .then((d) => {
        if (!abort.signal.aborted) {
          setMessages(d.messages)
          setTotal(d.total)
          if (page > 0 && page * 30 >= d.total)
            setPage(Math.max(0, Math.ceil(d.total / 30) - 1))
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [page, retry, membership])
  useEffect(() => {
    if (page === 0) bottom.current?.scrollIntoView({ block: 'nearest' })
  }, [messages, page])
  useEffect(() => {
    if (!registered) return
    const abort = new AbortController()
    setRegistrationRows(null)
    setRegistrationError('')
    gymRequest(
      'session_registrations',
      { id: registered.id },
      AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
    )
      .then((d) => {
        if (!abort.signal.aborted) setRegistrationRows(d.entries)
      })
      .catch((e) => {
        if (!abort.signal.aborted) setRegistrationError(e.message)
      })
    return () => abort.abort()
  }, [registered, registrationRetry, membership])
  const content = (
    <>
      <div className="ga-chat">
        <div className="ga-chat-toolbar">
          {!framed && <div>
            <strong>Gym discussion</strong>
            <span className="gg-meta">
              Members only · Refreshes every 30 seconds
            </span>
          </div>}
          <div className="gg-actions">
            <button type="button" onClick={() => setModal('pinned')}>
              <Pin size={16} />
              See announcements (
              {membership.announcements?.filter((a) => a.pinned).length || 0})
            </button>
            <button type="button" onClick={() => setModal('share')}>
              <Share2 size={16} />
              Share playlist
            </button>
          </div>
        </div>
        {error && (
          <p className="gg-feedback gg-error" role="alert">
            {error}{' '}
            <button type="button" onClick={() => setRetry((n) => n + 1)}>
              Retry chat
            </button>
          </p>
        )}
        <div
          className="ga-chat-messages"
          aria-label="Gym messages"
          aria-busy={loading}
        >
          {loading && !messages.length ? (
            <p role="status">Loading discussion...</p>
          ) : !messages.length ? (
            <p className="gg-empty">
              Start the conversation. Share a question or an update with your
              gym.
            </p>
          ) : (
            [...messages].reverse().map((m) => (
              <article
                key={m.id}
                className={
                  'ga-message ' +
                  (m.author_id === owner ? 'ga-message-own' : '')
                }
              >
                <p className="gg-meta">
                  <strong>{m.author_id === owner ? 'You' : m.username}</strong>{' '}
                  · {adminDay(dateInZone(zone, new Date(m.created_at)))}{' '}
                  {adminTime(m.created_at, zone)}
                </p>
                <p>{m.body}</p>
                {(manager || m.author_id === owner) && (
                  <button
                    type="button"
                    className="ga-message-delete"
                    disabled={locked}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Delete message?',
                          message: 'Remove this message from the discussion?',
                          confirmLabel: 'Delete',
                          destructive: true,
                        })
                      )
                        await onAction(
                          'delete_message',
                          { id: m.id },
                          'Message removed.',
                        )
                    }}
                  >
                    Delete
                  </button>
                )}
              </article>
            ))
          )}
          <div ref={bottom} />
        </div>
        {total > 30 && (
          <nav className="gg-pagination" aria-label="Discussion pages">
            <button
              type="button"
              disabled={loading || (page + 1) * 30 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Older messages
            </button>
            <span>
              Page {page + 1} of {Math.max(1, Math.ceil(total / 30))}
            </span>
            <button
              type="button"
              disabled={loading || page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Newer messages
            </button>
          </nav>
        )}
        <form
          className="ga-chat-compose"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await onAction('message', { body: text }, 'Message sent.')) {
              setText('')
              setPage(0)
              setRetry((n) => n + 1)
            }
          }}
        >
          <label htmlFor="gym-chat-message" className="sr-only">
            Message your gym
          </label>
          <textarea
            id="gym-chat-message"
            required
            maxLength={2000}
            value={text}
            disabled={locked}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message your gym..."
          />
          <button
            type="submit"
            className="gg-primary"
            disabled={locked || !text.trim()}
          >
            <Send size={17} />
            Send
          </button>
        </form>
      </div>
      {modal === 'pinned' && (
        <AdminModal
          title="Gym announcements & events"
          onClose={() => setModal(null)}
        >
          <div className="gg-actions">
            <button type="button" onClick={() => setModal('sessions')}>
              All training sessions
            </button>
            {admin && (
              <button
                type="button"
                className="gg-primary"
                onClick={() => {
                  setEditing(null)
                  setModal('post')
                }}
              >
                Post update / event
              </button>
            )}
          </div>
          {admin && (
            <label className="ga-check">
              <input
                type="checkbox"
                checked={showUnpinned}
                onChange={(e) => setShowUnpinned(e.target.checked)}
              />
              Show unpinned announcements
            </label>
          )}
          <p className="gg-small">
            Pinned announcements appear here. Event times use {zone}.
            Preregistering reserves a place; it does not record attendance.
          </p>
          {!membership.announcements?.some(
            (a) => a.pinned || (admin && showUnpinned),
          ) && <p className="gg-empty">No pinned announcements yet.</p>}
          <div className="ga-pinned-posts">
            {[...(membership.announcements || [])]
              .filter((a) => a.pinned || (admin && showUnpinned))
              .sort((a, b) => Number(b.pinned) - Number(a.pinned))
              .map((a) => {
                const s = membership.sessions?.find(
                  (s) => s.id === a.session_id,
                )
                return (
                  <article className="gg-post" key={a.id}>
                    {a.pinned && (
                      <span className="gg-pin-label">
                        <Pin size={14} />
                        Pinned
                      </span>
                    )}
                    <h4>{a.title}</h4>
                    <p className="gg-post-body">{a.body}</p>
                    <p className="gg-meta">
                      {a.username || 'Gym admin'} ·{' '}
                      {adminDay(dateInZone(zone, new Date(a.created_at)))}
                    </p>
                    {s && (
                      <>
                        <p>
                          <strong>
                            {adminDay(dateInZone(zone, new Date(s.starts_at)))}{' '}
                            · {adminTime(s.starts_at, zone)} to{' '}
                            {adminTime(s.ends_at, zone)}
                          </strong>
                        </p>
                        <p>
                          {s.attending} / {s.capacity} participants
                        </p>
                        {!admin && (
                          <button
                            type="button"
                            className="gg-primary"
                            disabled={
                              locked ||
                              (!s.joined &&
                                (s.attending >= s.capacity ||
                                  new Date(s.starts_at) <= new Date()))
                            }
                            onClick={() =>
                              void onAction(
                                s.joined ? 'unrsvp' : 'rsvp',
                                { id: s.id },
                                s.joined
                                  ? 'Preregistration cancelled.'
                                  : 'Your place is reserved.',
                              )
                            }
                          >
                            {s.joined
                              ? 'Cancel preregistration'
                              : s.attending >= s.capacity
                                ? 'Full'
                                : new Date(s.starts_at) <= new Date()
                                  ? 'Started'
                                  : 'Preregister'}
                          </button>
                        )}
                      </>
                    )}
                    {a.session_id && !s && (
                      <p className="gg-small">
                        This session has ended or is no longer available.
                      </p>
                    )}
                    {admin && (
                      <div className="gg-actions">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            setEditing(a)
                            setModal('post')
                          }}
                        >
                          Edit announcement
                        </button>
                        {a.session_id && (
                          <button
                            type="button"
                            onClick={() =>
                              setRegistered({
                                id: a.session_id!,
                                title: a.title,
                              })
                            }
                          >
                            See preregistrations
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() =>
                            void onAction(
                              'pin',
                              { id: a.id, pinned: !a.pinned },
                              'Announcement updated.',
                            )
                          }
                        >
                          {a.pinned ? 'Unpin' : 'Pin'}
                        </button>
                        {s && (
                          <button
                            type="button"
                            className="gg-danger"
                            disabled={locked}
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: 'Cancel group session?',
                                  message:
                                    'Remove the session and all preregistrations? The announcement remains as a note.',
                                  confirmLabel: 'Cancel session',
                                  destructive: true,
                                })
                              )
                                await onAction(
                                  'cancel_session',
                                  { id: s.id },
                                  'Session cancelled.',
                                )
                            }}
                          >
                            Cancel event
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={locked}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: 'Delete announcement?',
                                message: a.session_id
                                  ? 'Remove this announcement? The scheduled session remains available under training sessions.'
                                  : 'Remove this announcement?',
                                confirmLabel: 'Delete',
                                destructive: true,
                              })
                            )
                              await onAction(
                                'delete_announcement',
                                { id: a.id },
                                'Announcement removed.',
                              )
                          }}
                        >
                          Delete announcement
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
          </div>
        </AdminModal>
      )}
      {modal === 'sessions' && (
        <AdminModal
          title="All training sessions"
          onClose={() => setModal('pinned')}
        >
          <Sessions
            membership={membership}
            manager={manager}
            locked={locked}
            onAction={onAction}
          />
        </AdminModal>
      )}
      {modal === 'post' && (
        <PostUpdate
          key={editing?.id || 'new'}
          editing={editing}
          zone={zone}
          locked={locked}
          onAction={onAction}
          onClose={() => setModal('pinned')}
        />
      )}
      {modal === 'share' && (
        <AdminModal
          title="Shared workout playlists"
          onClose={() => setModal(null)}
        >
          <SharedPlaylists
            membership={membership}
            owner={owner}
            manager={manager}
            locked={locked}
            onAction={onAction}
            initialShare
          />
        </AdminModal>
      )}
      {registered && (
        <AdminModal
          title={registered.title + ' - preregistrations'}
          onClose={() => setRegistered(null)}
        >
          {registrationError ? (
            <p role="alert">
              {registrationError}{' '}
              <button
                type="button"
                onClick={() => setRegistrationRetry((n) => n + 1)}
              >
                Retry
              </button>
            </p>
          ) : registrationRows === null ? (
            <p role="status">Loading registrations...</p>
          ) : (
            <AdminTable
              rows={registrationRows}
              label="Preregistered members"
              dateLabel="Registered on"
              zone={zone}
              dateOf={(r) =>
                r.registered_at
                  ? dateInZone(zone, new Date(r.registered_at))
                  : null
              }
              rowKey={(r) => r.user_id}
              searchText={(r) => r.username}
              columns={[
                { label: 'Member', render: (r) => r.username },
                {
                  label: 'Registered',
                  render: (r) =>
                    adminDay(
                      r.registered_at
                        ? dateInZone(zone, new Date(r.registered_at))
                        : null,
                    ),
                },
              ]}
            />
          )}
        </AdminModal>
      )}
    </>
  )
  return framed ? <AdminSectionCard title="Gym discussion" icon={MessageCircle} description="Members only · Refreshes every 30 seconds" defaultOpen>{content}</AdminSectionCard> : content
}
function PostUpdate({
  zone,
  locked,
  onAction,
  onClose,
  editing,
}: {
  editing?: GymAnnouncement | null
  zone: string
  locked: boolean
  onAction: GymAction
  onClose: () => void
}) {
  const [event, setEvent] = useState(false),
    [title, setTitle] = useState(editing?.title || ''),
    [body, setBody] = useState(editing?.body || ''),
    [pinned, setPinned] = useState(true),
    [start, setStart] = useState(''),
    [end, setEnd] = useState(''),
    [capacity, setCapacity] = useState(10),
    key = useRef<string | null>(null)
  useEffect(() => {
    key.current = null
  }, [event, title, body, pinned, start, end, capacity])
  return (
    <AdminModal
      title={
        editing ? 'Edit announcement' : 'Post announcement or group session'
      }
      onClose={onClose}
      busy={locked}
    >
      <form
        className="ga-form"
        onSubmit={async (e) => {
          e.preventDefault()
          key.current ??= crypto.randomUUID()
          if (
            await onAction(
              editing
                ? 'edit_announcement'
                : event
                  ? 'post_event'
                  : 'post_announcement',
              {
                id: editing?.id,
                title,
                body,
                pinned,
                startsLocal: start,
                endsLocal: end,
                capacity,
                timeZone: zone,
                requestId: key.current,
              },
              event ? 'Group session posted.' : 'Announcement posted.',
            )
          )
            onClose()
        }}
      >
        <fieldset disabled={locked}>
          {!editing && (
            <label>
              Post type
              <select
                aria-label="Post type"
                value={event ? 'event' : 'note'}
                onChange={(e) => setEvent(e.target.value === 'event')}
              >
                <option value="note">Announcement</option>
                <option value="event">Event / group session</option>
              </select>
            </label>
          )}
          <label>
            Title
            <input
              required
              minLength={3}
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Message
            <textarea
              required
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {event && (
            <>
              <p className="ga-form-note">
                Schedule using {zone}. Members can preregister up to the
                participant limit.
              </p>
              <div className="ga-form-grid">
                <label>
                  Starts (gym time)
                  <input
                    type="datetime-local"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  Ends (gym time)
                  <input
                    type="datetime-local"
                    required
                    min={start}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <label>
                  Participant limit
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </label>
              </div>
            </>
          )}
          {editing?.session_id && (
            <p className="ga-form-note">
              This updates the announcement text. The session schedule and
              reservations stay unchanged.
            </p>
          )}
          {!editing && (
            <label className="ga-check">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Pin this update (maximum 3)
            </label>
          )}
          <button type="submit" className="gg-primary">
            {editing
              ? 'Save announcement'
              : event
                ? 'Post group session'
                : 'Post announcement'}
          </button>
        </fieldset>
      </form>
    </AdminModal>
  )
}
