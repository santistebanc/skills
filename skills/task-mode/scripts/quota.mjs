#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Consumes airoute's account/usage array. Does not read credentials, call a provider,
// select a model, modify T3, or write private quota data into the skill folder.
export function assessQuota(accounts, currentId, options = {}) {
  const { now = Date.now(), maxAgeMs = 300000, sessionReserve = 20, weeklyReserve = 10,
    nextSessionCost = 0, nextWeeklyCost = 0, excluded = [] } = options;
  if (!Array.isArray(accounts) || typeof currentId !== 'string' || !currentId) throw Error('Expected account array and current instance ID');
  for (const [key, number] of Object.entries({ maxAgeMs, sessionReserve, weeklyReserve, nextSessionCost, nextWeeklyCost })) {
    if (!Number.isFinite(number) || number < 0 || (key !== 'maxAgeMs' && number > 100)) throw Error(`Invalid ${key}`);
  }
  if (!Array.isArray(excluded) || excluded.some(id => typeof id !== 'string')) throw Error('excluded must contain instance IDs');
  const group = a => a.quotaGroup || (a.email && a.kind
    ? createHash('sha256').update(`${a.kind}:${a.email.trim().toLowerCase()}`).digest('hex') : a.instanceId);
  const groups = new Map();
  for (const account of accounts) {
    if (!account || typeof account.instanceId !== 'string' || !account.instanceId) throw Error('Invalid account instance ID');
    const key = group(account);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(account);
  }
  const excludedGroups = new Set(accounts.filter(a => excluded.includes(a.instanceId)).map(group));
  function window(value) {
    if (!value || typeof value.usedPercent !== 'number' || !Number.isFinite(value.usedPercent) || value.usedPercent < 0 || value.usedPercent > 100) return null;
    const reset = typeof value.resetsAt === 'number' && Number.isFinite(value.resetsAt) ? value.resetsAt : null;
    // A reset in the past requires a new snapshot, not an assumption of free quota.
    if (reset !== null && reset <= now) return null;
    return { remaining: 100 - value.usedPercent, resetsAt: reset };
  }
  function usage(a) {
    const u = a.usage;
    if (!u || u.stale || u.error || typeof u.checkedAt !== 'number' || !Number.isFinite(u.checkedAt) || u.checkedAt > now + 30000 || now - u.checkedAt > maxAgeMs) return null;
    const session = window(u.session), weekly = window(u.weekly);
    return session && weekly ? { session, weekly, checkedAt: u.checkedAt } : null;
  }
  function normalized(a) {
    const peers = groups.get(group(a));
    const readings = peers.map(usage);
    // Conservative alias handling: a known shared account cannot borrow headroom
    // from an alias reporting stale data or a more optimistic reading.
    if (readings.some(r => r === null)) return { instanceId: a.instanceId, usable: false, reason: 'unknown-or-stale-usage' };
    const sessionRemaining = Math.min(...readings.map(r => r.session.remaining));
    const weeklyRemaining = Math.min(...readings.map(r => r.weekly.remaining));
    const reason = excludedGroups.has(group(a)) ? 'excluded-account'
      : !a.enabled || !a.authenticated ? 'disabled-or-unauthenticated'
      : sessionRemaining <= sessionReserve + nextSessionCost || weeklyRemaining <= weeklyReserve + nextWeeklyCost ? 'reserve-reached'
      : null;
    return { instanceId: a.instanceId, usable: reason === null, reason, sessionRemaining, weeklyRemaining,
      sessionResetsAt: readings.find(r => r.session.remaining === sessionRemaining).session.resetsAt,
      weeklyResetsAt: readings.find(r => r.weekly.remaining === weeklyRemaining).weekly.resetsAt,
      checkedAt: Math.min(...readings.map(r => r.checkedAt)) };
  }
  const currentAccount = accounts.find(a => a.instanceId === currentId);
  const assessments = accounts.map(normalized);
  const current = assessments.find(a => a.instanceId === currentId) || { instanceId: currentId, usable: false, reason: 'missing-account' };
  const sameAccountIds = currentAccount ? accounts.filter(a => group(a) === group(currentAccount)).map(a => a.instanceId) : [currentId];
  const eligibleAccounts = assessments.filter(a => a.usable && !sameAccountIds.includes(a.instanceId)).map(a => a.instanceId);
  const unknown = ['missing-account', 'unknown-or-stale-usage'].includes(current.reason);
  return { decision: unknown ? 'unknown' : current.usable ? 'continue' : eligibleAccounts.length ? 'handoff' : 'blocked',
    current, eligibleAccounts, sameAccountIds, accounts: assessments,
    policy: { sessionReserve, weeklyReserve, nextSessionCost, nextWeeklyCost, maxAgeMs }, checkedAt: now };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
      console.log('airoute status --json --live auto | node quota.mjs --current INSTANCE [--exclude ID,ID] [--session-reserve 20] [--weekly-reserve 10] [--next-session-cost PERCENT] [--next-weekly-cost PERCENT]\nReads JSON from stdin or --input PRIVATE_FILE. Reports a decision; performs no switch.');
    } else {
      const value = key => { const i = args.indexOf(`--${key}`); return i < 0 ? undefined : args[i + 1]; };
      const policy = {};
      for (const [flag, key] of [['session-reserve', 'sessionReserve'], ['weekly-reserve', 'weeklyReserve'], ['next-session-cost', 'nextSessionCost'], ['next-weekly-cost', 'nextWeeklyCost']]) {
        if (value(flag) !== undefined) policy[key] = Number(value(flag));
      }
      policy.excluded = value('exclude') ? value('exclude').split(',') : [];
      const accounts = JSON.parse(fs.readFileSync(value('input') || 0, 'utf8').replace(/^\uFEFF/, ''));
      console.log(JSON.stringify(assessQuota(accounts, value('current'), policy), null, 2));
    }
  } catch (error) { console.error(`Quota assessment: ${error.message}`); process.exitCode = 1; }
}
