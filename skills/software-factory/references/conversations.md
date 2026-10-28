# Conversational projects

A project with `workflow: "slices"` in `factory projects` uses durable T3 intake. The local bridge captures direct human messages from the app's T3 threads while agents are busy, stores originals on the coordinator, and reconciles cursors after restarts. Native answers to request_user_input (`creationSource=server`) count as direct human input; model-generated/MCP deliveries and inherited child input are excluded. If a human reply is missing from intake, run `factory intake-sync --thread THREAD --repair --dry-run`, then without `--dry-run`; it is idempotent and keeps the cursor. An unconfigured environment still needs its bridge installed; a skill alone is best effort.

## Prompting threads

Unless given a worker attempt, act as intake for this app. Read the current thread ID with T3, then `factory intake-sync --thread THREAD` to capture the latest input immediately. Inspect `factory intake-show` and the relevant `--id`; read original text, previous source input, existing tickets and open questions. Resolve that input through `factory intake-resolve --id ID --resolution-file FILE`. The coordinator may already be elaborating it: if a resolution conflicts, read the persisted result and reconcile missing scope with a new amendment rather than creating duplicate work.

The JSON document is `{ "summary": "human-readable interpretation", "actions": [...] }`. Actions are:

- `create`: `intent` (`request` or `idea`), `ref`, `title`, `body` with acceptance criteria. Clear requests are automatic; tentative ideas remain manual backlog.
- `update`: existing `issue`, `change` (`clarification`, `followup`, or `contradiction`), `body`; follow-ups also need a `title`. Clarifications are forwarded to the owning worker. Contradictions park it for an explicit decision. Substantial additions become follow-up tickets.
- `decision`: exact `question` ID and the human's `body`. For a native T3 question, include `answers` keyed by its original question IDs, preserving the human's choices.
- `slice`: `title`, `body` describing a bounded usable outcome and acceptance criteria, `tasks` containing new `ref` values or existing task numbers. Group related explicit tasks; keep tentative ideas outside executable slices. The slice is frozen once execution starts; later substantial work belongs to another slice.
- `question`: a material ambiguity in `body`. This persists a recoverable intake question. Once answered, resolve the answer and elaborate the original request using its intake ID.
- `discussion`: record discussion without creating work.

Resolve every distinct part of the input. Recent source history is abbreviated; read earlier intake IDs when the excerpt is insufficient. This app is the default target. Ask for clarification for another-app requests. Return created/updated ticket numbers and the slice outcome to the human. Workers execute elsewhere; prompting threads remain available for more input and questions. Call `factory poll` to accelerate ready dispatch when useful. Incoming factory status notifications only need a brief report; their MCP messages are already persisted and excluded from intake.

## Slice workers

Reuse the supplied attempt. Read `factory show N` and `factory slice-show --slice ID`. Keep the T3-bound isolated checkout and unique local attempt branch; `factory worker-prepare N --attempt ID` fetches the latest shared slice head before edits. A slice has one remote branch, one active writer per app, sequential ticket threads, and one final PR. Local attempt branches only provide worktree isolation.

Use `factory checkpoint N --attempt ID` after meaningful changes and before pausing or asking a question. It commits all worker changes, renews ownership, pushes without force, confirms the remote SHA and persists evidence. Background checkpoints also save changes after two stable observations. Failing checks still permit an unfinished recovery checkpoint. Stale ownership stops publication.

`checkpoint --runnable` runs project-owned preview checks (or project checks) and promotes only passing commits. For a web app, configure `.factory.json` `preview` with `start`, a local `url` with an explicit port, `setup`, `checks`, and optional `healthPath`. Derive commands from the app's real scripts. The start command must honor `PORT`/`HOST` or use `{port}`. Commit this configuration; runnable checkpoints carry it to other environments before merge. A CLI/library need not expose a web preview. Environment-specific URLs can override the shared URL in the prompting checkout.

After this ticket's acceptance criteria pass, run `factory implemented N --attempt ID --sha SHA --body EVIDENCE`. Earlier workers finish without a PR. The final worker retains ownership, validates the complete slice, pushes a runnable checkpoint, opens/updates the slice's PR, links it with T3, then records `factory slice-deliver N --slice ID --attempt ID --pr N --sha SHA --body EVIDENCE`. The existing repository merge policy still applies. Implementation completion satisfies dependencies inside this slice; other slices/projects wait for verified merged fulfillment.

## Human work and recovery

Use `factory questions` or `factory human --all` to recover questions on another machine. Record actual answers with `factory decide N --question ID --body ANSWER`; native answers also use `--answers-file FILE`. Multiple open questions require distinct answers before resuming the worker. If a native question is answered directly in the worker UI, record its actual callback answer with `factory decide N --question ID --body ANSWER --answers-file FILE --native-answered` before edits or heartbeats; this records the answer without sending it back to an already answered callback. Permission approvals retain their original holder; forwarding questions grants no approval authority.

`factory conversation-status` exposes unresolved intake and pending/failed deliveries. `factory bridge-status` shows the local environment's last cycle, synchronization and startup errors. Delivered messages have stable IDs and history markers for recovery after a lost response or new auth session. Intake elaboration gets at most three recovery rounds after a terminal coordinator turn, then remains held with its original input and a source-thread notice. Inspect it and use `factory intake-retry --id ID --resume` when resolved. Work attempts are never replaced just because a lease expired: stop/reconcile the old worker and use the existing release procedure.
