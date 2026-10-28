// Stable entry point installed outside the repo; the fetched repo supplies current deployment code.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const i = process.argv.indexOf('--home');
const home = path.resolve(i < 0 ? path.join(os.homedir(), '.t3-skills') : process.argv[i + 1]);
const config = JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8'));
const git = (...args) => {
  const result = spawnSync(config.git, args, { cwd: config.repository, encoding: 'utf8', windowsHide: true, timeout: 90000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (result.status !== 0) throw Error(result.error?.message || result.stderr.trim() || `Git exited ${result.status}`);
  return result.stdout.trim();
};
const lock = path.join(home, 'sync.lock');
let owned = false;
try {
  // Only one updater may move the repository or deployments at a time.
  if (fs.existsSync(lock)) {
    const previous = JSON.parse(fs.readFileSync(lock, 'utf8'));
    if (!Number.isInteger(previous.pid) || previous.pid < 1) throw Error('Invalid sync lock');
    try { process.kill(previous.pid, 0); throw Error('Another sync is running'); }
    catch (e) { if (e.code !== 'ESRCH') throw e; }
    fs.unlinkSync(lock);
  }
  const token = randomUUID();
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, token }), { flag: 'wx', mode: 0o600 }); owned = true;
  if (git('remote', 'get-url', 'origin') !== config.remote) throw Error('Repository remote differs from private configuration');
  if (git('symbolic-ref', '--short', 'HEAD') !== config.branch) throw Error('Managed checkout is on an unexpected branch; preserved for review');
  if (git('status', '--porcelain')) throw Error('Managed checkout has local edits; sync stopped to preserve them');
  let offline = false;
  try { git('fetch', '--quiet', 'origin', config.branch); }
  catch { offline = true; }
  if (!offline) git('merge', '--ff-only', '--no-edit', `origin/${config.branch}`);
  const result = spawnSync(process.execPath, [path.join(config.repository, 'scripts', 'skills-sync.mjs'), '_apply', '--home', home, ...(offline ? ['--offline'] : [])], {
    encoding: 'utf8', windowsHide: true, timeout: 90000, env: { ...process.env, T3_SKILLS_LOCK_TOKEN: token },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw Error(result.error?.message || `Deployment exited ${result.status}`);
  // The next run also uses the latest updater, after a successful deployment.
  const next = `${path.join(home, 'runner.mjs')}.${randomUUID()}.tmp`;
  fs.copyFileSync(path.join(config.repository, 'scripts', 'skills-runner.mjs'), next);
  fs.renameSync(next, path.join(home, 'runner.mjs'));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  fs.writeFileSync(path.join(home, 'last-error.json'), JSON.stringify({ at: new Date().toISOString(), message: error.message }, null, 2), { mode: 0o600 });
  process.exitCode = 1;
} finally {
  if (owned) fs.unlinkSync(lock);
}
