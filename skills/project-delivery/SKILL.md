---
name: project-delivery
description: Coordinate development across the owner's registered projects: claim work with thread references, checkpoint working branches, prepare verified slices, integrate exact owner-approved candidates, and prepare explicit releases using the private delivery coordinator.
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
links instead of leaving it in chat. Hand a task over with a review packet:
`delivery review draft --task ID --out FILE`, fill what it lists as missing (links,
try-it steps, acceptance status with evidence, owner questions), then
`delivery review submit --task ID --file FILE`; a bare status change to review is
rejected. Integration keeps the packet. Each task has a review level
(`auto | digest | owner`); lower one only with `delivery review level ID LEVEL --reason`.
As an independent reviewer (never of your own task or packet), `delivery review accept
--task ID --reason` completes an auto/digest task with full evidence; anything else
escalates to the owner, who accepts owner-level tasks. The `tasks` MCP tools reach the same tasks from
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
Order: first `delivery evidence --kind K --before FILE --after FILE --base SHA
--commit SHA --out evidence.json` (one file per side: media, or a plain text file
such as EVIDENCE.md), then `delivery prepare --evidence evidence.json`.
`prepare` takes only that JSON package, never a media file.

Every slice gets a change card, because the owner reads pictures first. Keep one
task, one branch, one card; split a task that grows into subtasks. Capture
before/after screenshots or a short video of each visible change with the
project's Playwright setup. `prepare` requires `--risk green|yellow|red`
(green: only the look changed; yellow: behavior changed; red: data, settings or
deleted things changed) and a one-line `--risk-reason`; git measures the size.
Write the summary in 3 to 5 plain sentences: what changed, why, what to check.
End your chat reply with the same card: risk, summary, size, evidence links.
When the repository has `docs/map.json`, update it if a main part is added,
removed or moved.

Testing policy (owner decision, task #42), for every test you add or change:
- Unit tests only for pure logic with many cases (calculations, parsers, pipelines,
  libraries). No tests that repeat the code, heavy mocks, or markup and class-name
  comparisons; test behavior.
- Integration tests at each boundary (API routes, storage, sync, CLI) against real
  local services, such as the Workers test pool or a temporary SQLite file.
- End-to-end tests only for the main user flows that handle money or keep data safe.
- Speed and frame-rate checks go only in the project's timing group, never in
  normal CI with short limits.
- Each real bug gets a test that fails before the fix and passes after it; put the
  task or bug id in the test name, and show both runs in the slice evidence.
- Each project has one test command, and CI runs it on each push.
- A test that failed 3 or more times without a real bug, and cannot be made stable
  in one hour, is deleted; record the deletion in the task.

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

Portfolio apps are those with a card in the `portfolio` project's
`src/data/projects.ts`. Each of their releases refreshes the app's README
screenshots and text from the candidate build before the release check, so the
owner approves them with the release. After the app release is published,
refresh that app's portfolio screenshot and card text from the live app, run the
portfolio checks, then commit and push portfolio `main` (this deploys the site).
The owner granted standing approval for this portfolio push; report it, don't
ask. If nothing visible or described changed, skip both refreshes and say so.

Close integrated work and run cleanup from another checkout only after thread
and process ownership are settled. Preserve unique artifacts first. Dirty,
unintegrated, active or unreachable work stays cleanup-pending; expiration never
authorizes deletion. Record cleanup disposition rather than silently retaining
obsolete branches. Repository checks and product contracts remain authoritative
for correctness; this skill supplies delivery coordination.
