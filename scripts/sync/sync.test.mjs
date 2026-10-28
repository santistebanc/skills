import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deploy, treeHash, writeJSON, readJSON, discoverTargets, acquireLock } from './engine.mjs';
import { scheduleFiles } from './scheduler.mjs';

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owned-skills-test-'));
  try { return run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function skill(root, name, text = 'version one') {
  const dir = path.join(root, name); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: Example\n---\n${text}\n`);
  return dir;
}
test('installs, updates, discovers new skills, preserves local edits and backs up upstream removals', () => fixture(root => {
  const repo = path.join(root, 'repo'), home = path.join(root, 'private'), target = path.join(root, 'agent', 'skills');
  const first = skill(path.join(repo, 'skills'), 'first');
  const unrelated = skill(target, 'unrelated');
  let results = deploy(home, repo, [target]);
  assert.equal(results[0].state, 'installed');
  assert.equal(treeHash(first), treeHash(path.join(target, 'first')));
  assert.equal(deploy(home, repo, [target])[0].state, 'current');
  skill(path.join(repo, 'skills'), 'first', 'version two');
  results = deploy(home, repo, [target]);
  assert.equal(results[0].state, 'installed');
  assert(fs.existsSync(path.join(results[0].backup, 'SKILL.md')));
  fs.appendFileSync(path.join(target, 'first', 'SKILL.md'), 'local work');
  skill(path.join(repo, 'skills'), 'first', 'version three');
  assert.equal(deploy(home, repo, [target])[0].state, 'conflict');
  assert(fs.readFileSync(path.join(target, 'first', 'SKILL.md'), 'utf8').includes('local work'));
  skill(path.join(repo, 'skills'), 'second');
  assert(deploy(home, repo, [target]).some(r => r.destination.endsWith('second') && r.state === 'installed'));
  fs.rmSync(path.join(repo, 'skills', 'second'), { recursive: true });
  results = deploy(home, repo, [target]);
  assert(results.some(r => r.state === 'removed'));
  assert(!fs.existsSync(path.join(target, 'second')));
  assert(fs.existsSync(unrelated));
}));

test('adopts identical copies but preserves differing unmanaged installs and links', () => fixture(root => {
  const repo = path.join(root, 'repo'), home = path.join(root, 'private'), target = path.join(root, 'skills');
  const source = skill(path.join(repo, 'skills'), 'first');
  skill(target, 'first');
  assert.equal(deploy(home, repo, [target])[0].state, 'adopted-identical');
  skill(path.join(repo, 'skills'), 'other'); skill(target, 'other', 'different');
  assert(deploy(home, repo, [target]).some(r => r.state === 'conflict'));
  skill(path.join(repo, 'skills'), 'linked');
  fs.symlinkSync(source, path.join(target, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert(deploy(home, repo, [target]).some(r => r.destination.endsWith('linked') && r.state === 'conflict'));
  assert.equal(fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8').includes('version one'), true);
}));

test('recovers a crash after the old deployment moves aside', () => fixture(root => {
  const repo = path.join(root, 'repo'), home = path.join(root, 'private'), target = path.join(root, 'skills');
  skill(path.join(repo, 'skills'), 'first'); deploy(home, repo, [target]);
  const destination = path.join(target, 'first');
  const state = readJSON(path.join(home, 'deployments.json'));
  const source = skill(path.join(repo, 'skills'), 'first', 'after crash');
  const stage = path.join(target, '.staged'), backup = path.join(home, 'backups', 'crash', 'first');
  fs.cpSync(source, stage, { recursive: true }); fs.mkdirSync(path.dirname(backup), { recursive: true });
  state.pending = { target, name: 'first', destination, stage, backup, hash: treeHash(stage) };
  writeJSON(path.join(home, 'deployments.json'), state);
  fs.renameSync(destination, backup);
  deploy(home, repo, [target]);
  assert.equal(treeHash(destination), treeHash(source));
  assert.equal(readJSON(path.join(home, 'deployments.json')).pending, null);
}));

test('discovers account homes and enforces a single updater', () => fixture(root => {
  for (const name of ['.claude_mush', '.codex-work', '.cursor', '.unrelated']) fs.mkdirSync(path.join(root, name));
  const targets = discoverTargets(root, {});
  assert(targets.includes(path.join(root, '.claude_mush', 'skills')));
  assert(!targets.includes(path.join(root, '.unrelated', 'skills')));
  const release = acquireLock(root);
  assert.throws(() => acquireLock(root), /Another sync/);
  release();
  acquireLock(root)();
}));

test('generates native schedules with quoted paths and a private identity', () => {
  const c = { node: '/path with spaces/node', interval: 5, windowsUser: 'DOMAIN\\user' };
  const win = scheduleFiles('/private skills', c, 'win32');
  assert.match(win.files[1][1], /<Interval>PT5M<\/Interval>/);
  assert.match(win.files[0][1], /, 0, True/);
  const mac = scheduleFiles('/private skills', c, 'darwin', '/user');
  assert.match(mac.files[0][1], /<integer>300<\/integer>/);
  const linux = scheduleFiles('/private skills', c, 'linux', '/user');
  assert.match(linux.files[0][1], /ExecStart="\/path with spaces\/node"/);
  assert.match(linux.files[1][1], /OnUnitActiveSec=5min/);
});

test('installer and updater work end to end against a local remote, including offline fallback', () => fixture(root => {
  const author = path.join(root, 'author'), remote = path.join(root, 'remote.git'), home = path.join(root, 'private'), target = path.join(root, 'agent skills');
  const project = fileURLToPath(new URL('../../', import.meta.url));
  const run = (exe, argv, cwd) => {
    const r = spawnSync(exe, argv, { cwd, encoding: 'utf8', timeout: 30000 });
    assert.equal(r.status, 0, `${exe} ${argv.join(' ')}: ${r.stderr || r.stdout}`); return r.stdout;
  };
  fs.mkdirSync(author);
  fs.cpSync(path.join(project, 'scripts'), path.join(author, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(author, 'package.json'), '{"type":"module"}');
  skill(path.join(author, 'skills'), 'example');
  run('git', ['init', '-b', 'main', author]);
  run('git', ['config', 'user.name', 'Fixture'], author); run('git', ['config', 'user.email', 'fixture@example.invalid'], author);
  run('git', ['add', '.'], author); run('git', ['commit', '-m', 'initial'], author);
  run('git', ['clone', '--bare', author, remote]);
  const cli = path.join(author, 'scripts', 'skills-sync.mjs');
  run(process.execPath, [cli, 'install', '--home', home, '--remote', remote, '--target', target, '--no-discover', '--no-schedule']);
  assert(fs.existsSync(path.join(target, 'example', 'SKILL.md')));
  skill(path.join(author, 'skills'), 'new-skill');
  run('git', ['add', '.'], author); run('git', ['commit', '-m', 'new skill'], author); run('git', ['push', remote, 'main'], author);
  run(process.execPath, [cli, 'sync', '--home', home]);
  assert(fs.existsSync(path.join(target, 'new-skill', 'SKILL.md')));
  const online = readJSON(path.join(home, 'status.json')).lastOnlineSyncAt;
  fs.renameSync(remote, remote + '.offline');
  run(process.execPath, [cli, 'sync', '--home', home]);
  const offline = readJSON(path.join(home, 'status.json'));
  assert.equal(offline.offline, true); assert.equal(offline.lastOnlineSyncAt, online);
  assert(fs.existsSync(path.join(target, 'example', 'SKILL.md')));
}));
