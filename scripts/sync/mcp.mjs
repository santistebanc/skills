// Registers private, per-machine MCP servers (config.json `mcpServers`) in every Claude and
// Codex home on this machine, so each account sees the same tools in every project.
// Only remote (Streamable HTTP) servers by URL; server URLs stay in private config, never in Git.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const NAME = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export function validServers(servers = {}) {
  if (typeof servers !== 'object' || Array.isArray(servers)) throw Error('mcpServers must be an object');
  return Object.entries(servers).map(([name, s]) => {
    if (!NAME.test(name)) throw Error(`Invalid MCP server name: ${name}`);
    const url = s?.url;
    let parsed;
    try { parsed = new URL(url); } catch { throw Error(`MCP server ${name} needs a valid url`); }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && local)) throw Error(`MCP server ${name} must use https`);
    if (parsed.username || parsed.password || /["'\\\s]/.test(url)) throw Error(`MCP server ${name} url must not carry credentials or quotes`);
    return { name, url };
  });
}

const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

export function agentHomes(userHome, env = process.env) {
  const homes = [];
  const add = (kind, dir, files) => { if (isDir(dir)) homes.push({ kind, dir: path.resolve(dir), files: files.map(f => path.resolve(f)) }); };
  const named = fs.readdirSync(userHome, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  const codex = new Set([env.CODEX_HOME || path.join(userHome, '.codex'), ...named.filter(n => /^\.codex(?:[-_].+)?$/.test(n)).map(n => path.join(userHome, n))].map(p => path.resolve(p)));
  for (const dir of codex) add('codex', dir, [path.join(dir, 'config.toml')]);
  const defaultClaude = path.resolve(userHome, '.claude');
  const claude = new Set([env.CLAUDE_CONFIG_DIR || defaultClaude, ...named.filter(n => /^\.claude(?:[-_].+)?$/.test(n)).map(n => path.join(userHome, n))].map(p => path.resolve(p)));
  for (const dir of claude) {
    // Without CLAUDE_CONFIG_DIR, Claude keeps its user config beside the home directory.
    const files = [path.join(dir, '.claude.json'), ...(dir === defaultClaude ? [path.join(userHome, '.claude.json')] : [])];
    add('claude', dir, files);
  }
  return homes;
}

function writeAtomic(file, text) {
  const mode = fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : 0o600;
  const temporary = `${file}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, text, { mode });
  fs.renameSync(temporary, file);
}

export function claudeEnsure(file, { name, url }) {
  if (!fs.existsSync(file)) return 'absent';  // created by Claude on first launch; next sync registers
  const text = fs.readFileSync(file, 'utf8');
  const config = JSON.parse(text);
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw Error('unexpected Claude config shape');
  const current = config.mcpServers?.[name];
  if (current?.type === 'http' && current.url === url) return 'current';
  config.mcpServers = { ...(config.mcpServers || {}), [name]: { ...(current || {}), type: 'http', url } };
  writeAtomic(file, JSON.stringify(config, null, 2) + '\n');
  return 'registered';
}

export function codexEnsure(file, { name, url }) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = text.split(/\r?\n/);
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const header = lines.findIndex(l => l.trim() === `[mcp_servers.${name}]` || l.trim() === `[mcp_servers."${name}"]`);
  const value = `url = "${url}"`;
  if (header < 0) {
    const body = text.replace(/\s*$/, '');
    writeAtomic(file, (body ? body + newline + newline : '') + `[mcp_servers.${name}]` + newline + value + newline);
    return 'registered';
  }
  let end = lines.findIndex((l, i) => i > header && /^\s*\[/.test(l));
  if (end < 0) end = lines.length;
  const at = lines.findIndex((l, i) => i > header && i < end && /^\s*url\s*=/.test(l));
  if (at >= 0 && lines[at].trim() === value) return 'current';
  if (at >= 0) lines[at] = value; else lines.splice(header + 1, 0, value);
  writeAtomic(file, lines.join(newline));
  return 'registered';
}

export function registerMcp(userHome, servers, env = process.env) {
  const list = validServers(servers);
  if (!list.length) return [];
  const results = [];
  for (const home of agentHomes(userHome, env)) {
    for (const file of home.files) {
      for (const server of list) {
        try {
          const state = home.kind === 'claude' ? claudeEnsure(file, server) : codexEnsure(file, server);
          if (state !== 'absent') results.push({ kind: home.kind, file, server: server.name, state });
        } catch (e) {
          // Never rewrite a config we cannot parse; report it and leave the file untouched.
          results.push({ kind: home.kind, file, server: server.name, state: 'error', message: e.message });
        }
      }
    }
  }
  return results;
}
