import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerMcp, validServers, agentHomes } from './mcp.mjs';

const URL1 = 'https://tasks.example.ts.net:7443/mcp';
function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owned-mcp-test-'));
  try { return run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const env = {};

test('registers in every Claude and Codex home, idempotently, preserving other settings', () => fixture(home => {
  write(path.join(home, '.claude.json'), JSON.stringify({ theme: 'dark', mcpServers: { other: { type: 'stdio', command: 'x' } } }));
  fs.mkdirSync(path.join(home, '.claude'));
  write(path.join(home, '.claude_work', '.claude.json'), '{"projects":{}}');
  write(path.join(home, '.codex', 'config.toml'), 'model = "x"\r\n\r\n[mcp_servers.jobfeed]\r\ncommand = "a"\r\n');
  write(path.join(home, '.codex_alt', 'auth.json'), '{}');
  fs.mkdirSync(path.join(home, '.codex-staging-cleanup'));  // not an account
  fs.mkdirSync(path.join(home, '.claude_fresh'));  // never launched: no config yet
  const first = registerMcp(home, { tasks: { url: URL1 } }, env);
  assert.deepEqual(first.map(r => [path.relative(home, r.file), r.state]).sort(), [
    ['.claude.json', 'registered'], [path.join('.claude_work', '.claude.json'), 'registered'],
    [path.join('.codex', 'config.toml'), 'registered'], [path.join('.codex_alt', 'config.toml'), 'registered']].sort());
  const claude = JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'));
  assert.equal(claude.theme, 'dark');
  assert.deepEqual(claude.mcpServers, { other: { type: 'stdio', command: 'x' }, tasks: { type: 'http', url: URL1 } });
  const toml = fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8');
  assert.match(toml, /\[mcp_servers\.jobfeed\]\r\ncommand = "a"\r\n\r\n\[mcp_servers\.tasks\]\r\nurl = "https:\/\/tasks\.example\.ts\.net:7443\/mcp"\r\n$/);
  assert.ok(registerMcp(home, { tasks: { url: URL1 } }, env).every(r => r.state === 'current'));
  assert.equal(fs.existsSync(path.join(home, '.codex-staging-cleanup', 'config.toml')), false);
}));

test('updates a changed url in place and keeps extra keys', () => fixture(home => {
  write(path.join(home, '.codex', 'config.toml'), '[mcp_servers.tasks]\nurl = "https://old.example/mcp"\nstartup_timeout_sec = 30\n\n[other]\na = 1\n');
  assert.equal(registerMcp(home, { tasks: { url: URL1 } }, env)[0].state, 'registered');
  assert.equal(fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8'),
    `[mcp_servers.tasks]\nurl = "${URL1}"\nstartup_timeout_sec = 30\n\n[other]\na = 1\n`);
}));

test('never rewrites an unparseable config', () => fixture(home => {
  write(path.join(home, '.claude.json'), '{broken');
  fs.mkdirSync(path.join(home, '.claude'));
  const [r] = registerMcp(home, { tasks: { url: URL1 } }, env);
  assert.equal(r.state, 'error');
  assert.equal(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'), '{broken');
}));

test('honours CLAUDE_CONFIG_DIR and CODEX_HOME outside the user home', () => fixture(root => {
  const home = path.join(root, 'home'); fs.mkdirSync(home);
  write(path.join(root, 'acct', '.claude.json'), '{}');
  fs.mkdirSync(path.join(root, 'cx'));
  const homes = agentHomes(home, { CLAUDE_CONFIG_DIR: path.join(root, 'acct'), CODEX_HOME: path.join(root, 'cx') });
  assert.deepEqual(homes.map(h => h.kind).sort(), ['claude', 'codex']);
}));

test('rejects unsafe server definitions', () => {
  assert.throws(() => validServers({ tasks: { url: 'http://beelink:7443/mcp' } }), /https/);
  assert.throws(() => validServers({ tasks: { url: 'https://u:p@host/mcp' } }), /credentials/);
  assert.throws(() => validServers({ 'Bad Name': { url: URL1 } }), /name/);
  assert.deepEqual(validServers({ local: { url: 'http://127.0.0.1:9000/mcp' } }), [{ name: 'local', url: 'http://127.0.0.1:9000/mcp' }]);
});
