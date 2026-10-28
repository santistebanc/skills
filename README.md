# Custom agent skills

Personal, reusable skills for coding agents. Each folder under `skills/` contains a `SKILL.md` entry point and any scripts or references it needs.

| Skill | Purpose | Requirements |
| --- | --- | --- |
| [task-mode](skills/task-mode/) | Reconcile accumulated work, route parallel tasks, choose suitable checkouts and isolation, report progress, and integrate results. | T3 delegation tools, Git, Node.js; optional `airoute` CLI |

The T3 workflow skills depend on their host's tools. Installing instructions alone does not install their external CLIs, configure accounts, or add a native task mode. Task-mode continuity follows the agent's instructions and saved state; it does not install a per-prompt hook.

## Install

Clone the repository, then copy the desired complete skill folders into your agent's skills directory. For example, with PowerShell:

```powershell
git clone https://github.com/santistebanc/skills.git
Copy-Item -Recurse ./skills/skills/task-mode "$HOME/.codex/skills/task-mode"
```

For Claude Code, use `~/.claude/skills/` instead. Review and back up an existing installation before replacing it. Copy the entire folder, including `scripts/`, `references/` and `agents/` when present. Invoke using your host's skill syntax, such as `$task-mode` in Codex.

## Maintain

Keep custom skills in `skills/<name>/`. This repository contains reviewed public copies; existing local installations are not automatically replaced or synchronized. When changing an installed skill, bring its reusable changes here, review the diff, validate, then commit and push. Do not copy entire agent configuration directories.

```sh
npm test
```

Validation checks skill entry points, JavaScript syntax, likely credentials and machine-specific paths, and task-mode state recovery tests. GitHub Actions runs the same checks on Windows and Linux.

Publish instructions, source code and synthetic examples only. Private career records, interview sessions, task ledgers, usage/account caches and credentials belong outside Git. Downloaded third-party skills and bundled provider skills are excluded; install those from their original authors.

## License

MIT. See [LICENSE](LICENSE).
