"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Home,
  LogOut,
  MessageCircle,
  Users,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";
import {
  gymTimeZoneLabel,
  type GymAction,
  type GymMembership,
  type GymTab,
} from "@/lib/gym-groups";
import {
  AdminSectionCard,
  AdminTable,
  adminDay,
  adminMoney,
} from "./gym-admin-primitives";
import { GymOverview } from "./gym-overview";
import { GymDailyCheckins } from "./gym-daily-checkins";
import { GymAttendance } from "./gym-management-tools";
import { GymDiscussion } from "./gym-discussion";
import { Sessions, SharedPlaylists } from "./gym-community-tools";
import { useConfirmation } from "./confirm-dialog";
import { dateInZone } from "../../shared/progress";
import { historyOverlaps } from "../../shared/gym-history";
import "@/app/gym-member.css";

const sections = [
  {
    id: "overview",
    label: "Overview",
    Icon: Home,
    note: "Your check-in, membership and next session.",
  },
  {
    id: "settings",
    label: "My gym",
    Icon: Building2,
    note: "Welcome, rules, gym details and the people who can help.",
  },
  {
    id: "attendance",
    label: "My attendance",
    Icon: ClipboardCheck,
    note: "Check in when you arrive and check out when you leave.",
  },
  {
    id: "membership",
    label: "My membership",
    Icon: ClipboardList,
    note: "Review your coverage and explore available plans.",
  },
  {
    id: "discussion",
    label: "Discussion",
    Icon: MessageCircle,
    note: "Chat, announcements, group sessions and shared workouts.",
  },
] as const;

function destination(tab?: string) {
  if (tab === "membership-plans") return "membership";
  if (tab === "announcements") return "discussion";
  if (tab === "playlists" || tab === "sessions") return "discussion";
  if (tab === "team") return "settings";
  return sections.some((s) => s.id === tab) ? tab! : "overview";
}

