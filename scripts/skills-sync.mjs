#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readJSON, writeJSON, discoverTargets, acquireLock, deploy, exists } from './sync/engine.mjs';
import { registerSchedule, removeSchedule } from './sync/scheduler.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'help';
const values = key => args.flatMap((value, i) => value === `--${key}` ? [args[i + 1]] : []);
const option = (key, fallback) => values(key).at(-1) ?? fallback;
const home = path.resolve(option('home', path.join(os.homedir(), '.t3-skills')));
const configFile = path.join(home, 'config.json');
const output = value => console.log(JSON.stringify(value, null, 2));
function exec(exe, argv, cwd) {
  const result = spawnSync(exe, argv, { cwd, encoding: 'utf8', windowsHide: true, timeout: 120000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (result.status !== 0) throw Error(result.error?.message || result.stderr || result.stdout || `${exe} failed`);
  return result.stdout.trim();
}
function executable(name) {
  const candidates = (process.env.PATH || '').split(path.delimiter).flatMap(dir => process.platform === 'win32' ? ['.exe', '.cmd', ''].map(ext => path.join(dir, name + ext)) : [path.join(dir, name)]);
  const found = candidates.find(file => { try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile(); } catch { return false; } });
  if (!found) throw Error(`${name} is required on PATH`);
  return found;
}
const config = () => {
  const value = readJSON(configFile);
  if (value?.version !== 1) throw Error(`Run install first; missing/unsupported config at ${configFile}`);
  return value;
};
function targets(c) { return [...new Set([...(c.discover ? [...discoverTargets(c.userHome), ...(c.environmentTargets || [])] : []), ...c.targets].map(p => path.resolve(p)))]; }

try {
  if (command === 'help' || command === '--help') {
    console.log(`Personal skills sync (Node 20+, Git; no packages or manager service)
  install [--no-schedule] [--interval 5] [--target ABSOLUTE_SKILLS_DIRECTORY]...
          [--no-discover] [--remote GIT_URL] [--branch main] [--scheduler auto|cron]
  sync                 Fetch main and deploy updates; preserve conflicts
  status               Show local configuration and last sync evidence
  target --add PATH    Register an extra account/agent skills directory
  unschedule           Stop automatic sync; keep installations and private state
All commands accept --home PRIVATE_DIRECTORY (default ~/.t3-skills).
Default discovery: ~/.agents/skills, Codex/Claude homes and detected account homes,
plus an existing Cursor home. Config, status and backups stay in the private home.
Use a clean dedicated checkout for sync; edit/push from a separate authoring clone.`);
  } else if (command === 'install') {
    const release = acquireLock(home);
    let c;
    try {
      c = readJSON(configFile, null);
      const interval = Number(option('interval', c?.interval || 5));
      if (!Number.isInteger(interval) || interval < 1 || interval > 60) throw Error('Interval must be 1–60 minutes');
      const remote = option('remote', c?.remote || 'https://github.com/santistebanc/skills.git');
      // Credentials belong in Git's credential store/SSH agent, never in configuration URLs.
      if (/^https?:\/\/[^/]*@/i.test(remote) || /[\r\n]/.test(remote)) throw Error('Use a credential-free Git URL');
      const branch = option('branch', c?.branch || 'main');
      if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(branch)) throw Error('Invalid branch');
      if (c && (c.remote !== remote || c.branch !== branch)) throw Error('Use a separate --home when changing the remote or branch of an existing installation');
      if (values('target').some(p => !p || !path.isAbsolute(p))) throw Error('--target requires an absolute skills-directory path');
      const repository = path.join(home, 'repository');
      const git = executable('git');
      if (!exists(repository)) exec(git, ['-c', 'core.autocrlf=false', 'clone', '--quiet', '--single-branch', '--branch', branch, '--', remote, repository]);
      if (exec(git, ['remote', 'get-url', 'origin'], repository) !== remote) throw Error('Existing managed checkout has a different remote');
      exec(git, ['config', 'core.autocrlf', 'false'], repository);
      c = { version: 1, userHome: c?.userHome || os.homedir(), repository, remote, branch, git, node: process.execPath, interval,
        discover: args.includes('--no-discover') ? false : (c?.discover ?? true), targets: [...new Set([...(c?.targets || []), ...values('target').map(p => path.resolve(p))])],
        environmentTargets: [...new Set([...(c?.environmentTargets || []), ...[process.env.CODEX_HOME, process.env.CLAUDE_CONFIG_DIR].filter(Boolean).map(p => path.resolve(p, 'skills'))])],
        windowsUser: process.platform === 'win32' ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}` : undefined, schedule: c?.schedule || null };
      writeJSON(configFile, c);
      fs.copyFileSync(fileURLToPath(new URL('./skills-runner.mjs', import.meta.url)), path.join(home, 'runner.mjs'));
    } finally { release(); }
    output({ installed: home, targets: targets(c) });
    const initial = spawnSync(process.execPath, [path.join(home, 'runner.mjs'), '--home', home], { encoding: 'utf8', windowsHide: true, timeout: 240000 });
    if (initial.stdout) process.stdout.write(initial.stdout);
    if (initial.stderr) process.stderr.write(initial.stderr);
    if (!args.includes('--no-schedule')) {
      c.schedule = registerSchedule(home, c, option('scheduler', 'auto'));
      writeJSON(configFile, c);
      output({ schedule: c.schedule, intervalMinutes: c.interval });
    }
    if (initial.status !== 0) throw Error(initial.error?.message || 'Initial sync reported an error; scheduling is configured, inspect status for preserved conflicts');
  } else if (command === 'sync') {
    config();
    process.stdout.write(exec(process.execPath, [path.join(home, 'runner.mjs'), '--home', home]) + '\n');
  } else if (command === '_apply') {
    const lock = readJSON(path.join(home, 'sync.lock'), {});
    if (!process.env.T3_SKILLS_LOCK_TOKEN || process.env.T3_SKILLS_LOCK_TOKEN !== lock.token) throw Error('Deployment must run through the locked updater');
    const c = config();
    const results = deploy(home, c.repository, targets(c));
    const offline = args.includes('--offline');
    const previous = readJSON(path.join(home, 'status.json'), {});
    const status = { at: new Date().toISOString(), offline, commit: exec(c.git, ['rev-parse', 'HEAD'], c.repository),
      lastOnlineSyncAt: offline ? previous.lastOnlineSyncAt || null : new Date().toISOString(), results };
    writeJSON(path.join(home, 'status.json'), status);
    if (exists(path.join(home, 'last-error.json'))) fs.unlinkSync(path.join(home, 'last-error.json'));
    output(status);
    if (results.some(r => r.state === 'conflict')) process.exitCode = 2;
  } else if (command === 'status') {
    const c = config();
    output({ home, remote: c.remote, branch: c.branch, intervalMinutes: c.interval, schedule: c.schedule, targets: targets(c),
      lastSync: readJSON(path.join(home, 'status.json'), null), lastError: readJSON(path.join(home, 'last-error.json'), null) });
  } else if (command === 'target') {
    const release = acquireLock(home);
    try {
      const c = config(), add = option('add');
      if (!add || !path.isAbsolute(add)) throw Error('Use target --add ABSOLUTE_SKILLS_DIRECTORY');
      c.targets = [...new Set([...c.targets, path.resolve(add)])]; writeJSON(configFile, c); output({ targets: targets(c) });
    } finally { release(); }
  } else if (command === 'unschedule') {
    const c = config(); removeSchedule(home, c); c.schedule = null; writeJSON(configFile, c); output({ unscheduled: true });
  } else throw Error(`Unknown command: ${command}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
