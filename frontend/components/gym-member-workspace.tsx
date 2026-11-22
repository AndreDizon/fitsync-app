"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
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
  AdminFeedbackContext,
  AdminTable,
  adminDay,
  adminMoney,
} from "./gym-admin-primitives";
import { GymMembershipPlans } from "./gym-membership-tools";
import { GymDailyCheckins } from "./gym-daily-checkins";
import { GymSessionsCard } from "./gym-sessions-card";
import { GymDiscussion } from "./gym-discussion";
import { useConfirmation } from "./confirm-dialog";
import { dateInZone } from "../../shared/progress";
import { historyOverlaps } from "../../shared/gym-history";
import "@/app/gym-member.css";

const sections = [
  {
    id: "settings",
    label: "Gym information",
    Icon: Building2,
    note: "Your gym details, welcome message and rules.",
  },
  {
    id: "team",
    label: "Gym team",
    Icon: Users,
    note: "Meet your gym admin, staff and fellow members.",
  },
  {
    id: "attendance",
    label: "My attendance",
    Icon: ClipboardCheck,
    note: "Check in, review your visits and reserve a place at gym activities.",
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
    note: "Chat, announcements and shared workouts.",
  },
] as const;

function destination(tab?: string) {
  if (tab === "membership-plans") return "membership";
  if (tab === "announcements") return "discussion";
  if (tab === "playlists") return "discussion";
  if (tab === "sessions") return "attendance";
  return sections.some((s) => s.id === tab) ? tab! : "settings";
}