export function GymMemberWorkspace({
  membership,
  owner,
  locked,
  onAction,
  initialTab,
}: {
  membership: GymMembership;
  owner: string;
  locked: boolean;
  onAction: GymAction;
  initialTab?: GymTab;
}) {
  const [tab, setTab] = useState(() => destination(initialTab));
  const [target, setTarget] = useState<string>(initialTab || "");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState("");
  const panel = useRef<HTMLDivElement>(null),
    focusNext = useRef(false);
  const confirm = useConfirmation(),
    gym = membership.gym!,
    zone = gym.time_zone || "Asia/Manila";
  const active = sections.find((s) => s.id === tab) || sections[0];
  const myPeriods = (membership.membershipPeriods || []).filter(
    (p) => p.user_id === owner,
  );
  function open(id: string) {
    focusNext.current = true;
    setTarget(id);
    setTab(destination(id));
  }
  useEffect(() => {
    if (focusNext.current) {
      focusNext.current = false;
      panel.current
        ?.querySelector<HTMLElement>(".ga-page-heading h3")
        ?.focus({ preventScroll: true });
    }
    const card = panel.current?.querySelector<HTMLElement>(
      `[data-member-card="${target}"]`,
    );
    if (card) {
      const disclosure = card.querySelector<HTMLDetailsElement>("details");
      if (disclosure) disclosure.open = true;
      card.scrollIntoView({ block: "start", behavior: "instant" });
      disclosure
        ?.querySelector<HTMLElement>("summary")
        ?.focus({ preventScroll: true });
    }
  }, [tab, target]);
  function navigate(event: KeyboardEvent<HTMLElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
    );
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[next]?.focus();
    buttons[next]?.click();
  }
  return (
    <div className="ga-workspace gm-workspace">
      <nav className="ga-menu" aria-label="Your gym" onKeyDown={navigate}>
        {sections.map((s) => (
          <button
            id={"gym-nav-" + s.id}
            key={s.id}
            type="button"
            aria-pressed={active.id === s.id}
            aria-controls="gym-member-panel"
            onClick={() => open(s.id)}
          >
            <s.Icon size={17} />
            {s.label}
          </button>
        ))}
      </nav>
      <div className="ga-mobile-menu">
        <label htmlFor="gym-member-section">Your gym</label>
        <select
          id="gym-member-section"
          value={active.id}
          onChange={(e) => open(e.target.value)}
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
        id="gym-member-panel"
        ref={panel}
        tabIndex={-1}
        role="region"
        aria-label={active.label}
      >
        <header className="ga-page-heading">
          <div>
            <h3 tabIndex={-1}>{active.label}</h3>
            <p>{active.note}</p>
          </div>
        </header>
        <div className="ga-page-body gm-cards">
          {active.id === "overview" && (
            <AdminSectionCard
              title="Your gym today"
              icon={Home}
              description="Your next steps, in one place"
              defaultOpen
            >
              <GymOverview
                membership={membership}
                owner={owner}
                onOpen={open}
              />
            </AdminSectionCard>
          )}
          {active.id === "settings" && (
            <>
              <AdminSectionCard
                title="Welcome & gym rules"
                icon={BookOpen}
                description="Know what to expect before your next visit"
                defaultOpen
              >
                <div className="gm-information">
                  <section>
                    <h4>Welcome to {gym.name}</h4>
                    <p>
                      {gym.welcome_message ||
                        gym.description ||
                        "Your gym team has not added a welcome message yet."}
                    </p>
                  </section>
                  <section>
                    <h4>Gym rules</h4>
                    <p>
                      {gym.rules ||
                        "No rules posted yet. Ask your gym team about equipment, facilities and conduct."}
                    </p>
                  </section>
                </div>
              </AdminSectionCard>
              <AdminSectionCard
                title="Gym details"
                icon={Building2}
                description="Local time, joining policy and your role"
              >
                <dl className="gm-facts">
                  <div>
                    <dt>Gym name</dt>
                    <dd>{gym.name}</dd>
                  </div>
                  <div>
                    <dt>Time zone</dt>
                    <dd>{gymTimeZoneLabel(zone)}</dd>
                  </div>
                  <div>
                    <dt>Joining policy</dt>
                    <dd>
                      {
                        {
                          open: "Open to all",
                          approval: "Approval required",
                          invite: "Invite only",
                          closed: "Closed to new memberships",
                        }[gym.join_mode || "open"]
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Your role</dt>
                    <dd>Gym member</dd>
                  </div>
                </dl>
                {gym.join_code && (
                  <div className="gg-code gm-join-code">
                    <div>
                      <span>Gym code</span>
                      <strong>{gym.join_code}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(gym.join_code!);
                          setCopied(true);
                          setCopyError("");
                        } catch {
                          setCopyError(
                            "Copy is unavailable. Select the code to copy it manually.",
                          );
                        }
                      }}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                      {copied ? "Copied" : "Copy code"}
                    </button>
                  </div>
                )}
                {copied && (
                  <p className="gg-meta" role="status">
                    Gym code copied.
                  </p>
                )}
                {copyError && (
                  <p role="alert" className="gg-small">
                    {copyError}
                  </p>
                )}
              </AdminSectionCard>
              <div data-member-card="team">
                <AdminSectionCard
                  title="Gym team"
                  icon={Users}
                  description="Find your admin and staff"
                  defaultOpen={target === "team"}
                >
                  <p className="gg-small">
                    Ask the admin about plan changes, payments or check-in
                    confirmation. Staff is a community role, not a professional
                    qualification.
                  </p>
                  <AdminTable
                    rows={membership.members.filter(
                      (m) => role === "all" || m.role === role,
                    )}
                    label="Gym team"
                    dateLabel="Joined on"
                    zone={zone}
                    searchable={false}
                    dateOf={(m) =>
                      m.joined_at
                        ? dateInZone(zone, new Date(m.joined_at))
                        : null
                    }
                    rowKey={(m) => m.user_id}
                    searchText={(m) => m.username}
                    extraFilters={
                      <div className="gg-field">
                        <label htmlFor="gym-team-role">Role</label>
                        <select
                          id="gym-team-role"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                        >
                          <option value="all">All roles</option>
                          <option value="admin">Gym admin</option>
                          <option value="staff">Staff</option>
                          <option value="member">Gym member</option>
                        </select>
                      </div>
                    }
                    columns={[
                      {
                        label: "Name",
                        render: (m) => (
                          <strong>
                            {m.username}
                            {m.user_id === owner ? " (you)" : ""}
                          </strong>
                        ),
                      },
                      {
                        label: "Role",
                        render: (m) =>
                          m.role === "admin"
                            ? "Gym admin"
                            : m.role === "staff"
                              ? "Staff"
                              : "Gym member",
                      },
                      {
                        label: "Joined",
                        render: (m) =>
                          m.joined_at
                            ? adminDay(dateInZone(zone, new Date(m.joined_at)))
                            : "Not recorded",
                      },
                    ]}
                  />
                </AdminSectionCard>
              </div>

              <AdminSectionCard
                title="Leave gym"
                icon={LogOut}
                description="Keep your personal FitSync account and records"
                tone="warm"
              >
                <p className="gg-small">
                  Leaving removes you from this gym community. Speak with the
                  gym team about any plan or outstanding payment before leaving.
                </p>
                <button
                  type="button"
                  disabled={locked}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Leave this gym?",
                        message: `Leave ${gym.name}? Your personal FitSync plans and records stay intact.`,
                        confirmLabel: "Leave gym",
                      })
                    )
                      await onAction("leave", {}, "You left the gym.");
                  }}
                >
                  Leave gym
                </button>
              </AdminSectionCard>
            </>
          )}
          {active.id === "attendance" && (
            <>
              <AdminSectionCard
                title="My gym visits"
                icon={ClipboardCheck}
                description="Check-in, checkout and admin confirmation"
                defaultOpen
              >
                <GymDailyCheckins
                  membership={membership}
                  locked={locked}
                  tableView
                />
              </AdminSectionCard>
              <AdminSectionCard
                title="Session attendance"
                icon={CalendarDays}
                description="Your attendance at scheduled group sessions"
                defaultOpen={target === "attendance"}
              >
                <GymAttendance
                  membership={membership}
                  locked={locked}
                  onAction={onAction}
                  view="sessions"
                />
              </AdminSectionCard>
            </>
          )}
          {active.id === "membership" && (
            <>
              <AdminSectionCard
                title="My plan & coverage"
                icon={ClipboardList}
                description="Active, upcoming and past membership records"
                defaultOpen
              >
                <p className="ga-hint">
                  Your gym team applies, updates and renews plans. A listed fee
                  is not a payment receipt. Contact the admin about payments or
                  balance questions.
                </p>
                <AdminTable
                  rows={myPeriods.filter(
                    (p) => status === "all" || p.status === status,
                  )}
                  label="My membership records"
                  dateLabel="Coverage dates"
                  zone={zone}
                  searchable={false}
                  dateOf={(p) => p.starts_on}
                  matches={(p, range) =>
                    historyOverlaps(p.starts_on, p.ends_on, range)
                  }
                  rowKey={(p) => p.id}
                  searchText={(p) => p.plan_name}
                  extraFilters={
                    <div className="gg-field">
                      <label htmlFor="gym-my-plan-status">Status</label>
                      <select
                        id="gym-my-plan-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="all">All records</option>
                        <option value="active">Active</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Removed</option>
                      </select>
                    </div>
                  }
                  columns={[
                    {
                      label: "Plan",
                      render: (p) => <strong>{p.plan_name}</strong>,
                    },
                    {
                      label: "Coverage",
                      render: (p) => (
                        <>
                          {adminDay(p.starts_on)} – {adminDay(p.ends_on)}
                        </>
                      ),
                    },
                    {
                      label: "Fee",
                      render: (p) => adminMoney(p.price, p.currency),
                    },
                    {
                      label: "Status",
                      render: (p) => (
                        <span
                          className={"gg-period-status gg-period-" + p.status}
                        >
                          {p.status === "cancelled"
                            ? "Removed"
                            : p.status[0].toUpperCase() + p.status.slice(1)}
                        </span>
                      ),
                    },
                  ]}
                />
              </AdminSectionCard>
              <div data-member-card="membership-plans">
                <AdminSectionCard
                  title="Available membership plans"
                  icon={BookOpen}
                  description="Compare durations and fees before asking your gym team"
                  tone="slate"
                  defaultOpen={target === "membership-plans"}
                >
                  <p className="gg-small">
                    These are the gym's listed offers. Browsing a plan does not
                    enroll you or make a payment.
                  </p>
                  <AdminTable
                    rows={(membership.plans || []).filter((p) => !p.archived)}
                    label="Available membership plans"
                    dateLabel="Plan created on"
                    zone={zone}
                    searchable={false}
                    dateOf={(p) =>
                      p.created_at
                        ? dateInZone(zone, new Date(p.created_at))
                        : null
                    }
                    rowKey={(p) => p.id}
                    searchText={(p) => p.name}
                    columns={[
                      {
                        label: "Plan",
                        render: (p) => (
                          <>
                            <strong>{p.name}</strong>
                            {p.description && (
                              <p className="gg-small">{p.description}</p>
                            )}
                          </>
                        ),
                      },
                      {
                        label: "Duration",
                        render: (p) => `${p.duration_days} days`,
                      },
                      {
                        label: "Fee",
                        render: (p) => adminMoney(p.price, p.currency),
                      },
                    ]}
                  />
                </AdminSectionCard>
              </div>
            </>
          )}
          {active.id === "discussion" && (
            <GymDiscussion
              framed
              membership={membership}
              owner={owner}
              locked={locked}
              onAction={onAction}
              initialAnnouncements={initialTab === "announcements"}
            />
          )}
          {active.id === "discussion" && (
            <>
              <div data-member-card="sessions">
                <AdminSectionCard
                  title="Group sessions"
                  icon={CalendarDays}
                  description="Reserve or cancel your place in a scheduled session"
                  defaultOpen={target === "sessions"}
                >
                  <Sessions
                    membership={membership}
                    manager={false}
                    locked={locked}
                    onAction={onAction}
                  />
                </AdminSectionCard>
              </div>
              <div data-member-card="playlists">
                <AdminSectionCard
                  title="Shared workout playlists"
                  icon={ClipboardList}
                  description="Save a personal copy or share one of your workouts"
                  defaultOpen={target === "playlists"}
                >
                  <SharedPlaylists
                    membership={membership}
                    owner={owner}
                    manager={false}
                    locked={locked}
                    onAction={onAction}
                  />
                </AdminSectionCard>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
