"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  gymRequest,
  gymTimeZoneLabel,
  type GymAction,
  type GymMembership,
  type GymSession,
} from "@/lib/gym-groups";
import {
  AdminSectionCard,
  AdminTable,
  AdminModal,
  adminDay,
  adminTime,
} from "./gym-admin-primitives";
import { useConfirmation } from "./confirm-dialog";
import { dateInZone } from "../../shared/progress";

export function GymSessionsCard({
  membership,
  locked,
  onAction,
  defaultOpen = false,
}: {
  membership: GymMembership;
  locked: boolean;
  onAction: GymAction;
  defaultOpen?: boolean;
}) {
  const admin = membership.role === "admin",
    zone = membership.gym!.time_zone || "Asia/Manila";
  const [kind, setKind] = useState("all"),
    [create, setCreate] = useState(false);
  const [roster, setRoster] = useState<GymSession | null>(null),
    [entries, setEntries] = useState<
      { user_id: string; username: string; registered_at?: string }[] | null
    >(null);
  const [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const confirm = useConfirmation();
  useEffect(() => {
    if (!roster || !admin) return;
    const abort = new AbortController();
    setEntries(null);
    setError("");
    gymRequest(
      "session_registrations",
      { id: roster.id },
      AbortSignal.any([abort.signal, AbortSignal.timeout(30000)]),
    )
      .then((r) => {
        if (!abort.signal.aborted) setEntries(r.entries);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [roster, admin, retry, membership]);
  const typeOf = (s: GymSession) =>
    s.session_kind ||
    (membership.announcements?.some((a) => a.session_id === s.id)
      ? "event"
      : "group_session");
  return (
    <AdminSectionCard
      title="Events & group sessions"
      icon={CalendarDays}
      description={
        admin
          ? "Schedule activities and review preregistrations"
          : "View activities and reserve your place"
      }
      defaultOpen={defaultOpen}
    >
      <p className="gg-small">
        Times use {gymTimeZoneLabel(zone)}. A reservation holds a place for an
        event or group session; it does not record a daily gym visit.
      </p>
      {admin && (
        <div className="gg-actions ga-session-actions">
          <button
            type="button"
            className="gg-primary"
            disabled={locked}
            onClick={() => setCreate(true)}
          >
            Create event / group session
          </button>
        </div>
      )}
      <AdminTable
        rows={(membership.sessions || []).filter(
          (s) => kind === "all" || typeOf(s) === kind,
        )}
        label="Events and group sessions"
        dateLabel="Scheduled date"
        zone={zone}
        searchable={false}
        dateOf={(s) => dateInZone(zone, new Date(s.starts_at))}
        rowKey={(s) => s.id}
        searchText={(s) => s.title}
        extraFilters={
          <div className="gg-field">
            <label htmlFor="gym-session-kind-filter">Activity type</label>
            <select
              id="gym-session-kind-filter"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="all">All activities</option>
              <option value="event">Event</option>
              <option value="group_session">Group session</option>
            </select>
          </div>
        }
        columns={[
          {
            label: "Activity",
            render: (s) => (
              <>
                <strong>{s.title}</strong>
                {s.description && <p className="gg-small">{s.description}</p>}
              </>
            ),
          },
          {
            label: "Type",
            render: (s) => (typeOf(s) === "event" ? "Event" : "Group session"),
          },
          {
            label: "Schedule",
            render: (s) => (
              <>
                {adminDay(dateInZone(zone, new Date(s.starts_at)))}
                <br />
                {adminTime(s.starts_at, zone)} – {adminTime(s.ends_at, zone)}
              </>
            ),
          },
          {
            label: "Participants",
            render: (s) => (
              <>
                {s.attending} / {s.capacity}
                {!admin && s.joined && (
                  <p className="gg-small">Your place is reserved</p>
                )}
              </>
            ),
          },
          {
            label: "Actions",
            render: (s) =>
              admin ? (
                <div className="gg-actions">
                  <button type="button" onClick={() => setRoster(s)}>
                    See preregistrations
                  </button>
                  <button
                    type="button"
                    className="gg-danger"
                    disabled={locked}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Cancel this activity?",
                          message: `Cancel ${s.title} and remove all its reservations?`,
                          confirmLabel: "Cancel activity",
                          destructive: true,
                        })
                      )
                        await onAction(
                          "cancel_session",
                          { id: s.id },
                          "Activity cancelled.",
                        );
                    }}
                  >
                    Cancel activity
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={s.joined ? "" : "gg-primary"}
                  disabled={
                    locked ||
                    (!s.joined &&
                      (s.attending >= s.capacity ||
                        new Date(s.starts_at) <= new Date()))
                  }
                  onClick={() =>
                    void onAction(
                      s.joined ? "unrsvp" : "rsvp",
                      { id: s.id },
                      s.joined
                        ? "Reservation cancelled."
                        : "Your place is reserved.",
                    )
                  }
                >
                  {s.joined
                    ? "Cancel reservation"
                    : s.attending >= s.capacity
                      ? "Full"
                      : new Date(s.starts_at) <= new Date()
                        ? "Started"
                        : "Reserve a place"}
                </button>
              ),
          },
        ]}
      />
      {create && (
        <SessionEditor
          zone={zone}
          locked={locked}
          onAction={onAction}
          onClose={() => setCreate(false)}
        />
      )}
      {roster && (
        <AdminModal
          size="report"
          title={"Preregistrations: " + roster.title}
          onClose={() => setRoster(null)}
        >
          {error ? (
            <p role="alert">
              {error}{" "}
              <button type="button" onClick={() => setRetry((r) => r + 1)}>
                Retry registrations
              </button>
            </p>
          ) : entries === null ? (
            <p role="status">Loading registrations...</p>
          ) : (
            <AdminTable
              rows={entries}
              label="Preregistered members"
              dateLabel="Registered on"
              zone={zone}
              searchable={false}
              dateOf={(r) =>
                r.registered_at
                  ? dateInZone(zone, new Date(r.registered_at))
                  : null
              }
              rowKey={(r) => r.user_id}
              searchText={(r) => r.username}
              columns={[
                { label: "Member", render: (r) => r.username },
                {
                  label: "Registered",
                  render: (r) =>
                    r.registered_at
                      ? adminDay(dateInZone(zone, new Date(r.registered_at)))
                      : "Not recorded",
                },
              ]}
            />
          )}
        </AdminModal>
      )}
    </AdminSectionCard>
  );
}

