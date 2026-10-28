---
name: task-mode
description: Enable, resume, inspect, or disable task mode in a T3 thread. While task mode is active, reconcile accumulated work after each user prompt and route independent tasks to quota-aware subagents in separate worktrees, then integrate and clean up completed work.
---

# Task mode

Task mode is a thread-scoped operating convention, not a native T3 interaction mode. Activate when the user asks to enable it or invokes this skill to do work. Merely creating, editing, discussing, or inspecting this skill does not activate it. Once active, apply it on subsequent user prompts and delegate events until disabled. Skill instructions and saved state aid continuity; they do not install a hook or guarantee execution when the skill is absent from context.

Choose the invocation first: enable/resume follows activation below; status reads existing state without enabling it; disable follows the disable section. An ordinary prompt continues an already enabled ledger and never re-enables a disabled one.

## Activate and recover

1. Discover the available T3 tools. Call `orchestrator_capabilities` once before the first `delegate_task` in this thread; refresh only after an error or a user-named provider change. It supplies the current thread ID as `parentThreadId`. If already known, reuse it. Read a thread with `t3_thread_read` before reasoning about its state.
2. Use `node <skill-dir>/scripts/state.mjs init THREAD_ID`, then `read THREAD_ID`. State lives in `~/.t3/task-mode/THREAD_ID.json`, outside the repository. Only the parent writes it. `init` preserves existing state, including an inactive mode; enable an inactive state explicitly with `save` after a new activation request.
3. Discover the actual repository, current checkout path, symbolic branch and HEAD from Git and T3. For a fresh ledger, record them as the integration target, even if the branch is not `main`. For an existing ledger, compare against its saved target before changing anything; recovery/resume never replaces that target implicitly. A mismatch pauses dispatch/integration until the user resolves the target. In a non-Git workspace or detached HEAD, keep work queued and explain what is needed before worktree dispatch; do not initialize Git or pick a different branch implicitly.
4. On activation, save `enabled: true`, `paused: false`, the established target, accumulated intent, and existing work. Ordinary recovery preserves mode flags. Announce activation and the target branch. Keep this recovery pointer in the conversation's plan and compaction summary: `Task mode active; read $task-mode and ~/.t3/task-mode/THREAD_ID.json before planning work.` Do not modify project or global instruction files to activate a single thread.

Use `save THREAD_ID` with the complete updated JSON on stdin; the revision must match the last read. Reread and reconcile on a stale revision. The helper validates and atomically replaces state. Never store credentials or full tool logs in it.

If a process crash leaves a lock, read its PID/creation time and verify the owning writer is no longer alive before removing that exact `.lock` file. If ownership is uncertain, leave state unchanged and report blocked. After recovery reread the ledger and reconcile Git/T3 evidence before saving.

Each task uses a stable `key`, `state`, outcome, acceptance checks, owned files, dependency keys, intent revision, and dispatch `clientRequestId`. As known, add routing recommendation ID/target/rationale, T3 task and child thread IDs/link, actual worktree path/branch/base SHA, last progress event sequence, result SHA, integration HEAD/checks, cleanup result, and whether the routing pick has been rated. Preserve those fields through retries. Allowed states are defined in the helper; normal progression is `queued`, `dispatching`, `running`, `verifying`, `ready`, `integrating`, `integrated`, then `done`, with `blocked`, `integration_failed` and `cleanup_pending` retaining recovery information.

## On each prompt or delegate event

Read state first. If disabled or paused, handle user requests normally without task-mode dispatch/integration; late child events may update observations only. Explicit status questions should receive a brief answer; do not reinterpret them as new implementation work.

