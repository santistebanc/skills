---
name: software-factory
description: Track implementation work and human decisions in the shared factory database for projects containing .factory.json, including ordinary coding requests without ticket numbers and requests asking what work a human can do.
---

Tickets live on the coordinator, not in GitHub Issues. Use `factory show N --repo OWNER/REPO` to resolve a task; its number is independent of PR numbering. Never use `gh issue` commands to track factory work.

For a project using `workflow: "slices"` in `factory projects`, or an intake/slice/bridge dispatch, read [conversational workflow](references/conversations.md) and follow its prompting-thread or supplied-worker role. It replaces the per-ticket PR procedure below for that project. Other projects retain the legacy workflow.

Use `factory --help` for command arguments. Output is JSON. The installed global instruction gives the CLI path when `factory` is absent from an existing session's PATH.

Before interactive implementation, run `airoute recommend --json --title TITLE --body-file TASK.md` with the task text. Keep the pick ID. Follow the airoute skill to suggest a model switch; switch only after the human agrees. If airoute is unavailable or fails, keep the configured target and continue. When delegating without a fixed target, pass the returned `target` unchanged to `delegate_task`, including its options.

For an implementation request, run `factory context --request TEXT` before editing. Inspect likely matches with `factory show N`. Link the request with `factory ensure --issue N --title TITLE --body SCOPE --source THREAD`, or create a new task with scope and acceptance criteria. Use a stable request `--key` when retrying. Explicit implementation is eligible for automatic dispatch once ready; ideas inferred during work use `--inferred` and stay backlog. Read-only discussion and scheduler/worker bookkeeping need no new task. Initialize unconfigured repositories only when the human requests factory adoption.

Claim the chosen task with `factory claim N --interactive --owner THREAD` before editing. In T3, include `--environment ID --thread THREAD --selection-file FILE` using the current environment and actual thread configuration, so the ticket retains its execution provenance and the bridge can save its isolated worktree. Reuse a supplied worker attempt instead of claiming again. A conflicting claim means the other worker owns implementation: record the new request on its task, coordinate via T3, and avoid a second implementation. Keep the attempt ID. Renew with `factory heartbeat` at checkpoints and immediately before pushing; a stale-attempt error stops publication. Run in a T3-bound isolated worktree for unattended implementation. Automatic workers use `factory/N-ATTEMPTPREFIX` branches; interactive delivery uses the same convention.

Keep accepted decisions, progress and validation evidence in `factory note`. For a question requiring the human, use `factory ask` with the owning attempt and concrete options, then hand off. For “what work is there for me?”, run `factory human --all`, prioritize human actions blocking other work, and read the selected task. Record the human's actual answer with `factory decide`; report the persisted result. A fresh thread must be able to resume from the task without the original transcript.

Use database dependencies via `factory depend`. `factory split` creates backlog subtasks; adjust the original scope to avoid overlap. `factory supersede` preserves absorbed scope and reconnects blockers; stop/reconcile any old worker first. Do not infer fulfillment from a canceled or duplicate task.

To revise task details or its executor/dispatch permission, read `factory show`, then use `factory edit --version VERSION` with the requested fields. A claimed task also requires its owning attempt. Version conflicts require rereading; inferred work remains manual backlog unless the human authorizes execution.

After implementation, run project checks, open/update one PR, link it with T3's `link_pull_request`, and record `factory deliver` with attempt, PR number, current head SHA, commands/results and limitations. Deliver hands off to human review. Humans decide merges. The parent T3 coordinator owns PR watches; child workers return the PR URL, head SHA, pending checks and review state. Reconciliation closes a task only after verified merged delivery, or an accepted human deliverable. Expired/ambiguous attempts remain quarantined until their old worker is confirmed stopped with `factory release` and evidence.

After `factory deliver`, rate an interactive pick with `airoute rate ID --outcome delivered` on the machine that made it. Scheduler picks are rated by the coordinator; workers must leave those ratings to it.

The installed local bridge provides durable capture for opted-in conversational projects. Other ordinary sessions use best-effort skill intake; no universal T3 pre-prompt hook is installed. Mention missed intake explicitly and repair its task record when discovered.
