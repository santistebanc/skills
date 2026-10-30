---
name: grill-proto
description: Interview the user one question at a time in rich HTML, using words, inline examples, isolated prototypes, or variants of the existing app to clarify decisions. Use for visual or prototype-assisted grilling about ideas, plans, UI, APIs, and workflows.
---

# Grill proto

Interview the user relentlessly until you reach a shared understanding. Map a **design tree**: decisions branch into dependent decisions. Track open questions, settled answers and reasons, dependencies, and pending work.

Establish the goal and scope; ask if unclear. Focus on decisions needed for that goal, separating blockers from details that can wait. Honor requests to pause, stop, or narrow scope.

## Ask one question at a time

The **frontier** contains open decisions whose prerequisites are settled. Choose the most useful ready decision, present one question, and wait for the user's answer. Several options may answer that question; unrelated decisions need separate turns.

After each answer, update the tree and recompute the frontier. Clarify incomplete or ambiguous answers before advancing that decision. Revisit answers contradicted by new evidence without reopening other settled decisions. Keep each question's number on revisits; number new questions sequentially.

Present every question in rich HTML. Name the uncertainty and choose the simplest form that lets the user judge the alternatives:

- **Words only:** the question, options, tradeoffs, and suggested answer, formatted in HTML.
- **Inline examples:** illustrations or simple interactions, such as mockups, diagrams, before/after views, toggles, or small simulations.
- **Isolated prototypes:** small working experiments for decisions needing execution beyond an inline example, without the full app's context.
- **App variants:** competing changes to the existing app when the decision needs its real components, flows, or surrounding context. Build each in its own worktree.

These forms can combine: an app-variant question may include an inline comparison and links to try each version. Build useful demonstrations automatically, only for the current question.

## Present the whole question in rich HTML

Read [references/question-template.md](references/question-template.md) and reuse [assets/question.html](assets/question.html) for every question. Keep its layout and styles; fill the content slots and omit unused sections. The reference defines option markup, links, and preview checks. Do not redesign the question shell each turn.

Render one inline HTML question containing:

- **Q1 - Question title**, followed by the question and necessary context.
- Suggested options, with stable IDs such as `Q1-A` and clear tradeoffs.
- Illustrative examples, mockups, or simple interactions when helpful.
- Direct links to each isolated prototype or app variant when present, plus what to try.
- A clearly marked **Suggested answer**, with a short reason tied to the user's goal.
- A brief invitation to accept, choose another option, or explain a different answer.

For decisions, word the question so **"yes" accepts the recommendation**. For missing facts, ask directly and omit the recommendation; never invent one. Omit other sections that add nothing.

Keep all question content inside the HTML, including links, examples, options, and recommendation. Use the host's tools to check and render it, rather than showing source code or only a file link. Avoid repeating the question in surrounding chat. If inline rendering is unavailable, explain briefly and present the same content in text.

Make the question readable on narrow screens, with clear labels and working links. Accept replies in chat by default. Only add answer-submission controls when the host supports sending answers back; a local selection alone is not a user reply.

## Illustrate clearly

Use the smallest helpful visual: UI mockups or before/after views, a relationship diagram, or an option comparison. For UI changes, show the proposed appearance in the product's context. Match alternatives in task, context, and polish; label them with question and option IDs. Mark inferred details and simulated behavior.

Simple interaction in rich HTML does not require a separate build. Inline previews supplement, rather than replace, direct links to isolated prototypes and app variants.

Sharpen vague terms: "By 'account', do you mean Customer or User? I suggest Customer for the paying organization. Is that right?"

Test domain relationships with concrete edge cases: "A User belongs to two Customers and leaves one. Should access to the other remain?" Challenge assumptions, contradictions, and the costs of preferred choices.

## Find facts yourself

Find accessible facts yourself; decisions belong to the user. Dispatch a fresh-context subagent with a focused brief to investigate code, files, tools, or other sources. If subagents are unavailable, investigate yourself and explain the limitation.

Ask the user only for facts unavailable from those sources, such as undocumented commitments. Treat these as missing information, not choices.

An investigation is an unsettled prerequisite: hold dependent questions and choose another ready question while it runs. If none is ready, report the pending work rather than guessing or declaring completion.

Check descriptions of current behavior against relevant code. Surface contradictions: "The code cancels whole Orders; you described partial cancellation. Should partial cancellation be the intended behavior?" Separate current from desired behavior.

## Build isolated prototypes or app variants

Build the smallest working comparison: two or three distinct, credible alternatives with honest benefits and costs. Use interactive UI, executable API examples, workflow simulations, or another suitable form.

For isolated prototypes, build only the focused experiment; a complete standalone application is unnecessary. For app variants, reuse the existing app's components, styles, dependencies, and flows in separate worktrees. Implement only what the question needs.

Use one subagent per variant, in parallel within capacity; build sequentially if unavailable. Give each the question, direction, settled constraints, shared data, expected interface, and its worktree or separate owned files. Use the host's supported worktree delegation; do not assume a shell-created checkout binds a subagent. The parent owns any shared comparison harness.

Start app variants from the same agreed app state. Include relevant uncommitted changes only through a supported, deliberate transfer; a new worktree does not inherit them. Give concurrent builds separate ports and isolated mutable data where needed.

Keep all experimental builds separate from production behavior. Simulate external effects and label all simulated behavior. Run each variant's relevant behavior before presenting it; disclose checks you could not perform.

Give every variant a stable ID and verified direct link inside the question, including variants running from worktrees. Picker links must open the named variant; API and workflow links must reach its runnable example. Show UI at realistic size and use the same scenario across variants. Keep the required runtime available while the user evaluates it; a worktree path alone is not a runnable preview.

Label revisions, such as `Q2-B v2`. Preserve evaluated versions and their links; record which version each answer concerns.

Recommend from the user's goals and observed tradeoffs. Give every alternative its strongest fair case. Seek answers to the decision, not just appearance rankings.

Accept combinations, rejection, or new directions. Translate feedback into a proposed answer and explain your inference: choosing B does not endorse every detail. Resolve remaining uncertainty with a follow-up question or revised prototypes; preserve settled parts.

Feedback settles preferences and requirements, not technical facts. Verify feasibility, performance, reliability, and correctness separately.

## Finish

Finish when needed decisions are settled or explicitly deferred by the user, with no hidden assumptions. An empty frontier is insufficient if work or blocked questions remain; surface those blockers.

Summarize decisions, reasons, selected variants, and deferrals. Ask for confirmation of shared understanding as the final HTML question, then wait before acting on the plan. Interview demonstrations and experimental builds are authorized by this skill; production implementation requires the user's instruction.
