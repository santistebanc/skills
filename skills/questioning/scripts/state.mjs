import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync, openSync, fsyncSync, closeSync, unlinkSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const ROOT = resolve(process.env.QUESTIONING_HOME || join(homedir(), ".questioning"));
export const SESSIONS = join(ROOT, "sessions");
export const PROTOCOL = 2;
export const VERSION = "2.0.0";
export const BUNDLE_FILES = ["package.json", "ui/index.html", "scripts/q.mjs", "scripts/state.mjs", "scripts/runtime.mjs", "scripts/serve.mjs", "scripts/open.mjs"];
const bundleHash = createHash("sha256");
for (const file of BUNDLE_FILES) bundleHash.update(file).update(readFileSync(new URL(`../${file}`, import.meta.url)));
export const BUILD = bundleHash.digest("hex").slice(0, 16);
const BY_CWD = join(ROOT, "by-cwd");
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 24);

export function normalizeCwd(cwd) {
  const absolute = resolve(cwd);
  return existsSync(absolute) ? realpathSync.native(absolute) : absolute;
}
const cwdKey = (cwd) => {
  const normalized = normalizeCwd(cwd);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
};

export function sessionDir(id) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id)) throw new Error("Invalid session ID.");
  return join(SESSIONS, id);
}

export function newId() {
  return `${new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14)}-${randomBytes(3).toString("hex")}`;
}

function atomicJSON(path, value) {
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const fd = openSync(temp, "wx");
  try {
    writeFileSync(fd, JSON.stringify(value, null, 2), "utf8");
    fsyncSync(fd);
  } finally { closeSync(fd); }
  try { renameSync(temp, path); }
  finally { if (existsSync(temp)) unlinkSync(temp); }
}

export function rememberCwd(cwd, id) {
  mkdirSync(BY_CWD, { recursive: true });
  atomicJSON(join(BY_CWD, `${hash(cwdKey(cwd))}.json`), { cwd: normalizeCwd(cwd), id });
}

export function lookupCwd(cwd) {
  const key = cwdKey(cwd);
  const p = join(BY_CWD, `${hash(key)}.json`);
  if (existsSync(p)) {
    try {
      const id = JSON.parse(readFileSync(p, "utf8")).id;
      if (existsSync(join(sessionDir(id), "session.json"))) return id;
    } catch { /* search legacy sessions below */ }
  }
  // Old pointers hashed the raw path. Searching also recovers a missing pointer.
  const matching = listSessions().filter((s) => s.cwd && cwdKey(s.cwd) === key);
  const found = matching.find((s) => !["closed", "aborted"].includes(s.phase)) ?? matching[0];
  if (found) rememberCwd(cwd, found.id);
  return found?.id ?? null;
}

export function create(cwd, brief) {
  const id = newId();
  const dir = sessionDir(id);
  mkdirSync(join(dir, "staged-docs"), { recursive: true });
  const s = {
    schemaVersion: 2, id, cwd: normalizeCwd(cwd), createdAt: Date.now(), lastContact: Date.now(),
    phase: brief ? "active" : "brief", brief: brief ?? "", nodes: [], events: [],
    seq: 0, agentCursor: 0, deliveredThrough: 0, nextNum: 1, revision: 0, receipts: {},
  };
  save(dir, s);
  rememberCwd(cwd, id);
  return s;
}

export function load(dir) {
  const s = JSON.parse(readFileSync(join(dir, "session.json"), "utf8"));
  if (s.schemaVersion > 2) throw new Error("This session needs a newer version of Questioning.");
  if (!s.id || !Array.isArray(s.nodes) || !Array.isArray(s.events)) throw new Error("Invalid session data.");
  if (!s.schemaVersion || s.schemaVersion < 2) {
    // v1 consumed events on delivery. Recover clarification requests left unfinished then.
    for (const n of s.nodes) {
      const pending = n.elaborationRequest;
      if (!pending) continue;
      const event = s.events.find((e) => e.type === "elaborate" && e.requestId === pending.id);
      if (!event || event.seq <= s.agentCursor) {
        s.seq++;
        s.events.push({ seq: s.seq, type: "elaborate", at: Date.now(), toAgent: true, questionId: n.id, num: n.num, title: n.title, prompt: n.prompt, requestId: pending.id });
      }
    }
  }
  return { revision: 0, receipts: {}, deliveredThrough: s.agentCursor ?? 0, ...s, schemaVersion: 2 };
}

export function save(dir, session) { atomicJSON(join(dir, "session.json"), session); }

export function listSessions() {
  if (!existsSync(SESSIONS)) return [];
  return readdirSync(SESSIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).flatMap((e) => {
    try { return [load(sessionDir(e.name))]; }
    catch { return [{ id: e.name, error: "Cannot read session data" }]; }
  }).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function runtime(dir) {
  try { return JSON.parse(readFileSync(join(dir, "runtime.json"), "utf8")); }
  catch { return null; }
}

export function alive(rt) {
  if (!Number.isInteger(rt?.pid) || rt.pid <= 0) return false;
  try { process.kill(rt.pid, 0); return true; }
  catch { return false; }
}

/** Serialize startup across concurrent CLI invocations; reclaim abandoned locks. */
export async function withLock(key, fn) {
  const locks = join(ROOT, "locks");
  mkdirSync(locks, { recursive: true });
  const path = join(locks, `${hash(key)}.lock`);
  const deadline = Date.now() + 15000;
  let fd;
  while (fd === undefined) {
    try {
      fd = openSync(path, "wx");
      writeFileSync(fd, JSON.stringify({ pid: process.pid }), "utf8");
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const owner = JSON.parse(readFileSync(path, "utf8"));
        if (!alive(owner)) { unlinkSync(path); continue; }
      } catch {
        try { if (Date.now() - statSync(path).mtimeMs > 10000) { unlinkSync(path); continue; } }
        catch { continue; }
      }
      if (Date.now() > deadline) throw new Error("Another Questioning command is still starting this session. Try again.");
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  try { return await fn(); }
  finally { closeSync(fd); try { unlinkSync(path); } catch { /* already removed */ } }
}

export function workspaceLock(cwd) { return `workspace:${cwdKey(cwd)}`; }

export function dependents(nodes, id) {
  const out = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (!out.has(n.id) && n.dependsOn?.some((d) => d === id || out.has(d))) { out.add(n.id); grew = true; }
    }
  }
  return [...out];
}

export function snapshot(s) {
  return {
    id: s.id, phase: s.phase, brief: s.brief, nodes: s.nodes, createdAt: s.createdAt,
    revision: s.revision, acknowledgedThrough: s.agentCursor,
    pendingEvents: s.events.filter((e) => e.toAgent !== false && e.seq > s.agentCursor).length,
  };
}
