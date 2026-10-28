# Store and CLI reference

Run `node <skill-directory>/scripts/profile.mjs help` for commands. The store is one transaction envelope, `profile.json`: canonical `records`, separate `session` bookkeeping, and revision `history`. One file prevents mismatched multi-file saves. It is local plain text, not encrypted. Unix mode bits are restrictive; on Windows, access follows the containing directory's ACL.

Writes use an exclusive lock, a same-directory temporary file and atomic rename. Mutating commands require the revision last read, except `init` and automatic question selection with `next`. A stale write is rejected. `init` rejects an existing profile. `unlock` removes a lock only after its recorded process is gone. Do not bypass a live lock.

`apply` upserts whole new records or partial updates to existing IDs. Types and managed metadata are immutable through input patches. A changed fact resets affected confirmations, including stories, supporting skills and dependent calculations; prior values stay in history. Historical text remains in the local audit trail after a correction. There is no deletion/erasure or export command in this first version.

## Records

IDs are stable strings containing letters, numbers, `_` and `-`. Existing references must resolve. Every record has `visibility` (`private` by default), optional `publicText`, managed `confirmation`/timestamps/revision. `anonymized` requires exact approved `publicText`. Visibility describes permission only; no public output is generated. `confirm` records user readback, not independent corroboration.

| Type | User-editable fields |
| --- | --- |
| `profile` | Singleton ID `profile`; `name` or null. Preferences, contact details, languages and direction are claims on this subject. |
| `context` | `label`, `category`: employment, education, volunteering, open-source, personal, caregiving, other. Titles, responsibilities and periods are claims. |
| `story` | `label`, `contextId`. Situation, goal, own-actions, others-actions, decision, outcome, reflection and other facts are claims on this story. |
| `claim` | `subjectId`, `field`, `statement`, `answerState`, `source`, `evidenceIds`, `dependsOn`, `metric`, `dates`, `conflict`. |
| `evidence` | `label`, `kind`: self-report/artifact/feedback/document/other; `uri`, `locator`, `capturedAt`, `version` (nullable); `availability`: available/described/unavailable/withheld. |
| `skill` | `label`, `claimIds` pointing to demonstrations. Use claim fields to distinguish interest/exposure from demonstrated use. |

A claim's `statement` preserves the reported assertion, rather than a polished CV bullet. `answerState` is provided/unknown/none/withheld/not-applicable/deferred. `source` needs `kind` (self-report/document/inference/calculation) and `reference` (answer ID, file/URL with locator, or other source identifier); optional `excerpt`. Evidence links support that claim only, not every statement in a story. A described artifact is not verified just because it has a URL.

`metric` defaults to null. If needed, give `kind` (measured/estimate/calculation/scale/qualitative), `value` (number, estimate text or null), `unit`, `baseline`, `period`, `basis`, `attribution`, `uncertainty`. Basis is required. Measured, scale and calculated quantities require numeric value and unit. Calculations also need input claim IDs in `dependsOn`; the dependency graph must be acyclic. Keep recollected estimates distinct from measured values and do not calculate from unsupported inputs.

`dates` defaults to null. Normalized dates take `{start, end, ongoing, approximate}`. Start/end are null or ISO year/year-month/full-date strings; ongoing is true/false/null, approximate is boolean. Missing end is unknown, not ongoing. Keep original wording in `statement`. A broad year and a more precise date can overlap without inventing precision.

`conflict` is null or a note describing an unresolved discrepancy. Confirmation rejects unresolved conflicts. A correction uses the same ID, a reason and the newly supported account, preserving both assertions in history. Output wording is not a new source of facts.

## Guided answers

Call `next`, then use its question ID and returned revision:

```json
{"text":"I am still exploring role options", "state":"unknown"}
```

```text
node <skill-directory>/scripts/profile.mjs answer --question QUESTION_ID --input answer.json --revision N
```

For an adaptive question, use `ask --input question.json --revision N`. The file contains:

```json
{"subjectId":"story_checklist", "field":"decision", "text":"Which alternative did you consider?"}
```

It must name an existing profile/context/story and requires no pending question. Adaptive questions are saved before they are asked; answers do not advance the guided cursor. `skip` defers the pending question. `revisit QUESTION_ID` restores a deferred factual question without changing the guided cursor; structural control questions instead use a new context/story or an explicit edit/confirmation.

## Richer facts and corrections

Use `apply --input patch.json --revision N` for structured records. New records receive private/draft defaults. This fictional patch creates a context, story and sourced claim in one validated transaction:

```json
{
  "reason":"Capture the person's description of a volunteer episode",
  "upsert":[
    {"id":"context_volunteer", "type":"context", "label":"Volunteer group", "category":"volunteering"},
    {"id":"story_checklist", "type":"story", "label":"Setup checklist", "contextId":"context_volunteer"},
    {"id":"claim_checklist_action", "type":"claim", "subjectId":"story_checklist", "field":"own-actions", "statement":"I wrote a setup checklist and trialled it with two helpers", "source":{"kind":"self-report", "reference":"answer_ID"}}
  ]
}
```

After a readback accepted by the person, `confirm story_checklist --revision N` confirms the story and its claims. Contexts and their claims can be confirmed separately. To correct the action, upsert `{id:"claim_checklist_action", statement:"...", source:{...}}` with a change reason. Recheck numeric/date metadata and evidence links when correcting a statement: unsupported old details must be cleared explicitly. The terminal review's revise path clears these automatically and preserves the prior version in history.

Use `show ID` for a reviewable record and related claims. `show` without ID includes raw session answers and history; keep that output private. Save generated input JSON in the private store or a temporary directory, never in a public source directory. Remove only your generated inputs after the write succeeds.

After a statement correction, story/context readbacks include `needsConsistencyReview`, the old/new statements and IDs of related claims to inspect. This notice persists until the account is confirmed. Reconcile repeated facts in outcome, support and other claims before confirmation; the CLI highlights candidates but does not infer semantic contradictions or rewrite other facts automatically.
