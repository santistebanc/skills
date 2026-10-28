import { createServer } from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dependents, load, save, snapshot, PROTOCOL, VERSION, BUILD } from "./state.mjs";

const dir = process.argv[2];
if (!dir) throw new Error("usage: serve.mjs <sessionDir> [port]");
const UI = fileURLToPath(new URL("../ui/index.html", import.meta.url));
const instanceId = randomUUID();
let s = load(dir);
let lastAgentSeen = 0;
const clients = new Set();
const waiters = new Set();
const node = (id) => s.nodes.find((n) => n.id === id);
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const terminal = () => ["closed", "aborted"].includes(s.phase);
const editable = () => { if (terminal()) fail("This session has finished. Start a new session to make new decisions.", 409); };
const persist = () => save(dir, s);

function view() {
  const age = lastAgentSeen ? Date.now() - lastAgentSeen : Infinity;
  return { ...snapshot(s), build: BUILD, agent: {
    status: waiters.size ? "listening" : age < 60000 ? "active" : "disconnected",
    lastSeenAt: lastAgentSeen || null,
  } };
}
function broadcast() {
  for (const res of clients) {
    if (res.destroyed) clients.delete(res);
    else res.write(`data: ${JSON.stringify(view())}\n\n`);
  }
}
function notify() { broadcast(); for (const wake of [...waiters]) wake(); }
function contact() { lastAgentSeen = Date.now(); }
function emit(type, payload = {}, toAgent = true) {
  s.seq++;
  s.revision++;
  s.events.push({ seq: s.seq, type, at: Date.now(), toAgent, ...payload });
}
function ack(through) {
  if (!Number.isSafeInteger(through) || through < 0 || through > s.deliveredThrough) fail("Acknowledgment must name an event cursor already delivered to the agent.");
  s.agentCursor = Math.max(s.agentCursor, through);
}

function publish(incoming, phase, expectedRevision) {
  editable();
  if (expectedRevision !== undefined && expectedRevision !== s.revision) fail(`Session changed (revision ${s.revision}). Read status and reconcile before publishing again.`, 409);
  if (!Array.isArray(incoming)) fail("nodes must be an array");
  if (phase && !["active", "ready"].includes(phase)) fail("Invalid publish phase");
  const prev = new Map(s.nodes.map((n) => [n.id, n]));
  const ids = new Set();
  for (const raw of incoming) {
    if (!raw || typeof raw.id !== "string" || !raw.id || ids.has(raw.id)) fail("Questions need unique, nonempty IDs.");
    ids.add(raw.id);
  }
  s.nodes = incoming.map((raw) => {
    const old = prev.get(raw.id);
    const answer = raw.clearAnswer ? undefined : old?.answer;
    const completed = old?.elaborationRequest && raw.explanation?.requestId === old.elaborationRequest.id &&
      typeof raw.explanation.text === "string" && raw.explanation.text.trim();
    const options = raw.options ?? old?.options ?? [];
    const dependencies = raw.dependsOn ?? old?.dependsOn ?? [];
    const recommendation = raw.recommendation ?? old?.recommendation ?? null;
    if (!Array.isArray(dependencies) || dependencies.some((d) => !ids.has(d) || d === raw.id)) fail("Question dependencies must reference other questions in the tree.");
    if (!Array.isArray(options) || options.some((o) => !o || typeof o.id !== "string" || !o.id || typeof o.label !== "string" || !o.label.trim()) || new Set(options.map((o) => o.id)).size !== options.length) fail("Options need unique IDs and nonempty labels.");
    if (recommendation?.optionId && !options.some((o) => o.id === recommendation.optionId)) fail("Recommendation must reference an existing option.");
    return {
      id: raw.id, num: old?.num ?? s.nextNum++, title: raw.title ?? old?.title ?? raw.id,
      dependsOn: dependencies, status: answer ? "answered" : raw.status ?? "frontier",
      prompt: raw.prompt ?? old?.prompt ?? "", context: raw.context ?? old?.context ?? "",
      explanation: completed ? raw.explanation : old?.explanation ?? null,
      elaborationRequest: completed ? null : old?.elaborationRequest ?? null,
      options, recommendation, docs: raw.docs ?? old?.docs ?? [], answer,
    };
  });
  const visiting = new Set(), visited = new Set();
  const visit = (n) => {
    if (visiting.has(n.id)) fail("Question dependencies contain a cycle.");
    if (visited.has(n.id)) return;
    visiting.add(n.id); n.dependsOn.forEach((id) => visit(node(id)));
    visiting.delete(n.id); visited.add(n.id);
  };
  s.nodes.forEach(visit);
  for (const n of s.nodes) {
    if (n.answer) continue;
    if (n.dependsOn.some((id) => !node(id).answer)) n.status = "blocked";
    if (!["frontier", "blocked"].includes(n.status)) fail("Invalid question status");
    if (n.status === "frontier" && !n.prompt.trim()) fail("Open questions need a prompt.");
  }
  if (phase === "ready" && s.nodes.some((n) => !n.answer && n.status === "frontier")) fail("Answer the open questions before marking the session ready.", 409);
  if (phase) s.phase = phase;
  else if (s.phase === "brief" && s.brief) s.phase = "active";
  emit("published", { count: s.nodes.length }, false);
  return { ok: true, published: s.nodes.length, phase: s.phase, revision: s.revision };
}

