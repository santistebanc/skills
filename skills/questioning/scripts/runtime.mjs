import { spawn } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { load, sessionDir, runtime, withLock, PROTOCOL, BUILD } from "./state.mjs";

const SERVE = fileURLToPath(new URL("./serve.mjs", import.meta.url));
export async function health(id, rt = runtime(sessionDir(id))) {
  if (!rt?.url) return null;
  for (let attempt = 0; attempt < 2; attempt++) try {
    const url = new URL(rt.url);
    if (url.hostname !== "127.0.0.1" || url.protocol !== "http:") return null;
    const res = await fetch(`${rt.url}/api/health`, { signal: AbortSignal.timeout(800) });
    const h = await res.json();
    return res.ok && h.app === "questioning" && h.protocol === PROTOCOL && h.sessionId === id && h.instanceId === rt.instanceId ? h : null;
  } catch { /* a restarted server may reset an old keep-alive connection once */ }
  return null;
}

export async function ensureServer(id) {
  return withLock(`session:${id}`, async () => {
    const dir = sessionDir(id);
    load(dir); // Never replace a missing or unreadable session with a new interview.
    const old = runtime(dir);
    const running = await health(id, old);
    if (running?.build === BUILD) return old;
    if (running) {
      await fetch(`${old.url}/api/agent/stop`, { method: "POST", headers: { "x-questioning-instance": old.instanceId }, signal: AbortSignal.timeout(2000) });
      for (let i = 0; i < 50 && await health(id, old); i++) await new Promise((r) => setTimeout(r, 50));
    }
    if (old?.url) {
      try {
        const url = new URL(old.url);
        if (url.hostname === "127.0.0.1" && url.protocol === "http:") {
          const res = await fetch(`${old.url}/api/state`, { signal: AbortSignal.timeout(800) });
          const state = await res.json();
          if (state.id === id) throw Object.assign(new Error("A different or older server still owns this session. Stop that server before resuming; saved answers are intact."), { owned: true });
        }
      } catch (error) { if (error.owned) throw error; }
    }
    const log = openSync(join(dir, "server.log"), "a");
    let child, launchError;
    try {
      child = spawn(process.execPath, [SERVE, dir, String(old?.port ?? 0)], { stdio: ["ignore", log, log], detached: true, windowsHide: true });
      child.on("error", (error) => { launchError = error; });
      child.unref();
    } finally { closeSync(log); }
    for (let i = 0; i < 150; i++) {
      if (launchError) throw launchError;
      const rt = runtime(dir);
      if (rt?.pid === child.pid && await health(id, rt)) return rt;
      await new Promise((r) => setTimeout(r, 50));
    }
    child.kill();
    throw new Error(`Server did not become ready. Check ${join(dir, "server.log")}.`);
  });
}

/** Retry transport failures using the same operation ID, including after restart. */
export async function request(id, path, { method = "GET", json, timeoutMs = 10000, operationId = randomUUID() } = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const rt = await ensureServer(id);
    try {
      const res = await fetch(`${rt.url}${path}`, {
        method, headers: { "content-type": "application/json", "x-questioning-instance": rt.instanceId, "idempotency-key": operationId },
        body: json === undefined ? undefined : JSON.stringify(json), signal: AbortSignal.timeout(timeoutMs),
      });
      const value = await res.json();
      if (!res.ok) throw Object.assign(new Error(value.error ?? `Server returned ${res.status}`), { status: res.status });
      return value;
    } catch (error) {
      if (error.status) throw error;
      lastError = error;
    }
  }
  throw new Error(`Could not reach the session server: ${lastError.message}. Resume ${id} to reconnect.`);
}
