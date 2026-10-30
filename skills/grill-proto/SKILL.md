---
name: grill-proto
description: Interview the user one question at a time, using concise chat, rich HTML examples, isolated prototypes, or app variants to clarify decisions. Use for visual or prototype-assisted grilling about ideas, plans, UI, APIs, and workflows.
---

# Grill proto

Interview relentlessly toward a shared understanding of the user's goal. Stay within that scope; distinguish important decisions from details that can wait.

## Follow the decisions

Map a **design tree**: decisions and their dependencies. Internally track settled answers and reasons, open questions, and pending research. The **frontier** is the open decisions whose prerequisites are settled. Skip routine "settled" recaps; refer to past answers only when needed to resolve uncertainty or a contradiction.

Ask the most useful ready question, then wait. Ask only one decision at a time, even when several are ready. After each answer, update the tree and choose again. Clarify ambiguous answers and revisit decisions contradicted by new evidence without reopening everything else. Keep question numbers stable on revisits.

Find accessible facts yourself through a fresh-context research subagent; investigate directly if unavailable. Ask the user for facts only they can supply. While research runs, hold dependent questions and choose another ready question. If none is ready, report the blocker instead of guessing or finishing.

Check descriptions of current behavior against the code; surface contradictions and distinguish current from intended behavior. Propose precise terms for vague concepts. Stress-test assumptions and domain relationships with concrete scenarios and edge cases.

## Choose how to explain

Ask questions, give recommendations, and explain in normal chat. Use rich HTML only for content that benefits from being seen or tried. Automatically choose the simplest useful form:

- **Words only:** a short chat question and any needed choices.
- **Inline examples:** illustrations or simple interactions, such as mockups, diagrams, or toggles.
- **Isolated prototypes:** focused runnable experiments that need more than an inline example.
- **App variants:** competing changes to the existing app, each in its own worktree, when its context matters.

Forms can combine. Build only what the current question needs. For external builds, follow [references/builds.md](references/builds.md).

## Keep questions concise

For visual examples, follow [references/rich-html.md](references/rich-html.md). Use guidelines, not a fixed template; keep ordinary prose outside the HTML.

Ask a short, natural question. Let the example explain the choices. When tabs or illustrations already label options, do not repeat them in cards or lists. Put any essential explanation inside the example, usually one line.

Give a recommendation with a brief reason, usually one sentence, when justified by the user's goals. Ask openly; never bend the question to make "yes" accept your recommendation. Omit recommendations for missing facts.

Skip preambles, obvious captions, repeated tradeoffs, implementation detail, future-question agendas, and routine reply instructions. Include context or limitations only when omission could mislead the choice. Let the user ask for more detail.

Accept combinations, rejection, or new directions. Explain consequential inferences from feedback: choosing B does not endorse every detail. Resolve remaining uncertainty with a follow-up or revised example, preserving settled parts. Preference is not proof of feasibility, performance, or correctness; verify technical claims separately.

## Finish

Finish when the decisions needed for the goal are settled or explicitly deferred by the user. An empty frontier is insufficient if investigations or blocked questions remain.

Conclude in normal chat with one short paragraph summarizing the understanding, plus a second concise paragraph for unasked assumptions or deferrals when needed. Avoid decision tables and item-by-item recaps. Important unresolved choices still need questions, not silent defaults. Briefly ask for confirmation, then wait. Demonstrations are part of this interview; production implementation requires the user's instruction.
