# Quota checks and T3 handoff

Check while the agent can still act. Provider session/weekly percentages are quota telemetry, not exact token counts or context-window usage. Limits can change or be consumed by other threads sharing an account.

## Policy and measurements

Save policy and observations under `quota` in the parent's private ledger. Defaults: enabled, reserve **20% of the five-hour window and 10% of the weekly window**, snapshots no older than five minutes, at most three successful coordinator handoffs per user request, and ten minutes between proactive handoffs. The user may change these. Explicit quota failures can bypass the time interval but not the attempt bound. Count attempted destinations as well: try an account only once per incident, and stop after three attempts even if configuration/continuation fails. A new human work request or confirmed quota reset can begin a new incident; progress messages and continuation wakes cannot reset limits.

Keep an optional account allowlist, actual account-wide exclusions and reset evidence, last check time, attempts and handoff history. Preserve stricter user provider/model preferences. Only already configured, enabled, authenticated accounts with adequate verified capacity are eligible; this does not authorize adding accounts, purchasing credits, redeeming reset credits, changing permissions or using a paid fallback not already authorized.

1. Read the coordinator selection with `t3_thread_configure` (without a modelSelection). For a child, use that child's actual selection, not the parent's assumed default. Use `airoute status --json --live auto` for fresh usage. If its snapshot is too old, try one refresh with `--live always`; if still unavailable, checkpoint and report unknown usage rather than inventing headroom. If airoute is unavailable, accept equivalent provider-reported telemetry with timestamps, but do not claim this helper can fetch it itself.
2. Feed the account/usage array into the helper, keeping raw snapshots outside the repo:

   ```sh
   airoute status --json --live auto | node <skill-dir>/scripts/quota.mjs --current INSTANCE_ID
   ```

   It accepts `--input PRIVATE_FILE`, `--exclude ID,ID`, reserve overrides, and estimated next-operation cost in percentage points via `--next-session-cost` and `--next-weekly-cost`. Output contains sanitized quota assessments and eligible account IDs, not email addresses or account homes. It never switches or writes T3 state.
3. Trigger a proactive handoff if either remaining quota is at/below its reserve, or a credible estimate for the next operation would cross it. Check again after expensive work and before starting a long indivisible step; split that step or hand off earlier when necessary. Idle threads require no periodic self-wake or polling loop. Do not switch just because a response is slow, a test fails, an approval is pending, or a transient rate limit occurs without exhaustion evidence.
4. Exclude **all aliases of the depleted account**, not just the current model. The helper groups aliases with matching provider kind/email, or an explicit `quotaGroup` from trusted telemetry. Configure a shared group explicitly when that identity is not observable. Both quota windows must be fresh and sufficient on the destination. Do not assume a past reset timestamp means fresh quota; obtain a new reading.
5. Run `airoute recommend --json --allow ELIGIBLE_IDS --title TITLE --body-file PRIVATE_REMAINING_WORK_BRIEF` to choose the account/model/effort for the *remaining* coordinator/child work. Reassess that pick against a new quota snapshot and its cost estimate before using it; a bare reserve check does not establish that a large operation will fit. Validate provider/model/options with T3 capabilities and preserve user restrictions. If no pick fits, reduce the next bounded step or save `blocked` and explain the reset/unknown capacity; do not rotate through an empty pool or reuse the exhausted account. A routing error/unavailable model remains visible; no silent native-agent or CLI fallback.

## Coordinator: proactive same-thread continuation

Use T3's same-thread selection and portable handoff rather than making a new top-level thread. This skill authorizes quota continuation messages to the current thread. It does not activate itself merely because someone is editing the skill.

