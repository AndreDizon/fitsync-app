import type { GymMembership } from '../frontend/lib/gym-groups'
import { shiftDate } from './progress'

export function gymRenewalRecords(membership: GymMembership, today: string) {
 const periods = membership.membershipPeriods || [], current = new Set(membership.members.map(m => m.user_id))
 return periods.filter(p => current.has(p.user_id) && !p.cancelled && p.ends_on >= today && p.ends_on <= shiftDate(today, 7) && !periods.some(next => next.user_id === p.user_id && !next.cancelled && next.ends_on > p.ends_on && next.starts_on <= shiftDate(p.ends_on, 1)))
}
export const gymRenewalsDue = (membership: GymMembership, today: string) => new Set(gymRenewalRecords(membership, today).map(p => p.user_id)).size

export function gymMemberCoverage(membership: GymMembership, userId: string, today: string) {
 const periods = (membership.membershipPeriods || []).filter(p => p.user_id === userId && !p.cancelled)
 const active = periods.find(p => p.starts_on <= today && p.ends_on >= today)
 const next = periods.filter(p => p.starts_on > today).sort((a, b) => a.starts_on.localeCompare(b.starts_on))[0]
 const last = [...periods].sort((a, b) => b.ends_on.localeCompare(a.ends_on))[0]
 return { active, next, last }
}
