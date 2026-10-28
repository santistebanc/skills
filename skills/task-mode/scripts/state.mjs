#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const states = new Set([
  'queued', 'dispatching', 'running', 'verifying', 'blocked', 'ready',
  'integrating', 'integration_failed', 'integrated', 'cleanup_pending',
  'done', 'failed', 'cancelled', 'superseded',
]);

function validate(value, threadId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected a state object');
  if (value.schemaVersion !== 1 || value.threadId !== threadId) throw Error('Schema or thread identity mismatch');
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw Error('Invalid revision');
  if (typeof value.enabled !== 'boolean') throw Error('enabled must be boolean');
  if (value.paused !== undefined && typeof value.paused !== 'boolean') throw Error('paused must be boolean');
  if (!Array.isArray(value.tasks)) throw Error('tasks must be an array');
  const keys = new Set();
  for (const task of value.tasks) {
    if (!task || typeof task.key !== 'string' || !task.key || keys.has(task.key)) throw Error('Task keys must be unique nonempty strings');
    keys.add(task.key);
    if (!states.has(task.state)) throw Error(`Invalid task state: ${task.state}`);
  }
  return value;
}

function main() {
  const [command, threadId, ...extra] = process.argv.slice(2);
  if (!['init', 'read', 'save'].includes(command) || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(threadId ?? '') || extra.length) {
    throw Error('Usage: node state.mjs init|read|save THREAD_ID (save reads complete JSON from stdin)');
  }
  const directory = path.resolve(process.env.TASK_MODE_STATE_DIR || path.join(os.homedir(), '.t3', 'task-mode'));
  const file = path.join(directory, `${threadId}.json`);
  const read = () => validate(JSON.parse(fs.readFileSync(file, 'utf8')), threadId);
  if (command === 'read') {
    process.stdout.write(JSON.stringify(read(), null, 2) + '\n');
    return;
  }
  // Validate input before acquiring a lock or touching the existing state.
  const input = command === 'save' ? validate(JSON.parse(fs.readFileSync(0, 'utf8')), threadId) : null;
  fs.mkdirSync(directory, { recursive: true });
  const lock = `${file}.lock`;
  let descriptor;
  try {
    descriptor = fs.openSync(lock, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') throw Error(`State locked: ${lock}. Retry after the writer finishes; inspect a persistent lock before removing it.`);
    throw error;
  }
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    if (command === 'init' && fs.existsSync(file)) {
      process.stdout.write(JSON.stringify(read(), null, 2) + '\n');
      return;
    }
    let value;
    if (command === 'init') {
      value = {
        schemaVersion: 1, threadId, revision: 0, enabled: false, paused: false,
        repository: null, checkout: null, targetBranch: null, baseSha: null,
        intent: '', tasks: [],
      };
    } else {
      const current = read();
      if (input.revision !== current.revision) throw Error(`Stale revision: expected ${current.revision}, received ${input.revision}. Reread and reconcile.`);
      value = { ...input, revision: current.revision + 1 };
    }
    value.updatedAt = new Date().toISOString();
    const output = JSON.stringify(value, null, 2) + '\n';
    const tempDescriptor = fs.openSync(temporary, 'wx');
    try {
      fs.writeFileSync(tempDescriptor, output);
      fs.fsyncSync(tempDescriptor);
    } finally {
      fs.closeSync(tempDescriptor);
    }
    fs.renameSync(temporary, file);
    process.stdout.write(output);
  } finally {
    fs.rmSync(temporary, { force: true });
    fs.closeSync(descriptor);
    fs.unlinkSync(lock);
  }
}

try { main(); } catch (error) {
  process.stderr.write(`task-mode state: ${error.message}\n`);
  process.exitCode = 1;
}