function answer(b, source) {
  editable();
  const n = node(b.questionId);
  if (!n) fail("Unknown question", 404);
  if (n.status === "blocked") fail("This question still has unanswered dependencies.", 409);
  const text = String(b.text ?? "").trim();
  if (!text) fail("An answer cannot be empty.");
  const optionId = b.optionId ?? null;
  if (optionId && !n.options.some((o) => o.id === optionId)) fail("Unknown option");
  if (n.answer?.text === text && n.answer.optionId === optionId && n.answer.acceptedRecommendation === Boolean(b.acceptedRecommendation)) return { ok: true, duplicate: true };
  const revising = Boolean(n.answer);
  n.answer = { optionId, text, acceptedRecommendation: Boolean(b.acceptedRecommendation), answeredAt: Date.now(), source };
  n.status = "answered";
  if (s.phase === "ready") s.phase = "active";
  const affected = revising ? dependents(s.nodes, n.id).filter((id) => node(id)?.answer) : [];
  emit(revising ? "revise" : "answer", { questionId: n.id, num: n.num, title: n.title, answer: n.answer, affected }, source !== "chat");
  return { ok: true };
}

async function body(req) {
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 4e6) fail("Request is too large", 413); }
  try { return raw ? JSON.parse(raw) : {}; }
  catch { fail("Invalid JSON"); }
}
function send(res, code, obj) {
  if (res.destroyed) return;
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(obj));
}

/** Save the state change and its retry receipt together, before notifying clients. */
async function mutate(req, res, action) {
  const b = await body(req);
  if (!b || typeof b !== "object" || Array.isArray(b)) fail("Expected a JSON object");
  const operationId = req.headers["idempotency-key"] ?? b.operationId;
  const fingerprint = createHash("sha256").update(req.url + JSON.stringify(b)).digest("hex");
  if (operationId && (typeof operationId !== "string" || operationId.length > 100)) fail("Invalid operation ID");
  const receipt = operationId && Object.hasOwn(s.receipts, operationId) ? s.receipts[operationId] : null;
  if (receipt) {
    if (receipt.fingerprint !== fingerprint) fail("Operation ID was already used with different input.", 409);
    return send(res, 200, receipt.result);
  }
  const before = structuredClone(s);
  let result;
  try {
    result = action(b);
    if (operationId) {
      s.receipts[operationId] = { fingerprint, result };
      const keys = Object.keys(s.receipts);
      if (keys.length > 256) delete s.receipts[keys[0]];
    }
    persist();
  } catch (error) { s = before; throw error; }
  notify();
  send(res, 200, result);
}

