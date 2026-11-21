type Balance = {
  user_id: string
  starts_on: string
  currency: string
  price: number | string
  paid: number | string
  outstanding: number | string
}
type CashMonth = {
  month: string
  currency: string
  received: string
  refunds: string
}
const cents = (value: string | number) => Math.round(Number(value) * 100)

// Every figure is scoped to the selected year and month. Cash uses its receipt
// month; plan fees use their start month. Plan balances remain current snapshots.
export function gymCollectionsSummary(
  balances: Balance[],
  cash: CashMonth[],
  year: number,
  month: number,
  today: string,
) {
  const key = `${year}-${String(month).padStart(2, '0')}`,
    selected = cash.filter((r) => r.month === key),
    selectedBalances = balances.filter((p) => p.starts_on.slice(0, 7) === key)
  const currencies = [
    ...new Set([
      ...balances.map((p) => p.currency),
      ...selected.map((r) => r.currency),
    ]),
  ].sort()
  return currencies.map((currency) => {
    const rows = selectedBalances.filter((p) => p.currency === currency),
      receipts = selected.filter((r) => r.currency === currency)
    const received = receipts.reduce((n, r) => n + cents(r.received), 0),
      refunded = receipts.reduce((n, r) => n + cents(r.refunds), 0)
    let started = 0,
      future = 0,
      fees = 0,
      paid = 0,
      unpaid = 0
    const members = new Set<string>()
    for (const p of rows) {
      const due = Math.max(0, cents(p.outstanding))
      if (p.starts_on <= today) started += due
      else future += due
      if (due > 0) members.add(p.user_id)
      if (p.starts_on.slice(0, 7) === key) {
        fees += cents(p.price)
        paid += Math.max(0, cents(p.paid))
        unpaid += due
      }
    }
    return {
      currency,
      hasRecords: rows.length > 0 || receipts.length > 0,
      received: received / 100,
      refunded: refunded / 100,
      net: (received - refunded) / 100,
      outstanding: (started + future) / 100,
      startedOutstanding: started / 100,
      futureOutstanding: future / 100,
      unpaidMembers: members.size,
      monthFees: fees / 100,
      monthPaid: paid / 100,
      monthOutstanding: unpaid / 100,
      collectionPercent:
        fees > 0 ? Math.min(100, Math.floor((paid / fees) * 1000) / 10) : null,
    }
  })
}
