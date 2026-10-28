# Custom agent skills

Personal, reusable skills for coding agents. Each folder under `skills/` contains a `SKILL.md` entry point and any scripts or references it needs.

| Skill | Purpose | Requirements |
| --- | --- | --- |
| [task-mode](skills/task-mode/) | Reconcile accumulated work, route parallel worktree tasks, report progress, integrate and clean up. | T3 delegation tools, Git, Node.js; optional `airoute` CLI |
| [airoute](skills/airoute/) | Choose an account, model and reasoning effort using live quota and task fit. | Separately installed `airoute` CLI and configured T3 accounts |
| [software-factory](skills/software-factory/) | Track implementation, dependencies and human decisions in a shared task coordinator. | Separately installed/configured software-factory CLI and coordinator |
| [career-profile-builder](skills/career-profile-builder/) | Interview for a reusable private career profile and capture reviewable experience updates. | Node.js 20+; interview scripts included; dashboard commands need a separately installed career-dashboard app |
| [questioning](skills/questioning/) | Run a visual decision interview, mirrored in chat, with durable answers. | Node.js 20+, a local browser, and an agent with shell access; app included |

The T3 workflow skills depend on their host's tools. Installing instructions alone does not install their external CLIs, configure accounts, or add a native task mode. Task-mode continuity follows the agent's instructions and saved state; it does not install a per-prompt hook.

## Install

Clone the repository, then copy the desired complete skill folders into your agent's skills directory. For example, with PowerShell:

```powershell
git clone https://github.com/santistebanc/skills.git
Copy-Item -Recurse ./skills/skills/task-mode "$HOME/.codex/skills/task-mode"
```

For Claude Code, use `~/.claude/skills/` instead. Review and back up an existing installation before replacing it. Copy the entire folder, including `scripts/`, `references/` and `agents/` when present. Invoke using your host's skill syntax, such as `$task-mode` in Codex.

The Questioning skill includes its local app: `node skills/questioning/scripts/q.mjs help` lists commands. The career-profile tools can be inspected with `node skills/career-profile-builder/scripts/profile.mjs help`. Both keep personal data in user-local stores, outside this repository.

For career dashboard capture/review commands, set `CAREER_DASHBOARD_CLI` to the absolute path of the maintained dashboard's `cli.mjs` (the app is maintained under `tools/career-dashboard` in the [portfolio repository](https://github.com/santistebanc/portfolio)). This collection does not bundle the portfolio application or its data.

## Maintain

Keep custom skills in `skills/<name>/`. This repository contains reviewed public copies; existing local installations are not automatically replaced or synchronized. When changing an installed skill, bring its reusable changes here, review the diff, validate, then commit and push. Do not copy entire agent configuration directories.

```sh
npm test
```

Validation checks skill entry points, JavaScript syntax, likely credentials and machine-specific paths, CLI entry points, and task-mode state recovery tests. GitHub Actions runs the same checks on Windows and Linux.

Publish instructions, source code and synthetic examples only. Private career records, interview sessions, task ledgers, usage/account caches and credentials belong outside Git. Downloaded third-party skills and bundled provider skills are excluded; install those from their original authors.

## License

MIT. See [LICENSE](LICENSE).
