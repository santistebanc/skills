#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { create, load, lookupCwd, sessionDir, snapshot, listSessions, normalizeCwd, runtime, withLock, workspaceLock, ROOT, VERSION, BUILD } from "./state.mjs";
import { ensureServer, request, health } from "./runtime.mjs";
import { attended, verdict } from "./open.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0];
function flag(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`--${name} needs a value`);
  return argv[i + 1];
}
const bool = (name) => argv.includes(`--${name}`);
const positional = () => argv[1] && !argv[1].startsWith("--") ? argv[1] : null;
const cwd = () => normalizeCwd(flag("workspace", flag("cwd", process.cwd())));
const out = (value) => console.log(JSON.stringify(value, null, 2));
function id() {
  const found = flag("session") ?? positional() ?? lookupCwd(cwd());
  if (!found) throw new Error("No session found. Run questioning start --workspace <path> first, or pass --session <id>.");
  sessionDir(found);
  return found;
}
async function readStdin() {
  if (process.stdin.isTTY) return "";
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}
function ackThrough() {
  const value = flag("ack");
  return value === null ? undefined : Number(value);
}
async function attached(sessionId) {
  const rt = await ensureServer(sessionId);
  const state = await request(sessionId, "/api/state");
  return { sessionId, url: rt.url, port: rt.port, dir: sessionDir(sessionId), ...state, needsBrief: !state.brief, ...verdict(rt.url) };
}

