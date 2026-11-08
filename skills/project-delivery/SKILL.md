---
name: project-delivery
description: Coordinate development across the owner's registered projects: claim work with thread references, checkpoint working branches, prepare verified slices, integrate exact owner-approved candidates, and prepare explicit releases using the private Beelink delivery coordinator.
---

Use `delivery --help`, `delivery projects` and `delivery work --project ID` before
starting registered project work. Short work records are the normal context;
read their linked threads only to resolve overlap, stale ownership or unclear
intent. `delivery threads --project ID` finds historical thread references without
loading transcripts. Keep the full thread link, ID and environment in each claim.

Planned work lives in tasks: `delivery tasks --project ID --ready` lists what can
start, `delivery task show|why ID` gives context and blockers. Pass `--task ID` to
`delivery start` when a claim attempts a task. Record decisions and handoffs with
`delivery task note`, and add discovered work as tasks, subtasks or `blocked_by`
links instead of leaving it in chat. Integration moves a task to review; only the
owner's acceptance marks it done. The `tasks` MCP tools reach the same tasks from
any project; search before creating, pass your thread id on writes, and set
`owner_requested` only when the owner asked for that task (others land in `inbox`).

Work on `wip/` branches. Claim a specific task with `delivery start` before edits.
Commit intended changes frequently; installed post-commit hooks push checkpoints
and confirm the remote SHA. A failed push is local work, never published work.
Use `heartbeat` during work; after a long pause use `resume`, which rejects a
replaced owner. An unavailable coordinator permits existing local work but blocks
new coordinated claims, integration and publication.

For an identifiable feature or fix, enqueue the configured slice checks and
prepare its acceptance evidence. Show the owner comparable before/after videos
for interactions, screenshots for static changes, or inspectable nonvisual
results where appropriate. Explain absent baselines. Link the evidence, expected
behavior, dependencies, failures and limits in `delivery prepare`.

Slice preparation is automatic; integration requires the owner's explicit
approval of that exact candidate. Record its reference with `approve`, then
`integrate`. Changed source, policy or integration base requires new checks and
approval. WIP and slice integration never publish a public version. Approval
commands are operated only after an actual owner instruction; they cannot infer
consent from a passing test or this standing workflow authorization.

Releases start on owner request. Offer unreleased slices with evidence and
dependencies; default to all. A subset is a separately assembled and verified
candidate, not arbitrary cherry-picking. Run configured heavy checks, obtain
candidate approval, then create the release PR. Publish only after the approved
PR is merged, using project-specific destinations and artifact identity. Retain
partial destination results and retry only unfinished publication.

Close integrated work and run cleanup from another checkout only after thread
and process ownership are settled. Preserve unique artifacts first. Dirty,
unintegrated, active or unreachable work stays cleanup-pending; expiration never
authorizes deletion. Record cleanup disposition rather than silently retaining
obsolete branches. Repository checks and product contracts remain authoritative
for correctness; this skill supplies delivery coordination.
