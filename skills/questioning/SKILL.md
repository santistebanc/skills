---
name: questioning
description: Run a grilling session in a visual UI, mirrored to chat. Use when the user says /questioning, asks to be questioned or grilled visually, or wants an in-flight grilling session moved into the UI.
---

# Questioning

Run a design interview through the local Questioning app. The browser and chat show the same session; the app owns durable questions, answers, explanations, and pending events. You supply the reasoning and publish decisions. The app does not run an AI independently.

## Start or resume

```text
questioning start --workspace <absolute-workspace> --brief-file <file>
questioning resume <session-id>
```

Write the user's opening request to the brief file. Without a topic, omit the brief; the user can enter it in the UI. `start` attaches to an unfinished workspace session, recovering its server if necessary. Use `--new` only when the user wants a separate interview. `resume` restores the exact saved session, including pending requests; finished sessions stay read-only.

Keep the returned `sessionId`. **Pass `--session <id>` on every subsequent command**, even if your working directory changes. Commands return JSON. Workspace paths are normalized, but session IDs are the authoritative identity.

If `questioning` is unavailable on PATH, use `node scripts/q.mjs` from this skill folder as the equivalent command prefix. This distribution includes the local app in `scripts/` and `ui/`; copy the complete skill folder. Sessions share the user-local store selected by `QUESTIONING_HOME` (default `~/.questioning`). Keep the included app separate from the user's project.

Open the returned `url` using the available host browser:

- **T3 preview tools:** call `preview_status`. For an attached automation-capable tab, use `preview_navigate` with `target: { "kind": "environment-port", "port": <returned port> }`. Otherwise initialize with `preview_open`, then navigate using that environment-port target. Verify the tab is visible and shows this session's questions. A closed preview is not an unavailable browser. Follow actionable errors; use a fallback only when the tools are absent or explicitly unavailable.
- **Codex in-app browser:** use documented visible browser controls. With `mcp__cua_repl`, `await cua.createBrowserTab("iab", url, { visible: true })` opens visibly. Reuse a matching existing tab when available. Follow the tool's first-call rule.
- **Other hosts:** follow the returned `instruction`, or show the URL once when there is no browser integration. The session remains answerable in chat.

One short launch message is enough. Do not narrate polling or browser retries.

## Commands

All session commands below take `--session <id>`.

| Command | Purpose |
|---|---|
| `status` | Current tree, `revision`, agent status, and pending-event count; works offline |
| `publish --file <tree.json> --revision N [--ack CURSOR]` | Replace the full tree with a version check; optionally acknowledge completed events atomically |
| `wait [--timeout MS]` | Receive pending events without consuming them; default 50s, maximum 60s |
| `ack --through CURSOR` | Acknowledge a fully handled batch when no tree update is needed |
| `answer --id Q --text T [--option O] [--accepted]` | Record an answer given in chat |
| `ready [--ack CURSOR]` | Offer Finish / Keep going once no open questions remain |
| `heartbeat` | Report agent activity during extended work |
| `transcript` | Read settled answers, including after closing or stopping the app |
| `stop` | Stop the app while retaining the interview |
| `end` | Close the interview |

`questioning sessions` lists interviews. `questioning doctor <id>` diagnoses the server; `--repair` restarts it safely. Keep these operational details out of the interview unless recovery is needed.

## The interview loop

1. Read `status` before changing the tree. Work from the **current** answers and `revision`, including on reconnect.
2. Publish the complete frontier: every question whose dependencies are answered. Publish newly unblocked questions as soon as an answer makes them askable. Preserve all existing node IDs and question numbers.
3. Mirror new decisions and option explanations as readable chat text using their stable Q numbers, following the host's channel rules. Keep the interactive controls in the Questioning page.
4. Call `wait` with a tool timeout slightly above the requested poll duration. After an empty timeout, poll again without announcing it. If the call is interrupted, call it again: events remain pending.
5. Handle every event in the returned batch. Publish the resulting tree with the latest `--revision` and **`--ack <cursor>`**. This commits the update and acknowledgment together. For completion that needs no tree update, use `ack` only after handling the batch. Never acknowledge a request before fulfilling it.

`wait` may return `needsAction: "publish_or_ready"`: the active session has no open questions. Choose and publish a meaningful follow-up, or call `ready` if the interview is complete. Do not leave it polling an empty frontier. The UI's connection status does not generate questions for you.

If publishing fails with status 409, read `status` again and reconcile with the newer answers before retrying. Do not blindly overwrite a newer tree. Repeated events are expected after interruptions: use stable IDs and current state to avoid creating the same follow-up twice. An already fulfilled explanation request needs no second response; acknowledge the replay.

For extended work between polls, call `heartbeat` periodically when tool access allows. The UI distinguishes an available app from a connected AI. If the app is stopped, the next session command restarts it; the previous port is reused when available. Use the returned URL if recovery needs a different port. Never create a replacement session to fix a disconnected server.

## The tree

