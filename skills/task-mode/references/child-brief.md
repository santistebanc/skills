# Child task brief

Fill in concrete values from the parent ledger. `delegate_task` receives no parent history. Include the relevant user constraints, repository instructions and acceptance details rather than relying on conversational context.

```text
You are implementing one task for a task-mode parent. Do this work yourself; start no subagents.

Parent thread ID: ...
Task key: ...
Dispatch client request ID: ...
Intent revision: ...
Workspace arrangement (current/shared, reused, or new isolated worktree): ...
Expected checkout path/branch, if known: ...
Required base commit SHA (if relevant): ...
Integration destination: ...
Commit ownership (parent or child; serialize shared-checkout Git operations): ...
Worktree created/owned by this task and cleanup disposition: ...

Outcome and acceptance checks: ...
Relevant user constraints and repository instructions: ...
Owned files/modules and shared interface contracts: ...
Dependencies already integrated: ...
Checks to run: ...
Out of scope: ...

Use the workspace bound by T3 for the arrangement above. Discover your actual
checkout, branch and HEAD. Verify any required base SHA is an ancestor of HEAD.
If checkout/base/ownership differs from the brief, report blocked without
changing checkouts. In shared workspaces, preserve unrelated uncommitted work
and use only the assigned files; coordinate Git index/commit/branch operations.
Keep edits within this task. Report required scope expansion before editing
another child's files. Follow repository instructions, including software-factory
when applicable. If assigned commit ownership, commit only task changes;
otherwise leave a scoped diff for the parent. A shared checkout may contain
unrelated changes; do not clean them. Parent handles integration and cleanup.

This skill authorizes task-status messages solely to the parent thread above.
At meaningful transitions send t3_thread_send(threadId=PARENT, mode="auto",
message="[task-mode TASK_KEY dispatch DISPATCH_ID revision REV event N] STATE: evidence/blocker; actual branch/path when known").
Send started, verifying and blocked transitions once each when they occur;
send a scope-change update if needed. Keep N monotonically increasing.
If the tool is unavailable/rejected, use commentary and include the limitation
in the final result. T3 delivers completion automatically; do not send a second
final wake. Do not poll, create wakeup timers, or wait for parent acknowledgments.

On a blocker, preserve work and report the precise missing input. On completion
report task key and intent revision, actual branch, absolute worktree path, base
and final commit SHA or uncommitted scoped diff, changed files, checks with
outcomes, remaining risks and checkout cleanliness. Parent validates and merges
only when needed, and removes only task-owned temporary worktrees selected for
cleanup. Do not push, open PRs or deploy unless this brief specifically authorizes
it. If a PR was authorized, comply with T3 linking requirements and finish with:
PR <full URL>, head <SHA>, checks and reviews <state>.
```