export function GymMemberWorkspace({
  membership,
  owner,
  locked,
  onAction,
  initialTab,
  actionError,
}: {
  membership: GymMembership;
  owner: string;
  locked: boolean;
  onAction: GymAction;
  initialTab?: GymTab;
  actionError?: string;
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
  const staff = membership.role === "staff";
  const visibleSections = sections.map((s) =>
    staff && s.id === "membership"
      ? {
          ...s,
          label: "Member plans",
          note: "Apply existing plans and renew member coverage.",
        }
      : staff && s.id === "team"
        ? { ...s, note: "Review join requests and find your gym team." }
        : s,
  );
  const active =
    visibleSections.find((s) => s.id === tab) || visibleSections[0];
  const myPeriods = (membership.membershipPeriods || []).filter(
    (p) => p.user_id === owner,
  );
  function open(id: string) {
    focusNext.current = true;
    setTarget(sections.some((section) => section.id === id) ? "" : id);
    setTab(destination(id));
  }
  useEffect(() => {
    const card = panel.current?.querySelector<HTMLElement>(
      `[data-member-card="${target}"]`,
    );
    if (focusNext.current) {
      focusNext.current = false;
      if (!card)
        panel.current?.scrollIntoView({ block: "start", behavior: "instant" });
      panel.current
        ?.querySelector<HTMLElement>(".ga-page-heading h3")
        ?.focus({ preventScroll: true });
    }
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
    <AdminFeedbackContext.Provider value={actionError || ""}>
      <div className="ga-workspace gm-workspace">
        <nav className="ga-menu" aria-label="Your gym" onKeyDown={navigate}>
          {visibleSections.map((s) => (
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
            {visibleSections.map((s) => (
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
            {active.id === "settings" && (
              <>
                <AdminSectionCard
                  title="Gym details & rules"
                  icon={Building2}
                  description="Gym identity, welcome, rules and joining"
                >
                  <div className="gm-information">
                    <section>
                      <h4>Gym name</h4>
                      <p>{gym.name}</p>{" "}
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
                                await navigator.clipboard.writeText(
                                  gym.join_code!,
                                );
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
                    </section>
                    <section>
                      <h4>Welcome message</h4>
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
                    <section>
                      <dl className="gm-facts">
                        <div>
                          <dt>Time zone</dt>
                          <dd>{gymTimeZoneLabel(zone)}</dd>
                        </div>
                        <div>
                          <dt>Join membership status</dt>
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
                      </dl>
                    </section>
                  </div>
                </AdminSectionCard>
                <AdminSectionCard
                  title="Leave gym"
                  icon={LogOut}
                  description="Keep your personal FitSync account and records"
                  tone="warm"
                >
                  <p className="gg-small">
                    Leaving removes you from this gym community. Speak with the
                    gym team about any plan or outstanding payment before
                    leaving.
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
            {active.id === "team" && (
              <>
                {staff && (
                  <AdminSectionCard
                    title="Pending join requests"
                    icon={Users}
                    description="Accept or decline people waiting to join"
                  >
                    <AdminTable
                      rows={membership.requests || []}
                      label="Pending join requests"
                      dateLabel="Requested on"
                      zone={zone}
                      searchable={false}
                      dateOf={(r) => dateInZone(zone, new Date(r.created_at))}
                      rowKey={(r) => r.user_id}
                      searchText={(r) => r.username}
                      columns={[
                        { label: "Name", render: (r) => r.username },
                        {
                          label: "Requested",
                          render: (r) =>
                            adminDay(dateInZone(zone, new Date(r.created_at))),
                        },
                        {
                          label: "Actions",
                          render: (r) => (
                            <div className="gg-actions">
                              <button
                                type="button"
                                className="gg-primary"
                                disabled={
                                  locked || membership.members.length >= 100
                                }
                                onClick={() =>
                                  void onAction(
                                    "approve",
                                    { userId: r.user_id },
                                    "Member approved.",
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
                                      title: "Decline join request?",
                                      message: `Decline ${r.username}? They can request again.`,
                                      confirmLabel: "Decline",
                                    })
                                  )
                                    await onAction(
                                      "reject",
                                      { userId: r.user_id },
                                      "Request declined.",
                                    );
                                }}
                              >
                                Decline
                              </button>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </AdminSectionCard>
                )}
                <div data-member-card="team">
                  <AdminSectionCard
                    title="Gym team"
                    icon={Users}
                    description="Find your admin and staff"
                  >
                    <p className="gg-small">
                      Ask the admin about plan changes, payments or check-in
                      confirmation. Staff is a community role, not a
                      professional qualification.
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
                              ? adminDay(
                                  dateInZone(zone, new Date(m.joined_at)),
                                )
                              : "Not recorded",
                        },
                      ]}
                    />
                  </AdminSectionCard>
                </div>
              </>
            )}
            {active.id === "attendance" && (
              <>
                <AdminSectionCard
                  title="My gym visits"
                  icon={ClipboardCheck}
                  description="Check-in, checkout and admin confirmation"
                >
                  <GymDailyCheckins
                    membership={membership}
                    locked={locked}
                    tableView
                  />
                </AdminSectionCard>
                <div data-member-card="sessions">
                  <GymSessionsCard
                    membership={membership}
                    locked={locked}
                    onAction={onAction}
                    defaultOpen={target === "sessions"}
                  />
                </div>
              </>
            )}
            {active.id === "membership" && (
              <>
                <div data-member-card="membership-plans">
                  <AdminSectionCard
                    title="Available membership plans"
                    icon={BookOpen}
                    description="Compare durations and fees before asking your gym team"
                    tone="slate"
                    defaultOpen={target === "membership-plans"}
                  >
                    <p className="gg-small">
                      These are the gym's listed offers. Browsing a plan does
                      not enroll you or make a payment.
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
                <AdminSectionCard
                  title={
                    staff ? "Member coverage & renewals" : "My plan & coverage"
                  }
                  icon={ClipboardList}
                  description={
                    staff
                      ? "Apply an available plan or add renewal coverage"
                      : "Active, upcoming and past membership records"
                  }
                >
                  {staff ? (
                    <div className="gm-staff-records">
                      <GymMembershipPlans
                        membership={membership}
                        owner={owner}
                        locked={locked}
                        onAction={onAction}
                        view="records"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="ga-hint">
                        Your gym team applies, updates and renews plans. A
                        listed fee is not a payment receipt. Contact the admin
                        about payments or balance questions.
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
                                className={
                                  "gg-period-status gg-period-" + p.status
                                }
                              >
                                {p.status === "cancelled"
                                  ? "Removed"
                                  : p.status[0].toUpperCase() +
                                    p.status.slice(1)}
                              </span>
                            ),
                          },
                        ]}
                      />
                    </>
                  )}
                </AdminSectionCard>
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
                initialView={initialTab === "playlists" ? "share" : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </AdminFeedbackContext.Provider>
  );
}
