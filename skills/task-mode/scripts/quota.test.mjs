import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessQuota } from './quota.mjs';

const now = 2000000000000;
const account = (id, session = 10, weekly = 10, extra = {}) => ({ instanceId: id, kind: 'fixture', email: `${id}@example.invalid`, enabled: true, authenticated: true,
  usage: { checkedAt: now - 1000, session: { usedPercent: session, resetsAt: now + 3600000 }, weekly: { usedPercent: weekly, resetsAt: now + 86400000 } }, ...extra });
const check = (rows, opts) => assessQuota(rows, 'current', { now, ...opts });

test('requests handoff before session or weekly exhaustion and accounts for the next operation', () => {
  assert.equal(check([account('current'), account('other')]).decision, 'continue');
  assert.equal(check([account('current', 80), account('other')]).decision, 'handoff');
  assert.equal(check([account('current', 10, 90), account('other')]).decision, 'handoff');
  assert.equal(check([account('current', 70), account('other')], { nextSessionCost: 12 }).decision, 'handoff');
});

test('excludes all aliases of a depleted or explicitly excluded account', () => {
  const current = account('current', 100);
  const alias = account('alias', 1, 1, { email: current.email });
  const excluded = account('excluded'), excludedAlias = account('excluded-alias', 1, 1, { email: excluded.email });
  const r = check([current, alias, excluded, excludedAlias, account('other')], { excluded: ['excluded'] });
  assert.deepEqual(r.sameAccountIds, ['current', 'alias']);
  assert.deepEqual(r.eligibleAccounts, ['other']);
});

test('stale, missing, errored and reset-past readings are unknown rather than invented headroom', () => {
  for (const usage of [null, { ...account('x').usage, checkedAt: now - 300001 }, { ...account('x').usage, error: 'unavailable' },
    { ...account('x').usage, session: { usedPercent: 100, resetsAt: now - 1 } },
    { ...account('x').usage, weekly: { usedPercent: '10' } }]) {
    assert.equal(check([account('current', 10, 10, { usage }), account('other')]).decision, 'unknown');
    assert.deepEqual(check([account('current', 100), account('other', 1, 1, { usage })]).eligibleAccounts, []);
  }
});

test('no headroom or login produces a bounded blocked result without fallback to the same account', () => {
  const r = check([account('current', 100), account('other', 1, 1, { authenticated: false }), account('third', 1, 95)]);
  assert.equal(r.decision, 'blocked');
  assert.deepEqual(r.eligibleAccounts, []);
});

test('emits no account emails, paths or credential metadata', () => {
  const r = check([account('current', 85, 10, { home: 'private-home', token: 'fixture-credential' }), account('other')]);
  const json = JSON.stringify(r);
  for (const sensitive of ['@example.invalid', 'private-home', 'fixture-credential']) assert(!json.includes(sensitive));
  assert.throws(() => check([], { sessionReserve: -1 }), /Invalid/);
});
