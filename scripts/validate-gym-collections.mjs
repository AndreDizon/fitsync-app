import assert from 'node:assert/strict'
import { build } from 'esbuild'

const output = await build({
  entryPoints: ['shared/gym-collections.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
})
const { gymCollectionsSummary: summary } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(output.outputFiles[0].text).toString('base64')
)
const balance = (user, start, paid, extra = {}) => ({
  user_id: user,
  starts_on: start,
  price: 100,
  paid,
  outstanding: 100 - paid,
  currency: 'PHP',
  ...extra,
})
const rows = [
  balance('andre', '2026-11-21', 100, { cancelled: true }),
  balance('liah', '2026-11-21', 0),
  balance('liah', '2026-11-21', 50, { cancelled: true }),
  balance('liah', '2026-12-21', 0),
  balance('liah', '2027-01-20', 0),
]
const cash = [
  { month: '2026-11', currency: 'PHP', received: '150', refunds: '0' },
]
const r = summary(rows, cash, 2026, 11, '2026-11-22')[0]
assert.equal(
  r.net,
  150,
  'Outstanding is not a cash expense and must not be subtracted from net receipts',
)
assert.equal(r.outstanding, 350)
assert.equal(r.startedOutstanding, 150)
assert.equal(r.futureOutstanding, 200)
assert.equal(r.unpaidMembers, 1)
assert.equal(r.monthFees, 300)
assert.equal(r.monthPaid, 150)
assert.equal(r.monthOutstanding, 150)
assert.equal(r.collectionPercent, 50)
const noCash = summary(rows, [], 2026, 11, '2026-11-22')[0]
assert.equal(noCash.net, 0)
assert.equal(
  noCash.outstanding,
  350,
  'Unpaid plans must be shown even without receipts',
)
const december = summary(rows, cash, 2026, 12, '2026-11-22')[0]
assert.equal(december.received, 0)
assert.equal(december.monthFees, 100)
assert.equal(december.monthOutstanding, 100)
assert.equal(
  december.futureOutstanding,
  200,
  'Future is based on today, not the selected month',
)
const refunded = summary(
  [],
  [{ month: '2026-12', currency: 'PHP', received: '0', refunds: '50' }],
  2026,
  12,
  '2026-12-01',
)[0]
assert.equal(refunded.net, -50)
const currencies = summary(
  [
    ...rows,
    balance('dizon', '2026-11-01', 0, {
      price: 20,
      outstanding: 20,
      currency: 'USD',
    }),
  ],
  cash,
  2026,
  11,
  '2026-11-22',
)
assert.equal(currencies.length, 2)
assert.equal(currencies[1].outstanding, 20)
assert.equal(currencies[0].outstanding, 350)
const rounding = summary(
  [
    balance('a', '2026-11-01', 0.1, { price: 0.1, outstanding: 0 }),
    balance('b', '2026-11-01', 0.2, { price: 0.2, outstanding: 0 }),
  ],
  [],
  2026,
  11,
  '2026-11-22',
)[0]
assert.equal(rounding.monthFees, 0.3)
assert.equal(rounding.monthPaid, 0.3)
assert.equal(rounding.collectionPercent, 100)
assert.equal(
  summary([balance('a', '2026-11-01', 99.99)], [], 2026, 11, '2026-11-22')[0]
    .collectionPercent,
  99.9,
)
assert.equal(
  summary(
    [balance('a', '2026-11-01', 0, { price: 0, outstanding: 0 })],
    [],
    2026,
    11,
    '2026-11-22',
  )[0].collectionPercent,
  null,
)
assert.deepEqual(summary([], [], 2026, 11, '2026-11-22'), [])
console.log(
  'PASS collections summary: unpaid/started/future balances, removed-record debts, member counts, comparable monthly cohort, no-receipt and refund-only months, currencies and cents precision',
)
