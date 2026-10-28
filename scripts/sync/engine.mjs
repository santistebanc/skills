import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temporary, file);
}
export const readJSON = (file, fallback) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
export const exists = file => { try { fs.lstatSync(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };

export function treeHash(directory) {
  if (fs.lstatSync(directory).isSymbolicLink()) throw Error(`Linked installation needs manual review: ${directory}`);
  const hash = createHash('sha256');
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const name = prefix + entry.name;
      if (entry.isSymbolicLink()) throw Error(`Linked source or installation needs manual review: ${path.join(dir, entry.name)}`);
      if (entry.isDirectory()) { hash.update(`directory:${name}\0`); walk(path.join(dir, entry.name), name + '/'); }
      else if (entry.isFile()) { hash.update(`file:${name}\0`); hash.update(fs.readFileSync(path.join(dir, entry.name))); }
      else throw Error(`Unsupported file type: ${name}`);
    }
  }
  walk(directory);
  return hash.digest('hex');
}

export function discoverTargets(userHome, env = process.env) {
  const targets = [path.join(userHome, '.agents', 'skills'), path.join(env.CODEX_HOME || path.join(userHome, '.codex'), 'skills'), path.join(env.CLAUDE_CONFIG_DIR || path.join(userHome, '.claude'), 'skills')];
  for (const entry of fs.readdirSync(userHome, { withFileTypes: true })) {
    if (entry.isDirectory() && /^\.(codex|claude|cursor)(?:[-_].+)?$/.test(entry.name)) targets.push(path.join(userHome, entry.name, 'skills'));
  }
  return [...new Set(targets.map(p => path.resolve(p)))];
}

export function acquireLock(home) {
  fs.mkdirSync(home, { recursive: true });
  const file = path.join(home, 'sync.lock');
  const token = randomUUID();
  function create() { fs.writeFileSync(file, JSON.stringify({ pid: process.pid, token }), { flag: 'wx', mode: 0o600 }); }
  try { create(); } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const previous = readJSON(file);
    if (!Number.isInteger(previous?.pid) || previous.pid < 1) throw Error('Unrecognized lock; inspect sync.lock before removing it');
    try { process.kill(previous.pid, 0); throw Error('Another sync is running'); }
    catch (probe) { if (probe.code !== 'ESRCH') throw probe; }
    fs.unlinkSync(file);
    create();
  }
  return () => { if (readJSON(file, {})?.token === token) fs.unlinkSync(file); };
}

function safeChild(root, name) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw Error(`Invalid skill directory: ${name}`);
  const child = path.resolve(root, name);
  if (path.dirname(child) !== path.resolve(root)) throw Error('Skill path escaped target');
  return child;
}

export function deploy(home, repository, targets) {
  const file = path.join(home, 'deployments.json');
  const state = readJSON(file, { version: 1, entries: {}, pending: null });
  if (state.version !== 1 || !state.entries || typeof state.entries !== 'object') throw Error('Invalid deployment manifest');
  const save = () => writeJSON(file, state);
  function finish(operation) {
    if (operation.hash) state.entries[operation.destination] = { hash: operation.hash, target: operation.target, name: operation.name };
    else delete state.entries[operation.destination];
    state.pending = null;
    save();
  }
  // A journal closes the crash window between moving the old tree and installing the new one.
  if (state.pending) {
    const op = state.pending;
    if (safeChild(op.target, op.name) !== op.destination || !path.resolve(op.backup).startsWith(path.resolve(home, 'backups') + path.sep) || (op.stage && path.dirname(op.stage) !== path.resolve(op.target))) throw Error('Invalid deployment journal paths');
    if (exists(op.destination)) {
      const current = treeHash(op.destination);
      if (current === op.hash) finish(op);
      else if (current === state.entries[op.destination]?.hash && !exists(op.backup)) { state.pending = null; save(); }
      else throw Error(`Interrupted deployment needs review: ${op.destination}`);
    } else if (op.stage && exists(op.stage)) {
      if (treeHash(op.stage) !== op.hash) throw Error(`Interrupted stage changed; preserved for review: ${op.stage}`);
      fs.renameSync(op.stage, op.destination); finish(op);
    }
    else if (!op.hash && exists(op.backup)) finish(op);
    else if (exists(op.backup)) { fs.renameSync(op.backup, op.destination); state.pending = null; save(); }
    else throw Error(`Cannot recover interrupted deployment: ${op.destination}`);
  }
  const sourceRoot = path.join(repository, 'skills');
  const source = new Map();
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw Error(`Expected a real skill directory: ${entry.name}`);
    const dir = safeChild(sourceRoot, entry.name);
    if (!fs.existsSync(path.join(dir, 'SKILL.md'))) throw Error(`Missing SKILL.md: ${entry.name}`);
    const skillText = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8').replaceAll('\r', '');
    const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(skillText)?.[1];
    if (!frontmatter || !new RegExp(`^name: ${entry.name}$`, 'm').test(frontmatter) || !/^description:\s*\S/m.test(frontmatter)) throw Error(`Invalid skill entrypoint: ${entry.name}`);
    source.set(entry.name, { directory: dir, hash: treeHash(dir) });
  }
  const results = [];
  function replace(target, name, desired) {
    const destination = safeChild(target, name);
    const tracked = state.entries[destination];
    if (exists(destination)) {
      let current;
      try { current = treeHash(destination); }
      catch (e) { results.push({ destination, state: 'conflict', reason: e.message }); return; }
      if (desired && current === desired.hash) {
        state.entries[destination] = { target, name, hash: current }; save();
        results.push({ destination, state: tracked ? 'current' : 'adopted-identical' }); return;
      }
      if (!tracked || current !== tracked.hash) {
        results.push({ destination, state: 'conflict', reason: 'Existing unmanaged skill or locally edited managed skill; preserved' }); return;
      }
    }
    if (!desired && !exists(destination)) { delete state.entries[destination]; save(); return; }
    fs.mkdirSync(target, { recursive: true });
    const id = randomUUID();
    const backup = path.join(home, 'backups', id, name);
    const stage = desired ? path.join(target, `.t3-skills-${id}`) : null;
    if (desired) {
      fs.cpSync(desired.directory, stage, { recursive: true, errorOnExist: true });
      if (treeHash(stage) !== desired.hash) throw Error('Source changed while staging');
    }
    const operation = { target, name, destination, stage, backup, hash: desired?.hash || null };
    state.pending = operation; save();
    if (exists(destination)) { fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.renameSync(destination, backup); }
    if (stage) fs.renameSync(stage, destination);
    finish(operation);
    results.push({ destination, state: desired ? 'installed' : 'removed', backup: exists(backup) ? backup : null });
  }
  for (const target of targets.map(p => path.resolve(p))) {
    for (const [name, desired] of source) replace(target, name, desired);
    for (const entry of Object.values({ ...state.entries })) {
      if (entry.target === target && !source.has(entry.name)) replace(target, entry.name, null);
    }
  }
  return results;
}