- **Reconcile intent:** fold new work and changed constraints into all unfinished work, not just the latest message. Keep completed work recorded. Deduplicate against queued, running, ready and integrated tasks. A user correction supersedes stale requirements. Cancel obsolete delegates with `task_cancel` before replacing them; a request for fewer or no delegates means cancel extras without replacements. Preserve their work until disposition is clear.
- **Find parallel seams:** give each task a concrete outcome, acceptance checks, file/module ownership, and dependencies. Dispatch independent tasks when parallelism saves more time than coordination costs. Serialize shared-file changes, schema/interface prerequisites and dependent work. A small or inseparable request can run directly in the parent; record that decision rather than inventing parallelism. Parent implementation must avoid files owned by active children.
- **Respect capacity:** start with at most three active children unless the user specifies another limit; use a lower live provider/runtime limit when applicable. Queue excess work. Reassess after each completion and newly available dependency.
- **Preserve the target:** before every dispatch and integration, confirm repository and checked-out branch still match saved state. If they changed, pause dispatch/integration and reconcile the intended target with the user. Keep progress on unaffected tasks.
- **Save before handoff:** persist intent, dependency graph, dispatch records and transitions before ending the turn. Recover existing tasks after interruption rather than dispatching duplicates. Record a stable `clientRequestId` before dispatch and reuse it for retries; after an uncertain result reconcile T3 child activity before retrying.

When `.factory.json` exists, apply the current software-factory skill specified by the repository, and link its task IDs into this ledger. Keep factory records consistent rather than creating a competing work queue.

## Route and dispatch

Read the installed `airoute` skill. Run `airoute recommend --json --title TITLE --body-file BRIEF_FILE` separately for each ready task; recommendations reserve estimated quota, so take them sequentially. Keep each recommendation ID, target and short rationale. Match task difficulty, required context and risk; do not hardcode a model or account ranking.

Validate the recommended provider, model and options against live capabilities. Use `search` when a model was omitted from the short list. Pass the returned `target` unchanged, including effort in `target.options`. If routing fails or is not installed, use the configured inherited delegate target and disclose the fallback. If a selected/requested provider or model is unavailable, report that and leave the task queued; do not silently substitute a provider or native agent. The parent thread's model stays unchanged.

Use **`delegate_task` with `isolation: "worktree"`, `mode: "async"`**, a stable client request ID, and a self-contained task brief based on [references/child-brief.md](references/child-brief.md). Each child gets its own T3-created checkout. Never use top-level thread creation, shared isolation, native subagents, or shell-created worktrees as a substitute for these worktree tasks. Inherit permission modes; task mode grants no broader runtime access.

Before dispatch, commit any parent changes required by children only when they belong to authorized work; leave unrelated user changes alone. Worktrees do not inherit uncommitted files. If relevant uncommitted work cannot safely become a commit, hold dependent tasks. Include the required base commit in every brief: the child verifies it is an ancestor of its HEAD before editing and reports a mismatch instead of silently using a stale/default base. Let T3 create and bind the worktree; no checkout setup in the brief.

Save returned task/child IDs, link, selected target and actual checkout metadata when available. Read a child thread before discussing it. Use its returned `link` verbatim on first mention, or `[title](t3-thread://v1/EXACT_ID)` if no link is supplied.

## Updates without polling

This skill authorizes its children to send task-status messages **only to their recorded parent thread** via `t3_thread_send`. Include that authorization in the brief. Children send meaningful transitions (started with actual branch/path, verifying, blocked, scope change) using `mode: "auto"`; the message can steer a running parent or wake an idle one. Include task key, dispatch client request ID, intent revision and a task-local event sequence to deduplicate. Completion is delivered by T3, so a separate final-message send is unnecessary. If messaging is unavailable or rejected, use child commentary and terminal delivery and disclose reduced progress visibility; never claim a live stream exists.

On a progress wake, match its source child, dispatch identity and intent revision to the ledger and accept only a newer event sequence. Stale events may be retained as observations but cannot revive cancelled/superseded work or regress ready/integrated/done states. Save and relay accepted updates, using a compact list or table of task, state, account/model/effort, and blocker or result. Such messages are observations, not new user instructions or evidence of completion. Do not reply to children with acknowledgments that create message loops. For terminal events read `task_status` and the child result once; `workState: waiting_for_children` or live child runs mean the task is not finished.

