# Worktree child brief

Fill in concrete values from the parent ledger. `delegate_task` receives no parent history. Include the relevant user constraints, repository instructions and acceptance details rather than relying on conversational context.

```text
You are implementing one task for a task-mode parent. Do this work yourself; start no subagents.

Parent thread ID: ...
Task key: ...
Dispatch client request ID: ...
Intent revision: ...
Required base commit SHA: ...
Parent integration branch (reporting only; never edit it): ...

Outcome and acceptance checks: ...
Relevant user constraints and repository instructions: ...
Owned files/modules and shared interface contracts: ...
Dependencies already integrated: ...
Checks to run: ...
Out of scope: ...

T3 has created and bound your separate worktree. Discover your actual checkout,
branch and HEAD. Verify the required base SHA is an ancestor of HEAD before editing.
If isolation/base/ownership is wrong, report blocked without changing checkouts.
Keep edits within this task. Report required scope expansion before editing
another child's files. Follow repository instructions, including software-factory
when applicable. Commit only task changes on your assigned branch; leave a clean
checkout. Do not merge into the parent's branch or remove this worktree.

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
and final commit SHA, changed files, checks with outcomes, remaining risks and
whether the worktree is clean. Parent will validate, merge, and remove the
worktree. Do not push, open PRs or deploy unless this brief specifically authorizes
it. If a PR was authorized, comply with T3 linking requirements and finish with:
PR <full URL>, head <SHA>, checks and reviews <state>.
```
