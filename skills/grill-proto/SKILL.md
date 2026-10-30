---
name: grill-proto
description: Interview the user one question at a time in rich HTML, using words, inline examples, isolated prototypes, or app variants to clarify decisions. Use for visual or prototype-assisted grilling about ideas, plans, UI, APIs, and workflows.
---

# Grill proto

Interview relentlessly toward a shared understanding of the user's goal. Stay within that scope; distinguish important decisions from details that can wait.

## Follow the decisions

Map a **design tree**: decisions and their dependencies. Track settled answers and reasons, open questions, and pending research. The **frontier** is the open decisions whose prerequisites are settled.

Ask the most useful ready question, then wait. Ask only one decision at a time, even when several are ready. After each answer, update the tree and choose again. Clarify ambiguous answers and revisit decisions contradicted by new evidence without reopening everything else. Keep question numbers stable on revisits.

Find accessible facts yourself through a fresh-context research subagent; investigate directly if unavailable. Ask the user for facts only they can supply. While research runs, hold dependent questions and choose another ready question. If none is ready, report the blocker instead of guessing or finishing.

Check descriptions of current behavior against the code; surface contradictions and distinguish current from intended behavior. Propose precise terms for vague concepts. Stress-test assumptions and domain relationships with concrete scenarios and edge cases.

## Choose how to explain

Present every question in rich HTML. Automatically choose the simplest useful form:

- **Words only:** a short question and any needed choices.
- **Inline examples:** illustrations or simple interactions, such as mockups, diagrams, or toggles.
- **Isolated prototypes:** focused runnable experiments that need more than an inline example.
- **App variants:** competing changes to the existing app, each in its own worktree, when its context matters.

Forms can combine. Build only what the current question needs. For external builds, follow [references/builds.md](references/builds.md).

## Keep questions concise

Follow [references/rich-html.md](references/rich-html.md) for styling and rendering. Use guidelines, not a fixed template.

Ask a short, natural question. Let the example explain the choices. When tabs or illustrations already label options, do not repeat them in cards or lists. Put any essential explanation inside the example, usually one line.

Give a recommendation with a brief reason, usually one sentence, when justified by the user's goals. Ask openly; never bend the question to make "yes" accept your recommendation. Omit recommendations for missing facts.

Skip preambles, obvious captions, repeated tradeoffs, implementation detail, future-question agendas, and routine reply instructions. Include context or limitations only when omission could mislead the choice. Let the user ask for more detail.

Accept combinations, rejection, or new directions. Explain consequential inferences from feedback: choosing B does not endorse every detail. Resolve remaining uncertainty with a follow-up or revised example, preserving settled parts. Preference is not proof of feasibility, performance, or correctness; verify technical claims separately.

## Finish

Finish when the decisions needed for the goal are settled or explicitly deferred by the user. An empty frontier is insufficient if investigations or blocked questions remain.

Summarize decisions, reasons, selected variants, and deferrals. Ask for confirmation of shared understanding as the final HTML question, then wait. Demonstrations are part of this interview; production implementation requires the user's instruction.
