import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('./state.mjs', import.meta.url));

test('thread state survives reinitialization and rejects stale, invalid and cross-thread writes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'task-mode-test-'));
  const run = (command, id = 'test-thread', input) => spawnSync(process.execPath, [script, command, id], {
    env: { ...process.env, TASK_MODE_STATE_DIR: directory },
    input: input === undefined ? undefined : JSON.stringify(input), encoding: 'utf8',
  });
  const ok = result => { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };
  try {
    const initial = ok(run('init'));
    assert.equal(initial.enabled, false);
    const active = ok(run('save', 'test-thread', { ...initial, enabled: true, tasks: [{ key: 'a', state: 'running', taskId: 'delegate-1' }] }));
    assert.equal(active.revision, 1);
    assert.deepEqual(ok(run('init')), active);
    assert.deepEqual(ok(run('read')), active);
    assert.notEqual(run('save', 'test-thread', initial).status, 0);
    assert.notEqual(run('save', 'another-thread', active).status, 0);
    assert.notEqual(run('init', '../escape').status, 0);
    assert.notEqual(run('save', 'test-thread', { ...active, tasks: [{ key: 'a', state: 'imaginary' }] }).status, 0);
    assert.notEqual(run('save', 'test-thread', { ...active, tasks: [{ key: 'a', state: 'done' }, { key: 'a', state: 'queued' }] }).status, 0);
    assert.deepEqual(ok(run('read')), active);
    fs.writeFileSync(path.join(directory, 'test-thread.json.lock'), 'another writer');
    assert.notEqual(run('save', 'test-thread', active).status, 0);
    assert.deepEqual(ok(run('read')), active);
    fs.unlinkSync(path.join(directory, 'test-thread.json.lock'));
    const disabled = ok(run('save', 'test-thread', { ...active, enabled: false }));
    assert.equal(ok(run('init')).enabled, false);
    assert.equal(disabled.tasks[0].taskId, 'delegate-1');
    assert.equal(disabled.revision, 2);
    assert.deepEqual(fs.readdirSync(directory), ['test-thread.json']);
  } finally {
    // Test-owned directory from mkdtemp; no user/repository paths enter cleanup.
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
