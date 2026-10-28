import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { check, createProfile, transact, validate } from "./model.mjs";

export function defaultHome() {
  return path.resolve(process.env.CAREER_PROFILE_HOME || path.join(os.homedir(), ".career-profile"));
}
export function profilePath(home) { return path.join(home, "profile.json"); }
const lockPath = (home) => path.join(home, ".write.lock");

export function readStore(home) {
  let raw;
  try { raw = fs.readFileSync(profilePath(home), "utf8"); }
  catch (error) {
    if (error.code === "ENOENT") throw new Error("No profile store at " + home + ". Run init first.");
    throw error;
  }
  return validate(JSON.parse(raw.replace(/^\uFEFF/, "")));
}

function locked(home, operation) {
  let fd;
  try { fd = fs.openSync(lockPath(home), "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("Another write holds the store lock. Retry after it finishes; use unlock only after a crashed writer.");
    throw error;
  }
  try {
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    fs.fsyncSync(fd);
    return operation();
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lockPath(home));
  }
}

function atomicSave(home, doc) {
  validate(doc);
  const temp = path.join(home, ".profile-" + randomUUID() + ".tmp");
  let fd;
  try {
    fd = fs.openSync(temp, "wx", 0o600);
    fs.writeFileSync(fd, JSON.stringify(doc, null, 2) + "\n");
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, profilePath(home));
    // Flush the directory entry where supported; Windows does not expose this.
    if (process.platform !== "win32") {
      const dir = fs.openSync(home, "r");
      try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
    }
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

export function initStore(home) {
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  return locked(home, () => {
    check(!fs.existsSync(profilePath(home)), "A profile already exists. init never overwrites it.");
    const doc = createProfile();
    atomicSave(home, doc);
    return doc;
  });
}

export function updateStore(home, expectedRevision, reason, operation) {
  check(Number.isSafeInteger(expectedRevision) && expectedRevision >= 0, "Writes require --revision with the last read revision");
  return locked(home, () => {
    const current = readStore(home);
    check(current.revision === expectedRevision, "Revision conflict: expected " + expectedRevision + ", found " + current.revision + ". Read the latest records and reconcile before retrying.");
    const next = transact(current, reason, operation);
    atomicSave(home, next);
    return next;
  });
}

export function unlockStore(home) {
  const file = lockPath(home);
  const raw = fs.readFileSync(file, "utf8");
  let lock;
  try { lock = JSON.parse(raw); } catch { throw new Error("Unreadable lock; inspect it manually before removing it."); }
  check(Number.isSafeInteger(lock.pid) && lock.pid > 0, "Invalid lock PID; inspect it manually");
  try { process.kill(lock.pid, 0); }
  catch (error) {
    check(error.code === "ESRCH", "Cannot establish that the writer is gone; keep the lock");
    check(fs.readFileSync(file, "utf8") === raw, "Lock changed; retry after inspecting it");
    fs.unlinkSync(file);
    return;
  }
  throw new Error("Writer process " + lock.pid + " is still running; lock retained");
}
