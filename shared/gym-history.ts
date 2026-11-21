export type HistoryRange = { from: string; to: string }
export const emptyHistoryRange: HistoryRange = { from: '', to: '' }
export const historyContainsDay = (day: string, range: HistoryRange) => (!range.from || day >= range.from) && (!range.to || day <= range.to)
// Membership dates are inclusive; include records active on any day in the range.
export const historyOverlaps = (start: string, end: string, range: HistoryRange) => (!range.from || end >= range.from) && (!range.to || start <= range.to)
