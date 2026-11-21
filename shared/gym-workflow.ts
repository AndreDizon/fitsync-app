import type { GymMembership, GymPeriod } from '../frontend/lib/gym-groups'
import { shiftDate } from './progress'

export function gymRenewalRecords(membership: GymMembership, today: string) {
  const periods = membership.membershipPeriods || [],
    current = new Set(membership.members.map((m) => m.user_id))
  return periods.filter(
    (p) =>
      current.has(p.user_id) &&
      !p.cancelled &&
      p.ends_on >= today &&
      p.ends_on <= shiftDate(today, 7) &&
      !periods.some(
        (next) =>
          next.user_id === p.user_id &&
          !next.cancelled &&
          next.ends_on > p.ends_on &&
          next.starts_on <= shiftDate(p.ends_on, 1),
      ),
  )
}
export const gymRenewalsDue = (membership: GymMembership, today: string) =>
  new Set(gymRenewalRecords(membership, today).map((p) => p.user_id)).size

export function gymMemberCoverage(
  membership: GymMembership,
  userId: string,
  today: string,
) {
  const periods = (membership.membershipPeriods || []).filter(
    (p) => p.user_id === userId && !p.cancelled,
  )
  const active = periods.find((p) => p.starts_on <= today && p.ends_on >= today)
  const next = periods
    .filter((p) => p.starts_on > today)
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on))[0]
  const last = [...periods].sort((a, b) =>
    b.ends_on.localeCompare(a.ends_on),
  )[0]
  return { active, next, last }
}

export function gymCoverageDays(start: string, end: string) {
  const days =
    (Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) /
      86400000 +
    1
  return Number.isFinite(days) && days > 0 ? days : 0
}

// Combine adjoining periods for display while retaining each fee and payment record.
// A gap, cancelled assignment or another member must never extend this coverage.
export function gymCoverageSummary(
  periods: GymPeriod[],
  userId: string,
  today: string,
  anchorId?: string,
) {
  const rows = periods
    .filter((p) => p.user_id === userId && !p.cancelled)
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
  const index = anchorId
    ? rows.findIndex((p) => p.id === anchorId)
    : rows.findIndex((p) => p.ends_on >= today)
  if (index < 0) return null
  let first = index,
    last = index
  while (
    first > 0 &&
    shiftDate(rows[first - 1].ends_on, 1) === rows[first].starts_on
  )
    first--
  while (
    last + 1 < rows.length &&
    shiftDate(rows[last].ends_on, 1) === rows[last + 1].starts_on
  )
    last++
  const chain = rows.slice(first, last + 1),
    amounts = new Map<string, number>()
  for (const p of chain)
    amounts.set(
      p.currency,
      (amounts.get(p.currency) || 0) + Math.round(Number(p.price) * 100),
    )
  return {
    current: rows[index],
    periods: chain,
    startsOn: chain[0].starts_on,
    endsOn: chain.at(-1)!.ends_on,
    days: gymCoverageDays(chain[0].starts_on, chain.at(-1)!.ends_on),
    fees: [...amounts].map(([currency, cents]) => ({
      currency,
      amount: cents / 100,
    })),
  }
}