```json
{
  "revision": 4,
  "nodes": [
    {
      "id": "q-store",
      "title": "Where state lives",
      "dependsOn": [],
      "status": "frontier",
      "prompt": "Where should the tool store interview sessions?",
      "context": "Background, shown behind a Context toggle.",
      "options": [
        {
          "id": "central",
          "label": "Central folder in your home directory",
          "explanation": "Choose this for a personal tool used across projects. Sessions stay out of your repositories and avoid accidental commits. This fits your individual workflow; workspace storage becomes preferable if teammates need the same interview history."
        },
        {
          "id": "workspace",
          "label": "Inside each project workspace",
          "explanation": "Choose this when the session should travel with the project. Teammates can share the decision history, at the cost of extra project files and deciding what belongs in version control."
        }
      ],
      "recommendation": { "optionId": "central", "text": "Central storage fits your personal workflow and keeps interview notes out of project commits." },
      "docs": []
    },
    { "id": "q-retention", "title": "Session retention", "dependsOn": ["q-store"], "status": "blocked" }
  ]
}
```

Use the revision read from `status`, not the example value. Publish **every node**: the tree is replaced, not merged. Answers and numbers survive by ID. Use `clearAnswer: true` only when an answer no longer holds. Dependencies must reference existing nodes without cycles. Blocked nodes may contain only a title and are hidden from the user.

- Write full, clear questions and concrete option labels. Put substantial background in `context`.
- Give **every option** a Markdown `explanation`: when to choose it, benefits, costs, and a relevant example where useful. The separate **Why choose this?** toggle never selects the option.
- Give the recommended option the strongest justification. Connect it to the user's goals and constraints, explain its fit relative to alternatives, and say what would change the recommendation. `recommendation.text` provides a concise reason.
- Always give a recommendation. For open questions, omit `options`; `recommendation.text` is the proposed answer and `context` explains why. The UI offers Accept / Edit this and a custom field.
- The custom field is always present. Do not add "Other" or "I'll type it myself" as an option.
- After an answer is saved, the board keeps that question and its selected choice visible and expands the next unanswered question automatically. Questions already expanded remain open, including their drafts. This also applies to answers recorded from chat.
- Answered questions retain their original question and selectable options. The saved choice has the selection outline and checkmark; another click revises it immediately. Recommendation badges do not add an outline. Free-text answers can be edited directly. Finished sessions remain read-only.
- The question's small help icon requests an AI explanation. Its tooltip and accessible label explain the action; the generated explanation appears inline.
- Resolve factual questions yourself through the repo or available research tools. Ask the user for decisions.

## Events and chat

- **`brief`:** the user wrote or changed the brief. Reconsider the tree when `revised` is true.
- **`answer`:** use the latest saved answer, publish newly unblocked questions, and keep the remaining frontier.
- **`revise`:** a settled answer changed. `affected` lists answered dependents. Decide which still hold; clear only those that no longer do. Explain dropped answers in one line.
- **`elaborate`:** the user clicked **Explain question** or **Explain further**. Clarify what decision the question asks for, why it matters here, unfamiliar terms, a concrete example, and how the alternatives change the outcome. Deepen an existing explanation instead of repeating it. Keep the question's meaning, IDs, dependencies, recommendation, and answers intact. Publish the full tree with `explanation: { "requestId": "<event.requestId>", "text": "<Markdown explanation>" }` on that node and acknowledge the batch. Only a nonempty matching response completes the request. It may concern an answered question; this never reopens it. Mirror the clarification under its existing Q number.
- **`keep_grilling`:** continue with meaningful unresolved decisions.
- **`confirm`:** acknowledge the event, post one completion line, and stop.
- **`abort`:** acknowledge the event, say it ended without settling everything, and stop.

The Questioning browser page is the interview's interactive UI. **Do not use `request_user_input` or `request_user_input_async` to mirror interview prompts.** Those tools create separate host question cards that do not have this app's expansion, revision, or selection behavior. Accept free-form answers typed in chat and record them with the CLI.

Mirror questions with readable prompt text, option explanations, and recommendation in the channel allowed by the host. If ongoing commentary cannot contain questions, provide a declarative recap of the decisions and choices while the full questions remain in the browser. Do not replace the custom app with native question cards. Example:

```text
Q3 — Where state lives: <full prompt>

a) Central folder — <explanation>
b) In the workspace — <explanation>

Recommended: (a), because <reason tied to this interview>.
```

Accept loose chat references such as "3: central" or "use the central one" and record them through `answer`. Confirm UI answers in one line, such as `Q3 → Central folder`. If a settled answer changes, treat it as a revision. After launch, chat contains questions, requested clarifications, and brief confirmations; do not announce that you are waiting.

## Finish and documentation

When there are no meaningful unresolved decisions, call `ready`, acknowledging the processed batch if appropriate, then `wait` for Finish / Keep going. Ready rejects a tree with open questions; settle them first. Do not invent extra questions to keep a session running.

If the workspace has `CONTEXT.md` or `docs/adr/`, apply domain-modeling as decisions settle, but write proposed documentation into `<session>/staged-docs/`. List repo-relative paths in each node's `docs`. Revisions may invalidate these proposals; do not write them to the project during the interview. Show the staged diff and obtain approval before writing it to the repo.

On finish or abort, close only this session's browser tab if a documented tab-close action is available; otherwise leave the saved board open. Never close unrelated tabs or the whole browser. Do not start implementation when the interview ends; that requires a new user request.

For a handoff from an existing chat grilling session, publish its current tree, then record already settled answers with `answer`. Keep open questions on the frontier. Nothing needs to be re-asked.
