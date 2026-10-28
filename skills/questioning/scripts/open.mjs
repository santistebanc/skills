import { spawn } from "node:child_process";

const env = process.env;
const has = (...keys) => keys.some((k) => Boolean(env[k]));

export function attended() {
  if (env.QUESTIONING_FORCE === "1") return true;
  return env.CLAUDE_CODE_SESSION_ATTENDED !== "0";
}

export function harness() {
  if (has("CODEX_THREAD_ID", "CODEX_SANDBOX", "CODEX_CI")) return "codex";
  if (has("CURSOR_AGENT")) return "cursor";
  if (has("CLAUDECODE", "CLAUDE_CODE")) return "claude";
  if (env.TERM_PROGRAM === "vscode" || has("VSCODE_PID")) return "vscode";
  return "unknown";
}

function vscodeFamilyCli() {
  const win = process.platform === "win32";
  const cwd = (env.VSCODE_CWD ?? "").toLowerCase();
  if (has("CURSOR_AGENT", "CURSOR_LAYOUT") || cwd.includes("cursor")) return win ? "cursor.cmd" : "cursor";
  if (env.TERM_PROGRAM === "vscode" || has("VSCODE_PID")) {
    if (cwd.includes("windsurf")) return win ? "windsurf.cmd" : "windsurf";
    return win ? "code.cmd" : "code";
  }
  return null;
}

function openInEditor(url) {
  const bin = vscodeFamilyCli();
  if (!bin) return false;
  const uri = `command:simpleBrowser.show?${encodeURIComponent(JSON.stringify([url]))}`;
  try {
    const child = spawn(bin, ["--reuse-window", "--open-url", uri], {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
      shell: process.platform === "win32",
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/**
 * What the agent should do to put `url` in front of the user.
 * The script only does what a process can do; panes are the agent's job.
 */
export function verdict(url) {
  const h = harness();
  if (h === "claude") {
    return {
      harness: h,
      action: "agent-tool",
      opened: false,
      instruction:
        `ToolSearch for "select:mcp__t3-code__preview_open", then call preview_open with url "127.0.0.1:${new URL(url).port}". ` +
        `If that tool does not exist in this session, print the URL once and say nothing further about it.`,
    };
  }
  if (h === "codex") {
    return {
      harness: h,
      action: "agent-tool",
      opened: false,
      instruction:
        `Open ${url} using the host's available browser preview. Prefer T3 preview_status / preview_open when available. ` +
        `Otherwise use the documented visible in-app browser controls, or show the URL once.`,
    };
  }
  if (h === "cursor" || h === "vscode") {
    const opened = openInEditor(url);
    return {
      harness: h,
      action: opened ? "editor" : "print",
      opened,
      instruction: opened
        ? "Opened in the editor's Simple Browser."
        : "No editor CLI on PATH. Print the URL once; the session is fully answerable in chat.",
    };
  }
  return {
    harness: h,
    action: "print",
    opened: false,
    instruction: "No pane available. Print the URL once; the session is fully answerable in chat.",
  };
}