try {
  switch (cmd) {
    case "start": {
      if (!attended() && !bool("force")) throw new Error("This session is flagged unattended; use --force only for an authorized headless test.");
      const workspace = cwd();
      const result = await withLock(workspaceLock(workspace), async () => {
        const existing = bool("new") ? null : lookupCwd(workspace);
        if (existing && !["closed", "aborted"].includes(load(sessionDir(existing)).phase)) return { already: true, ...await attached(existing) };
        const file = flag("brief-file");
        if (file && !existsSync(file)) throw new Error(`Brief file does not exist: ${file}`);
        const s = create(workspace, file ? readFileSync(file, "utf8").trim() : flag("brief", ""));
        return { already: false, ...await attached(s.id) };
      });
      out(result);
      break;
    }
    case "resume": out(await attached(id())); break;
    case "sessions": {
      const sessions = await Promise.all(listSessions().map(async (s) => ({
        id: s.id, workspace: s.cwd, phase: s.phase, createdAt: s.createdAt, brief: s.brief,
        settled: s.nodes?.filter((n) => n.answer).length, serverRunning: s.error ? false : Boolean(await health(s.id)), error: s.error,
      })));
      out({ sessions }); break;
    }
    case "status": {
      const sessionId = flag("session") ?? positional() ?? lookupCwd(cwd());
      if (!sessionId) { out({ active: false }); break; }
      const saved = load(sessionDir(sessionId));
      const rt = runtime(sessionDir(sessionId));
      const running = Boolean(await health(sessionId, rt));
      const state = running ? await request(sessionId, "/api/state") : { ...snapshot(saved), agent: { status: "disconnected", lastSeenAt: null } };
      out({ active: !["closed", "aborted"].includes(saved.phase), serverRunning: running, sessionId, url: rt?.url, dir: sessionDir(sessionId), ...state });
      break;
    }
    case "doctor": {
      const sessionId = flag("session") ?? positional() ?? lookupCwd(cwd());
      if (!sessionId) { out({ ok: true, version: VERSION, dataRoot: ROOT, session: null, advice: "Run questioning start --workspace <path>." }); break; }
      if (bool("repair")) await ensureServer(sessionId);
      const s = load(sessionDir(sessionId)), rt = runtime(sessionDir(sessionId));
      const identity = await health(sessionId, rt);
      const healthy = Boolean(identity);
      out({ ok: healthy, version: VERSION, build: BUILD, serverBuild: identity?.build, dataRoot: ROOT, sessionId, phase: s.phase, serverHealthy: healthy,
        pendingEvents: snapshot(s).pendingEvents, acknowledgedThrough: s.agentCursor,
        log: join(sessionDir(sessionId), "server.log"), advice: healthy ? "Server is ready. The AI agent must call wait to handle requests." : `Run questioning resume ${sessionId} to recover the server.` });
      break;
    }
    case "publish": {
      const sessionId = id(), file = flag("file");
      const raw = file ? readFileSync(file, "utf8") : await readStdin();
      if (!raw.trim()) throw new Error("publish needs --file <tree.json> or JSON on stdin");
      const tree = JSON.parse(raw);
      const revision = flag("revision");
      const expectedRevision = revision === null ? tree.revision : Number(revision);
      out(await request(sessionId, "/api/agent/publish", { method: "POST", json: {
        nodes: tree.nodes ?? tree, phase: tree.phase, expectedRevision, ackThrough: ackThrough(),
      }, operationId: flag("operation") ?? undefined }));
      break;
    }
    case "answer": {
      const text = flag("text") ?? (await readStdin()).trim();
      if (!flag("id") || !text) throw new Error("answer needs --id <question-id> and --text <answer>");
      out(await request(id(), "/api/agent/answer", { method: "POST", json: {
        questionId: flag("id"), text, optionId: flag("option"), acceptedRecommendation: bool("accepted"),
      }, operationId: flag("operation") ?? undefined }));
      break;
    }
    case "wait": {
      const ms = Number(flag("timeout", "50000"));
      if (!Number.isFinite(ms) || ms < 0 || ms > 60000) throw new Error("wait timeout must be between 0 and 60000ms");
      out(await request(id(), `/api/agent/wait?timeout=${ms}`, { timeoutMs: ms + 3000 }));
      break;
    }
    case "ack": {
      const through = flag("through");
      if (through === null) throw new Error("ack needs --through <cursor>");
      out(await request(id(), "/api/agent/ack", { method: "POST", json: { through: Number(through) } }));
      break;
    }
    case "heartbeat": out(await request(id(), "/api/agent/heartbeat", { method: "POST" })); break;
    case "ready": out(await request(id(), "/api/agent/ready", { method: "POST", json: { ackThrough: ackThrough() } })); break;
    case "end": out(await request(id(), "/api/agent/end", { method: "POST", json: {} })); break;
    case "stop": {
      const sessionId = id();
      if (!await health(sessionId)) { out({ ok: true, note: "Server already stopped; session is saved." }); break; }
      out(await request(sessionId, "/api/agent/stop", { method: "POST" })); break;
    }
    case "transcript": {
      const sessionId = flag("session") ?? flag("id") ?? positional() ?? lookupCwd(cwd());
      const s = load(sessionDir(sessionId)), dir = sessionDir(sessionId);
      out({ id: s.id, phase: s.phase, brief: s.brief, dir, stagedDocs: join(dir, "staged-docs"),
        settled: s.nodes.filter((n) => n.answer).sort((a, b) => a.answer.answeredAt - b.answer.answeredAt).map((n) => ({
          num: n.num, title: n.title, answer: n.answer.text, source: n.answer.source, accepted: n.answer.acceptedRecommendation, docs: n.docs ?? [],
        })), unanswered: s.nodes.filter((n) => !n.answer).map((n) => ({ num: n.num, title: n.title, status: n.status })),
      }); break;
    }
    case "--version": case "version": console.log(VERSION); break;
    default:
      console.log(`Questioning ${VERSION}
  start --workspace PATH [--brief TEXT | --brief-file FILE] [--new]
  resume SESSION                     restore or attach to an interview
  sessions                           list saved interviews
  status [SESSION]                    inspect without starting a server
  doctor [SESSION] [--repair]         diagnose or recover a session
  publish --file TREE [--revision N] [--ack CURSOR]
  wait [--timeout MS]                 read pending events; does not acknowledge
  ack --through CURSOR               acknowledge completed work
  answer --id Q --text TEXT [--option O] [--accepted]
  ready [--ack CURSOR]                offer Finish / Keep going
  heartbeat                          report agent activity during longer work
  transcript                         read settled answers, including offline
  stop                               stop the app, preserving the interview
  end                                close the interview
All session commands accept --session ID; --cwd remains an alias for --workspace.
Commands return JSON. QUESTIONING_HOME selects a separate data directory.`);
      if (cmd && !["help", "--help", "-h"].includes(cmd)) process.exitCode = 2;
  }
} catch (error) {
  console.error(JSON.stringify({ error: error.message, status: error.status }));
  process.exitCode = error.status === 409 ? 3 : 1;
}