const server = createServer(async (req, res) => {
  s.lastContact = Date.now();
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const path = url.pathname;
    if (path === "/" || path === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(readFileSync(UI, "utf8").replace('<head>', `<head>\n<meta name="questioning-build" content="${BUILD}" />`));
    }
    if (path === "/api/health") return send(res, 200, { app: "questioning", protocol: PROTOCOL, version: VERSION, build: BUILD, sessionId: s.id, instanceId });
    if (path === "/api/state") return send(res, 200, view());
    if (path === "/api/stream") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(`data: ${JSON.stringify(view())}\n\n`);
      clients.add(res);
      res.on("close", () => clients.delete(res));
      return;
    }
    if (path.startsWith("/api/agent/")) {
      const identity = req.headers["x-questioning-instance"];
      if (identity && identity !== instanceId) fail("Server instance changed. Resume the session.", 409);
      contact();
    }
    if (path === "/api/agent/wait") {
      const timeout = Number(url.searchParams.get("timeout") ?? 50000);
      if (!Number.isFinite(timeout) || timeout < 0 || timeout > 60000) fail("wait timeout must be between 0 and 60000ms");
      const drain = () => {
        const events = s.events.filter((e) => e.seq > s.agentCursor && e.toAgent !== false);
        if (!events.length) return null;
        const cursor = events.at(-1).seq;
        s.deliveredThrough = Math.max(s.deliveredThrough, cursor);
        persist();
        return { events, cursor, acknowledgedThrough: s.agentCursor, phase: s.phase, revision: s.revision };
      };
      const available = drain();
      if (available) { broadcast(); return send(res, 200, available); }
      if (s.phase === "active" && !s.nodes.some((n) => !n.answer && n.status === "frontier")) {
        return send(res, 200, { events: [], cursor: s.agentCursor, phase: s.phase, revision: s.revision, needsAction: "publish_or_ready" });
      }
      let timer;
      const finish = (timedOut = false) => {
        if (!waiters.has(wake)) return;
        waiters.delete(wake); clearTimeout(timer); contact();
        send(res, 200, drain() ?? { events: [], cursor: s.agentCursor, phase: s.phase, timedOut });
        broadcast();
      };
      const wake = () => { if (s.events.some((e) => e.seq > s.agentCursor && e.toAgent !== false)) finish(); };
      waiters.add(wake);
      timer = setTimeout(() => finish(true), timeout);
      res.on("close", () => { waiters.delete(wake); clearTimeout(timer); });
      broadcast();
      return;
    }
    if (req.method !== "POST") return send(res, 404, { error: "Not found" });
    if (path === "/api/agent/publish") return await mutate(req, res, (b) => {
      const result = publish(b.nodes, b.phase, b.expectedRevision);
      if (b.ackThrough !== undefined) ack(b.ackThrough);
      return result;
    });
    if (path === "/api/agent/ack") return await mutate(req, res, (b) => { ack(b.through); return { ok: true, acknowledgedThrough: s.agentCursor }; });
    if (path === "/api/agent/heartbeat") { broadcast(); return send(res, 200, { ok: true }); }
    if (path === "/api/agent/answer" || path === "/api/answer") return await mutate(req, res, (b) => answer(b, path.includes("/agent/") ? "chat" : "ui"));
    if (path === "/api/agent/ready") return await mutate(req, res, (b) => {
      editable();
      if (s.nodes.some((n) => !n.answer && n.status === "frontier")) fail("There are still open questions.", 409);
      if (s.phase !== "ready") { s.phase = "ready"; emit("ready", {}, false); }
      if (b.ackThrough !== undefined) ack(b.ackThrough);
      return { ok: true, phase: s.phase };
    });
    if (path === "/api/agent/stop") {
      send(res, 200, { ok: true });
      return setTimeout(() => process.exit(0), 100);
    }
    if (path === "/api/agent/end" || path === "/api/confirm" || path === "/api/abort") return await mutate(req, res, () => {
      if (!terminal()) {
        if (path === "/api/confirm" && s.phase !== "ready") fail("The session is not ready to finish.", 409);
        s.phase = path === "/api/abort" ? "aborted" : "closed";
        emit(s.phase === "aborted" ? "abort" : "confirm", { reason: path }, !path.includes("/agent/"));
      }
      return { ok: true, phase: s.phase };
    });
    if (path === "/api/elaborate") return await mutate(req, res, (b) => {
      editable();
      const n = node(b.questionId);
      if (!n) fail("Unknown question", 404);
      if (n.status === "blocked") fail("Question is not available", 409);
      if (!n.elaborationRequest) {
        n.elaborationRequest = { id: randomUUID(), at: Date.now() };
        emit("elaborate", { questionId: n.id, num: n.num, title: n.title, prompt: n.prompt, requestId: n.elaborationRequest.id });
      }
      return { ok: true, requestId: n.elaborationRequest.id };
    });
    if (path === "/api/brief") return await mutate(req, res, (b) => {
      editable();
      const text = String(b.text ?? "").trim();
      if (!text) fail("The brief cannot be empty.");
      if (text !== s.brief) {
        const revised = Boolean(s.brief); s.brief = text; s.phase = "active";
        emit("brief", { text, revised });
      }
      return { ok: true };
    });
    if (path === "/api/keep") return await mutate(req, res, () => { editable(); if (s.phase !== "active") { s.phase = "active"; emit("keep_grilling"); } return { ok: true }; });
    send(res, 404, { error: "Not found" });
  } catch (error) { send(res, error.status ?? 500, { error: error.message }); }
});

const preferredPort = Number(process.argv[3]) || 0;
server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !server.listening) server.listen(0, "127.0.0.1");
  else { console.error(error); process.exit(1); }
});
server.on("listening", () => {
  const port = server.address().port;
  writeFileSync(join(dir, "runtime.json"), JSON.stringify({ pid: process.pid, port, url: `http://127.0.0.1:${port}`, sessionId: s.id, instanceId, protocol: PROTOCOL, version: VERSION, startedAt: Date.now() }), "utf8");
});
server.listen(preferredPort, "127.0.0.1");
setInterval(broadcast, 5000).unref();
setInterval(() => { if (!clients.size && !waiters.size && Date.now() - s.lastContact > (terminal() ? 60000 : 86400000)) process.exit(0); }, 60000).unref();