1. Reach a safe boundary. Finish or record in-flight operations, leave file changes intact, and persist intent, current branch/path/HEAD, uncommitted task changes, checks and failures, outstanding tools/background processes, active delegate IDs and pending questions. Do not mark unfinished work complete or stop independent children solely to change the coordinator.
2. Save `quota.pendingHandoff` with a stable ID, incident ID, source and destination selections, measurement timestamp/reason, recommendation ID, progress checklist, remaining work and a unique continuation `clientRequestId`. Phase is `prepared`. Record attempts *before* configuration so a crash cannot erase them. Keep checkpoint material in the private ledger; it supplements T3 history and survives a failed switch.
3. Call `t3_thread_configure` for this thread with `modelSelection`. Map the recommendation's `providerInstanceId` to `instanceId`; pass its model, and convert object options into `[{ id, value }]` when needed by T3. Preserve permission/interaction modes and workspace. Read back and verify the exact selection, then save phase `configured`. This sets the selection for a subsequent turn; it does not move the currently executing model into a new account mid-response. If the installed T3 version rejects a live change, stop and report the prepared handoff; do not claim automatic switching succeeded.
4. Queue **one** continuation using `t3_thread_send` to the same thread with `mode: "queue"` and the saved client request ID. State: `Resume $task-mode handoff HANDOFF_ID. Read the private ledger and checkpoint; reconcile current intent, files, active delegates and prior side effects, then continue only unfinished work. Verify the selected account/model/effort before work.` Save returned message/run IDs and phase `queued`, then end the turn. Use neither self-restart nor self-interrupt: the outgoing turn must finish cleanly, and active children must survive. If the queue result is lost, inspect the thread queue once and reconcile by request/message/handoff ID before retrying.
5. On the continuation turn, first verify the actual configuration and read the checkpoint. Mark the handoff `resumed` with its ID in history and clear pending only after preserving that record. Reuse the same task/delegate records and workspace. Read missing context from T3 history when needed; portable handoff is bounded and does not transfer internal reasoning, native tool state or attachments. Reconcile outcomes before repeating side effects. Check quota again, applying the existing incident/cooldown rather than immediately switching back to the prior account.

If configuration succeeds but queuing fails, retain phase `configured` and report exactly that; the next user/event can recover it. A pending handoff on recovery is reconciled against actual selection and queue state instead of dispatched again. Rate picks against actual outcomes; mere configuration success is not delivered work.

## Subagents: checkpoint and resume in their existing workspace

Include this policy, the child's account ID, thresholds and reporting requirements in each brief. The child performs its own quota checks at work boundaries. When a reserve is reached, it saves a concise checkpoint (task/dispatch/intent IDs, actual checkout/HEAD, scoped uncommitted changes, completed/remaining work, checks and live operations), sends one quota-handoff notice to its parent, and ends its turn with that checkpoint. It does not switch itself or delegate recursively.

The parent treats the checkpoint as **unfinished**, even if T3 labels the child's turn completed. Wait for terminal delivery and establish that the child has no live writer before resuming it. For an actual quota-limit terminal failure, reconstruct the checkpoint from saved child activity and Git without assuming the failed agent completed a final save. Distinguish provider quota failures from unrelated failures.

Prefer configuring the **finished child thread** to the new eligible account/model/effort, then using `t3_thread_send` to resume that implementation in the same T3-bound checkout, when supported. The tool returns a fresh task ID: keep it as a new attempt under the original logical task key, with a new dispatch/continuation ID. Preserve previous attempts and reject late events from them. This is an implementation continuation, not a new review/re-check; new reviews still use a new `delegate_task`.

Do not cancel a terminal child needlessly. If a live child must be replaced, use `task_cancel` and establish it has stopped before another writer starts; never resurrect a cancelled task. If the host cannot continue the child or bind a replacement to the preserved workspace, the parent may continue directly in that checkout using its chosen account, or hold it for supported recovery. A new isolated delegate is suitable only when it can receive the saved work safely through supported binding/base-ref mechanisms. Never manufacture a child checkout in the shell or reset away uncommitted progress to make a handoff fit.

Order matters: T3 captures a queued run's model selection when it is queued, and holds queued runs for a usage-limited provider instance until that limit clears. Configure first and queue afterward. A continuation queued before the switch still runs on the exhausted account, or waits for it to reset.

## Optional T3 supervisor for post-exhaustion recovery

If the user asks for coverage after the coordinator is already blocked, offer a T3 scheduled task as the external supervisor. Create it only with explicit consent, because each run uses quota. Use `schedule_task` with `bindToCurrentThread: false`, an interval of about 10–15 minutes, and a prompt that names the coordinator thread ID. Each run should do the following:

1. Read the coordinator with `t3_thread_read` and the ledger, and stop immediately if task mode is off or the thread is not blocked by a usage limit.
2. Run the quota helper for the coordinator's instance. If an eligible account exists, apply the coordinator procedure above on the coordinator's behalf: configure the thread, then queue one continuation with a stable client request ID.
3. Record the recovery in the ledger and take no other action. The supervisor does not edit files, dispatch tasks or merge.

The supervisor runs on its own selection, so it must not use the depleted account. Disable it with `schedule_task` (`enabled: false`) when task mode is turned off.

## Boundary of the guarantee

This is proactive behavior at agent checkpoints, using T3 for the actual context/selection change. It is **not** a host-level quota watchdog. It cannot sample during an uninterrupted model/tool operation, switch after the coordinator has already lost all execution capacity, or guarantee that T3 will expose a quota failure as a usable wake event. Save checkpoints before risking long operations. Reliable post-exhaustion coordinator recovery requires the optional supervisor above, or a native T3 quota-fallback feature. The skills sync timer only deploys files and does not provide that supervision.