function SessionEditor({
  zone,
  locked,
  onAction,
  onClose,
}: {
  zone: string;
  locked: boolean;
  onAction: GymAction;
  onClose: () => void;
}) {
  const [kind, setKind] = useState("event"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState("");
  const [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [capacity, setCapacity] = useState(10),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const requestId = useRef<string | null>(null),
    writing = useRef(false);
  useEffect(() => {
    requestId.current = null;
  }, [kind, title, description, start, end, capacity]);
  return (
    <AdminModal
      title="Create event / group session"
      onClose={onClose}
      busy={locked || busy}
    >
      <form
        className="ga-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (writing.current) return;
          if (!start || !end || end <= start) {
            setError("Choose an end time after the start time.");
            return;
          }
          requestId.current ??= crypto.randomUUID();
          writing.current = true;
          setBusy(true);
          setError("");
          try {
            if (
              await onAction(
                "create_session",
                {
                  sessionKind: kind,
                  title,
                  description,
                  startsLocal: start,
                  endsLocal: end,
                  capacity,
                  requestId: requestId.current,
                },
                "Activity scheduled.",
              )
            )
              onClose();
            else
              setError(
                "Could not save this activity. Check the gym message and try again.",
              );
          } finally {
            writing.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={locked || busy}>
          <label>
            Activity type
            <select
              aria-label="Activity type"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="event">Event</option>
              <option value="group_session">Group session</option>
            </select>
          </label>
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
            Details
            <textarea
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Location, equipment and what to expect"
            />
          </label>
          <p className="ga-form-note">
            Use {gymTimeZoneLabel(zone)}. Choose a future start within 180 days,
            up to 8 hours long.
          </p>
          <div className="ga-form-grid">
            <label>
              Starts (gym time)
              <input
                required
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Ends (gym time)
              <input
                required
                type="datetime-local"
                min={start}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <label>
              Participant limit
              <input
                required
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="gg-error">
              {error}
            </p>
          )}
          <button type="submit" className="gg-primary">
            {busy ? "Scheduling..." : "Schedule activity"}
          </button>
        </fieldset>
      </form>
    </AdminModal>
  );
}