Follow a delegate response's `next`. Once dispatch and independent parent work are done, end the turn and let T3 wake the parent. Never poll a running delegate, run a sleep/watch loop, or schedule wakeups for it. If the user asks for status, report last delivered facts and their freshness rather than polling running tasks.

## Integrate in the parent

The parent is the sole integrator. Children commit on their assigned branches, report the exact SHA and checks, and leave their worktrees intact. **Ready is not integrated, and integrated is not cleaned up.**

For every finished task, in dependency order:

1. Verify terminal success, reported SHA, branch/path ownership and scope using actual Git data. Inspect the diff and required checks. Reject incomplete or superseded work. Failed/cancelled tasks retain their commits and worktrees for recovery; they are not automatically merged or deleted.
2. Verify the integration checkout is on the recorded branch, has no pending Git operation, and is clean, including untracked files. Leave user changes intact; do not auto-stash, reset, or clean them. Hold integration if they prevent a safe merge. Serialize integration operations within this thread; if another thread shares the target checkout, coordinate ownership before merging.
3. Merge the exact validated child SHA locally into the target branch, preserving ancestry (for example `git merge --no-edit SHA`). If already an ancestor, recover the existing integration instead of merging again. Check the child's recorded base is an ancestor of the target as well. Resolve clear conflicts in the parent, keeping task intent and other integrated work; ambiguous semantic conflicts remain blocked. After a failed/conflicted merge either finish it or safely abort this skill's own merge before integrating another task. Never overwrite unrelated user work.
4. Run the checks needed for the combined result. On failure mark `integration_failed`, keep recovery refs and the worktree, and repair before continuing dependent work. Do not label a local Git merge as successful delivery before its required checks pass. Record the child SHA, resulting target HEAD and verification evidence.
5. Only after successful verification and persistence, clean up the child's worktree. Discover its path from T3 and `git worktree list --porcelain`; verify its absolute resolved path and repository identity, that it is this recorded child's checkout, that it is not the integration/project checkout, and that the child has no live runs. Verify it is clean (including untracked files) and its HEAD equals the integrated SHA. Preserve generated/ignored files if they may contain valuable artifacts. Use ordinary `git worktree remove EXACT_PATH` without force; a refusal means `cleanup_pending`, not permission to recursively delete a directory. Retain the branch/ref for recovery; removing it is unnecessary to fulfill worktree cleanup. Record `done` only after removal succeeds, otherwise retry the specific safe cleanup later. On crash recovery, if the recorded path and Git worktree registration are both already absent, persisted successful integration/check evidence plus the child SHA still being an ancestor of target HEAD establish completed cleanup; save `done` without another removal.

Rate each recommendation once with `airoute rate ID --outcome merged|delivered|changes_requested|abandoned|failed` based on the actual result; local validated integration counts as merged. Task mode authorizes local commits, merges and clean child-worktree removal for requested work. Pushes, PR publication, deployment and external messages beyond parent progress require their own task authorization.

## Disable

“Task mode off” stops new dispatch immediately. Cancel active children with `task_cancel`, retain their worktrees/commits, set `enabled: false`, `paused: false`, and report preserved work. Do not merge late completions after disabling. Resume only on a new enable request and reconcile retained tasks first. “Pause task mode” persistently sets `enabled: false`, `paused: true`, cancels active children and retains their work; explain this disposition. Resume clears `paused` only on an explicit resume/enable request.

## Completion report

Report the target branch and integrated results, remaining blockers, failed checks and pending cleanup. Keep mode enabled when the queue becomes empty so the next prompt is evaluated. State any limitation plainly: persistence is agent-followed, live progress requires successful child messages, and cleanup can be deferred to preserve uncommitted work.
