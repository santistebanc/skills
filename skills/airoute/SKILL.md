---
name: airoute
description: Pick the T3 account, model and effort for a task from live Claude Code and Codex quota. Use before starting or delegating non-trivial work, when choosing a target for a factory job or subagent, when a thread's model looks wrong for its task, and after a task to rate the pick.
---

# airoute

`airoute` ranks every T3 account × model × effort for a task. It uses live 5h and weekly quota, reset times, reset credits, task type and past ratings. Output with `--json` is stable.

## Pick a target

```sh
airoute recommend --json --title "TITLE" --body-file TASK.md [--repo OWNER/REPO --issue N] [--source THREAD]
```

- `target` is a T3 selection: `{ providerInstanceId, model, options }`. Pass it unchanged to `delegate_task` `target`, or to a factory job.
- Keep `id`. Rate the pick with it later.
- `reasons` and `warnings` explain the pick. Report them in one short line.
- `--allow codex,claudeAgent_claude_mush` limits accounts. `--models` limits models. `--dry-run` records the pick without reserving quota.
- Unrated picks reserve their estimated quota for 3 hours. Parallel jobs therefore spread across accounts.

## Suggest a model switch in a thread

At the start of a substantial task, run `airoute recommend --json` with the task text. Read the current selection with `t3_thread_configuration`. Suggest a switch when one of these is true:

- The current account has under 10% weekly quota left, or under 15% of its 5h window and the task is large.
- The pick's score is at least 1.3 times the score of the current account and model.
- The task is `quick` or complexity 1 and the thread uses a frontier model, such as `claude-fable-5-1` or `gpt-6-astra`.

Give the human one line: the suggested `account / model / effort` and the main reason. Switch with `t3_thread_configure` only after the human agrees. Do not switch automatically in an interactive thread.

## Rate after the task

```sh
airoute rate ID --outcome merged|delivered|changes_requested|abandoned|failed [--score 1-5] [--note TEXT]
```

- `merged` = 5, `delivered` = 4, `changes_requested` = 3, `abandoned` = 2, `failed` = 1. `--score` overrides.
- Rate on the machine that made the pick. History is local to each machine.
- Rating also measures the quota the task spent. Later estimates for that account use it.

## Rules

- airoute never reads or refreshes OAuth tokens. Usage comes from T3's provider caches, `codex app-server` and `claude -p "/usage"`.
- If airoute fails or is not installed, keep the configured default target. Do not block the task.
- `airoute status` shows quota for a human. `airoute history` shows recent picks.
