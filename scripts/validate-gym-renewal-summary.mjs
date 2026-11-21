import assert from 'node:assert/strict'
import { build } from 'esbuild'

const output = await build({
  entryPoints: ['shared/gym-workflow.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
})
const { gymCoverageSummary: summary, gymCoverageDays: days } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(output.outputFiles[0].text).toString('base64')
)
const period = (id, start, end, extra = {}) => ({
  id,
  user_id: 'member',
  plan_id: 'monthly',
  plan_name: 'Monthly',
  price: 100,
  currency: 'PHP',
  starts_on: start,
  ends_on: end,
  cancelled: false,
  status: 'active',
  ...extra,
})
const first = period('first', '2026-11-21', '2026-12-20'),
  renewal = period('renewal', '2026-12-21', '2027-01-19')
const combined = summary([renewal, first], 'member', '2026-11-22')
assert.equal(combined.startsOn, '2026-11-21')
assert.equal(combined.endsOn, '2027-01-19')
assert.equal(combined.days, 60)
assert.deepEqual(combined.fees, [{ currency: 'PHP', amount: 200 }])
assert.equal(combined.current.id, 'first')
assert.equal(
  summary([first, renewal], 'member', '2026-12-22').current.id,
  'renewal',
)
assert.equal(
  summary([first, renewal], 'member', '2026-12-22').days,
  60,
  'Prior continuous coverage stays in the combined total',
)
const third = period('third', '2027-01-20', '2027-02-18')
assert.equal(summary([third, renewal, first], 'member', '2026-11-22').days, 90)
assert.equal(
  summary([third, renewal, first], 'member', '2026-11-22').fees[0].amount,
  300,
)
const gap = period('gap', '2026-12-22', '2027-01-20')
assert.equal(
  summary([first, gap], 'member', '2026-11-22').days,
  30,
  'A missing day must not be presented as covered',
)
assert.equal(
  summary(
    [first, { ...renewal, cancelled: true }, third],
    'member',
    '2026-11-22',
  ).days,
  30,
)
assert.equal(
  summary(
    [first, { ...renewal, user_id: 'someone-else' }],
    'member',
    '2026-11-22',
  ).fees[0].amount,
  100,
)
assert.deepEqual(
  summary(
    [first, { ...renewal, currency: 'USD', price: 20 }],
    'member',
    '2026-11-22',
  ).fees,
  [
    { currency: 'PHP', amount: 100 },
    { currency: 'USD', amount: 20 },
  ],
)
assert.equal(
  summary(
    [
      { ...first, price: 0.1 },
      { ...renewal, price: 0.2 },
    ],
    'member',
    '2026-11-22',
  ).fees[0].amount,
  0.3,
)
assert.equal(summary([first], 'member', '2026-12-21'), null)
assert.equal(
  summary([first, gap], 'member', '2026-11-22', 'gap').startsOn,
  gap.starts_on,
)
assert.equal(days('2028-02-28', '2028-03-01'), 3)
assert.equal(days('2026-12-21', '2027-01-19'), 30)
assert.equal(days('', ''), 0)
assert.equal(days('2027-01-20', '2027-01-19'), 0)
console.log(
  'PASS renewal totals: added days and fees, repeated renewals, year/leap boundaries, cents precision, active/upcoming selection, gaps, cancellations, member isolation and separate currencies',
)
