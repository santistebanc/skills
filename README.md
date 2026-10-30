# Custom agent skills

Personal, reusable skills for coding agents. Each folder under `skills/` contains a `SKILL.md` entry point and any scripts or references it needs.

| Skill | Purpose | Requirements |
| --- | --- | --- |
| [task-mode](skills/task-mode/) | Reconcile accumulated work, route parallel tasks, choose suitable checkouts and isolation, report progress, and integrate results. | T3 delegation tools, Git, Node.js; optional `airoute` CLI |
| [grill-proto](skills/grill-proto/) | Explore decisions one question at a time in rich HTML, using words, inline examples, isolated prototypes, or app variants. | Inline HTML support (text fallback); runtime and worktree support for builds; subagent tools for parallel variants (sequential fallback) |

The T3 workflow skills depend on their host's tools. Installing instructions alone does not install their external CLIs, configure accounts, or add a native task mode. Task-mode continuity follows the agent's instructions and saved state; it does not install a per-prompt hook.

## Install with automatic sync

The sync tool is owned by this repository. It requires Node.js 20+ and Git, with no npm dependencies, third-party skills manager, hosted sync service or additional account. Run these commands once on each machine/environment where an agent executes (PowerShell, bash and zsh):

```sh
git clone https://github.com/santistebanc/skills.git "$HOME/my-skills"
node "$HOME/my-skills/scripts/skills-sync.mjs" install
```

The installer creates a dedicated update checkout at `~/.t3-skills/repository`, deploys the skills immediately, and schedules updates every five minutes. It discovers new skill folders added to `main` as well as updates to existing ones. The updater refreshes itself after successful deployment. Keep the initial clone for authoring; edit and push there, rather than in the managed checkout or installed copies.

Default destinations are `~/.agents/skills`, the current Codex and Claude homes, and detected `.codex-*`, `.codex_*`, `.claude-*`, `.claude_*` account homes. An existing `~/.cursor` home is included too. `CODEX_HOME` and `CLAUDE_CONFIG_DIR` are honored. Register other account/agent directories explicitly:

```sh
node "$HOME/my-skills/scripts/skills-sync.mjs" target --add "/absolute/path/to/account/skills"
node "$HOME/my-skills/scripts/skills-sync.mjs" sync
```

Each OS user, WSL distribution, container or remote execution host has its own installation. Using another browser/phone to access an already configured T3 server does not need another installation. This does not alter T3's configuration or inject instructions into existing threads. Invoke skills using the host's syntax, such as `$task-mode`; a running thread may need to reload a skill or start a fresh session to pick up changes.

### Scheduling

- Windows: a per-user Task Scheduler job runs hidden at login and every five minutes while logged in.
- macOS: a user LaunchAgent runs at login and periodically. For a headless host with cron available, use `install --scheduler cron`.
- Linux: a user systemd timer, with cron fallback when no user systemd manager is available. For a permanently running host, ensure its user manager or cron daemon runs without an interactive login; the installer does not request root or change lingering settings.

Use `install --interval 10` to change frequency, or `install --no-schedule` for manual updates. Cron intervals must divide 60. `unschedule` disables the registered job while preserving installed skills and private state. Once installed, `node "$HOME/.t3-skills/runner.mjs"` runs an immediate sync independently of the initial clone.

### Status, conflicts and recovery

```sh
node "$HOME/my-skills/scripts/skills-sync.mjs" status
```

Status reports the deployed commit, last online fetch, offline state, destinations and conflicts. Offline sync uses the cached checkout and keeps existing installations available; it does not pretend that the cached version is latest. A dirty/diverged managed checkout is preserved and reported instead of reset.

Identical existing skills are adopted automatically. Differing unmanaged copies, linked installations and locally edited managed copies are preserved as conflicts. Review and move such a conflicting folder to a safe backup yourself, then run `sync` again. Other skill names are untouched. Updates and upstream removals move the previous managed copy into private backups; removed skills with local edits remain conflicts. A journal recovers interrupted replacements, and a lock prevents concurrent sync jobs. Backups are retained until you remove them deliberately.

Use `--home PRIVATE_DIRECTORY` on every command to isolate another installation. `install --target ABSOLUTE_SKILLS_DIRECTORY --no-discover` limits deployment to explicit targets. `install --remote GIT_URL --branch BRANCH` supports another repository; private repositories use Git's existing credential helper or SSH agent, never credentials embedded in the URL.

### Privacy

Only generic installer code and skills belong in this public repository. Machine paths, account-home mappings, scheduler definitions, deployment hashes, status, logs and backups stay in `~/.t3-skills` and native per-user scheduler directories. They are not uploaded. No environment inventory or telemetry is sent anywhere; the network operation is a normal Git fetch. Installing on an always-on host is useful for its own T3 environment but is not a requirement for other devices to update.

## Maintain

Keep custom skills in `skills/<name>/`. Edit in the authoring clone, review the diff, validate, then commit and push. Configured environments pick up the update automatically. Do not copy entire agent configuration directories or private sync state into Git.

```sh
npm test
```

Validation checks skill entry points, JavaScript syntax, likely credentials and machine-specific paths, task-mode state recovery, and sync behavior (updates, new/removable skills, conflicts, crash recovery, scheduling definitions and offline fallback). GitHub Actions runs the same suite on Windows, Linux and macOS. Scheduler registration is performed by installation on each host; unit tests do not install jobs.

Publish instructions, source code and synthetic examples only. Private career records, interview sessions, task ledgers, usage/account caches and credentials belong outside Git. Downloaded third-party skills and bundled provider skills are excluded; install those from their original authors.

## License

MIT. See [LICENSE](LICENSE).
