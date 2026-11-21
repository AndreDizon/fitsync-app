import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
try {
  const [admin, staff, member, other] = [1, 2, 3, 4].map(
    (n) => `${n}1111111-1111-4111-8111-111111111111`,
  )
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;`,
  )
  for (const id of [admin, staff, member, other])
    await db.query('insert into auth.users values($1,$2)', [
      id,
      JSON.stringify({ username: 'Member ' + id[0], fitsync_onboarding: {} }),
    ])
  for (const file of [
    '20261107_plan_playlists.sql',
    '20261108_playlist_schedule.sql',
    '20261121_gym_groups.sql',
    '20261121_gym_groups_community.sql',
    '20261121_gym_groups_time_zone.sql',
    '20261121_gym_groups_v4.sql',
    '20261121_gym_groups_v5_income.sql',
    '20261121_gym_groups_v6_checkins.sql',
    '20261121_gym_groups_v7_checkin_confirmation.sql',
    '20261121_gym_groups_v8_history_filters.sql',
    '20261121_gym_groups_v9_settings.sql',
    '20261121_gym_groups_v10_admin_workspace.sql',
    '20261121_gym_groups_v10_admin_workspace.sql',
    '20261121_gym_groups_v11_settings_cards.sql',
    '20261121_gym_groups_v11_settings_cards.sql',
  ])
    await db.exec(await readFile('backend/migrations/' + file, 'utf8'))
  const call = (uid, action, doc = {}) =>
    db.transaction(async (tx) => {
      await tx.exec('set local role authenticated')
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        uid,
      ])
      return (
        await tx.query(
          ['rename_gym', 'save_gym_guidance', 'transfer_leave'].includes(action)
            ? 'select public.gym_group_action_v11($1,$2::jsonb) value'
            : 'select public.gym_group_action_v10($1,$2::jsonb) value',
          [action, JSON.stringify(doc)],
        )
      ).rows[0].value
    })
  const gym = await call(admin, 'create', {
    name: 'Admin workspace',
    timeZone: 'Asia/Manila',
  })
  await call(member, 'join', { gymId: gym.gym.id })
  await call(staff, 'join', { gymId: gym.gym.id })
  await call(admin, 'role', { userId: staff, role: 'staff' })

  const config = {
    name: 'Admin workspace',
    welcomeMessage: 'Welcome',
    rules: 'Be kind',
    joinMode: 'closed',
    timeZone: 'Asia/Manila',
  }
  assert.equal(
    (await call(admin, 'admin_settings', config)).gym.join_mode,
    'closed',
  )
  await assert.rejects(
    call(other, 'join', { gymId: gym.gym.id }),
    /closed|invite/i,
  )
  await assert.rejects(
    call(other, 'join', { code: gym.gym.join_code }),
    /closed/i,
  )
  await call(admin, 'admin_settings', { ...config, joinMode: 'open' })
  for (const who of [staff, member, other])
    for (const action of [
      'admin_data',
      'admin_report',
      'pay_member',
      'delete_plan',
      'session_registrations',
    ])
      await assert.rejects(call(who, action), /Only the gym admin/)
  const checked = await call(member, 'check_in')
  const today = checked.today
  assert.equal(
    (await call(member, 'check_in')).checkedInAt,
    checked.checkedInAt,
  )
  await assert.rejects(call(admin, 'check_in'), /cannot check in/)
  await assert.rejects(
    call(staff, 'check_out', { visitDate: today }),
    /not found/,
  )
  let report = await call(admin, 'admin_report', { kind: 'visits' })
  assert.equal(report.total, 1)
  assert.equal(report.entries[0].checked_out_at, null)
  await call(admin, 'confirm_checkin', {
    userId: member,
    checkedOn: today,
    scope: 'gym',
  })
  let out = await call(member, 'check_out', { visitDate: today })
  assert(out.checkedOutAt)
  assert.equal(out.openVisit, null)
  assert.equal(
    (await call(member, 'check_out', { visitDate: today })).checkedOutAt,
    out.checkedOutAt,
  )
  assert.equal(
    (await call(admin, 'admin_report', { kind: 'visits', userId: staff }))
      .total,
    0,
  )
  await db.query(
    "insert into public.gym_daily_checkins(gym_id,user_id,checked_on,checked_at,time_zone,checked_out_at) select $1,$2,($3::date-n),now()-n*interval '1 day','Asia/Manila',now()-n*interval '1 day' from generate_series(1,25)n",
    [gym.gym.id, member, today],
  )
  const old = (
    await db.query("select to_char($1::date-25,'YYYY-MM-DD') d", [today])
  ).rows[0].d
  assert.equal(
    (await call(admin, 'admin_report', { kind: 'visits', from: old, to: old }))
      .total,
    1,
  )
  assert.equal(
    (await call(admin, 'admin_report', { kind: 'visits', page: 2 })).entries
      .length,
    6,
  )
  await assert.rejects(
    call(admin, 'admin_report', { kind: 'visits', from: today, to: old }),
    /From date/,
  )
  await call(admin, 'save_plan', {
    name: 'Monthly training',
    description: 'Standard',
    durationDays: 30,
    price: '100',
    currency: 'PHP',
  })
  let snapshot = await call(admin, 'admin_data'),
    plan = snapshot.plans[0]
  assert(plan.created_at)
  const plus = (
    await db.query(
      "select to_char($1::date+29,'YYYY-MM-DD') a,to_char($1::date+30,'YYYY-MM-DD') b,to_char($1::date+59,'YYYY-MM-DD') c",
      [today],
    )
  ).rows[0]
  await call(admin, 'edit_member_plan', {
    userId: member,
    planId: plan.id,
    startsOn: today,
    endsOn: plus.a,
  })
  snapshot = await call(admin, 'admin_data')
  let period = snapshot.balances[0]
  assert.equal(Number(period.outstanding), 100)
  await call(admin, 'edit_member_plan', {
    userId: member,
    planId: plan.id,
    startsOn: plus.b,
    endsOn: plus.c,
  })
  await assert.rejects(
    call(admin, 'edit_member_plan', {
      userId: member,
      planId: plan.id,
      startsOn: today,
      endsOn: plus.a,
    }),
    /overlap/,
  )
  const payment = {
    userId: member,
    currency: 'PHP',
    amount: '150',
    receivedOn: today,
    method: 'cash',
    notes: 'Received',
    requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  }
  await assert.rejects(
    call(admin, 'pay_member', { ...payment, amount: '201' }),
    /outstanding/,
  )
  await call(admin, 'pay_member', payment)
  await call(admin, 'pay_member', payment)
  snapshot = await call(admin, 'admin_data')
  assert.equal(
    snapshot.balances.reduce((n, p) => n + Number(p.outstanding), 0),
    50,
  )
  assert.equal(
    (await call(admin, 'admin_report', { kind: 'payments' })).total,
    2,
  )
  await assert.rejects(
    call(admin, 'pay_member', { ...payment, amount: '10' }),
    /already used/,
  )
  await call(admin, 'save_plan', {
    name: 'Cheaper training',
    description: '',
    durationDays: 30,
    price: '20',
    currency: 'PHP',
  })
  snapshot = await call(admin, 'admin_data')
  const cheap = snapshot.plans.find((p) => p.name === 'Cheaper training')
  await assert.rejects(
    call(admin, 'edit_member_plan', {
      id: period.id,
      userId: member,
      planId: cheap.id,
      startsOn: today,
      endsOn: plus.a,
    }),
    /lower than money/,
  )
  await call(admin, 'delete_plan', { id: plan.id })
  snapshot = await call(admin, 'admin_data')
  assert(snapshot.balances.every((p) => p.plan_name === 'Monthly training'))
  assert(snapshot.balances.every((p) => p.plan_id === null))
  const event = {
    requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    title: 'Train together',
    body: 'Meet in the gym',
    pinned: true,
    startsLocal: plus.b + 'T10:00',
    endsLocal: plus.b + 'T11:00',
    timeZone: 'Asia/Manila',
    capacity: 1,
  }
  await call(admin, 'post_event', event)
  await call(admin, 'post_event', event)
  snapshot = await call(admin, 'admin_data')
  assert.equal(snapshot.announcements.length, 1)
  assert.equal(snapshot.announcements[0].session_id, event.requestId)
  assert.equal(snapshot.announcements[0].username, 'Member 1')
  await call(member, 'rsvp', { id: event.requestId })
  await assert.rejects(call(staff, 'rsvp', { id: event.requestId }), /full/)
  await assert.rejects(
    call(other, 'rsvp', { id: event.requestId }),
    /Join a gym/,
  )
  const registered = await call(admin, 'session_registrations', {
    id: event.requestId,
  })
  assert.equal(registered.entries.length, 1)
  assert(registered.entries[0].registered_at)
  await assert.rejects(
    db.exec('set role authenticated;select * from public.gym_payment_batches'),
    /permission denied/,
  )
  await db.exec('reset role')
  await db.query(
    "update auth.users set raw_user_meta_data=raw_user_meta_data-'fitsync_onboarding' where id=$1",
    [member],
  )
  assert.equal(
    (await db.query('select count(*)::int n from public.gym_payment_batches'))
      .rows[0].n,
    0,
  )

  // Independent cards preserve the other card's stored values and reject nonowners.
  for (const who of [staff, member, other])
    for (const action of ['rename_gym', 'save_gym_guidance', 'transfer_leave'])
      await assert.rejects(call(who, action, {}), /Only the gym admin/)
  const renamed = await call(admin, 'rename_gym', {
    name: 'Renamed gym',
    welcomeMessage: 'Do not save this draft',
    joinMode: 'closed',
  })
  assert.equal(renamed.gym.name, 'Renamed gym')
  assert.equal(renamed.gym.welcome_message, 'Welcome')
  assert.equal(renamed.gym.join_mode, 'open')
  const guidance = await call(admin, 'save_gym_guidance', {
    name: 'Do not save draft name',
    welcomeMessage: 'Welcome back',
    rules: 'Be respectful',
    timeZone: 'UTC',
    joinMode: 'closed',
  })
  assert.equal(guidance.gym.name, 'Renamed gym')
  assert.equal(guidance.gym.welcome_message, 'Welcome back')
  assert.equal(guidance.gym.join_mode, 'closed')
  assert.equal(guidance.gym.time_zone, 'UTC')
  await assert.rejects(
    call(admin, 'transfer_leave', { userId: other }),
    /not found|not a member|member/i,
  )
  assert.equal(
    (await call(admin, 'mine')).role,
    'admin',
    'Failed transfer leaves ownership intact',
  )
  await assert.rejects(
    call(admin, 'transfer_leave', { userId: admin }),
    /admin|removed|demoted/i,
  )
  const beforeCount = (await call(admin, 'mine')).members.length
  const left = await call(admin, 'transfer_leave', { userId: staff })
  assert.equal(left.gym, null)
  const newOwner = await call(staff, 'mine')
  assert.equal(newOwner.role, 'admin')
  assert.equal(newOwner.gym.owner_id, staff)
  assert.equal(newOwner.members.length, beforeCount - 1)
  assert(!newOwner.members.some((m) => m.user_id === admin))
  await assert.rejects(
    call(admin, 'rename_gym', { name: 'Forbidden rename' }),
    /Only the gym admin/,
  )
  console.log(
    'PASS admin workspace: rerunnable migration, closed joins, owner-only actions, checkout ownership and retries, date filtering before paging, plan snapshots, overlap and paid-price limits, atomic partial payments and retry deduplication, event capacity/preregistration, RLS and reset cleanup',
  )
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
} finally {
  await db.close()
}
