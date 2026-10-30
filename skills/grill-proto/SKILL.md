---
name: grill-proto
description: Interview the user about an idea, plan, or design, using competing working prototypes to clarify decisions. Use for prototype-assisted grilling about UI, APIs, workflows, or other prototype-friendly decisions.
---

# Grill proto

Interview the user relentlessly until you reach a shared understanding. Map a **design tree**: decisions branch into dependent decisions. Track open questions, settled answers and reasons, dependencies, and pending work.

Establish the goal and scope; ask if unclear. Focus on decisions needed for that goal, separating blockers from details that can wait. Honor requests to pause, stop, or narrow scope.

## Work in rounds

The **frontier** contains open decisions whose prerequisites are settled. Cover it each round, in manageable batches if needed. Ask ready questions while other research or prototypes are pending. Questions depending on unanswered questions belong in later rounds.

For each question, name the uncertainty and what trying alternatives would reveal beyond a direct answer. Build prototypes automatically when that benefit is clear; otherwise ask directly. Prepare one question's prototype set at a time by default.

After each round, update the tree and recompute the frontier. Revisit answers contradicted by new evidence. Clarify incomplete or ambiguous replies, including a bare "yes" to several questions, without reopening clear answers.

## Find facts yourself

Find accessible facts yourself; decisions belong to the user. Dispatch a fresh-context subagent with a focused brief to investigate code, files, tools, or other sources. If subagents are unavailable, investigate yourself and explain the limitation.

Ask the user only for facts unavailable from those sources, such as undocumented commitments. Treat these as missing information, not choices.

An investigation is an unsettled prerequisite: hold dependent questions, ask the rest now, and use findings in a later round.

Check descriptions of current behavior against relevant code. Surface contradictions: "The code cancels whole Orders; you described partial cancellation. Should partial cancellation be the intended behavior?" Separate current from desired behavior.

## Ask direct questions

Number all questions across rounds, retaining numbers on revisits. Separate questions with `---`.

Use this format:

```text
❓ **Q1** - **<question title>**: <question body, with context or choices as needed>

➡️ <your recommended answer and a short reason>

---

❓ **Q2** - **<question title>**: <question body, with context or choices as needed>

➡️ <your recommended answer and a short reason>
```

For decisions, **"yes" must accept your recommendation**, even with several choices. For missing facts, keep the heading but omit the recommendation; never invent one.

Sharpen vague terms: "By 'account', do you mean Customer or User? I suggest Customer for the paying organization. Is that right?"

Test domain relationships with concrete edge cases: "A User belongs to two Customers and leaves one. Should access to the other remain?" Challenge assumptions, contradictions, and the costs of preferred choices.

## Ask through prototypes

Build the smallest working comparison: two or three distinct, credible alternatives with honest benefits and costs. Use interactive UI, executable API examples, workflow simulations, or another suitable form.

Use one subagent per variant, in parallel within capacity; build sequentially if unavailable. Give each the question, direction, settled constraints, shared data, expected interface, and separate owned files. The parent owns the comparison harness. Match task, context, and polish; vary what the question tests.

Keep prototypes separate from production behavior. Simulate external effects and label all simulated behavior. Run each variant's relevant behavior before presenting it; disclose checks you could not perform.

Feedback settles preferences and requirements, not technical facts. Verify feasibility, performance, reliability, and correctness separately.

Give every variant a stable ID and verified direct link. Picker links must open the named variant; API and workflow links must reach its runnable example. Show UI at realistic size and use the same scenario across variants.

Label revisions, such as `Q2-B v2`. Preserve evaluated versions and their links; record which version each answer concerns.

Use this format:

```text
❓ **Q3** - **<question title>**: <the decision these prototypes help answer>

<Brief context: why this matters and what differs between the prototypes.>

🧪 **Try the prototypes**: <picker link or runnable entry point>

- **[Q3-A — <name>](<direct link to A>)**: <approach, benefit, and cost>
- **[Q3-B — <name>](<direct link to B>)**: <approach, benefit, and cost>
- **[Q3-C — <name>](<direct link to C>)**: <approach, benefit, and cost; omit if only two>

**What to try**: <the same concrete task in each prototype and what to pay attention to>

➡️ <your recommended variant and a short reason tied to the user's goal>

Does that direction fit? You can say "yes", pick another variant, or describe what you would combine or change and why.
```

Recommend from the user's goals and observed tradeoffs. Give every alternative its strongest fair case. Seek answers to the decision, not just appearance rankings.

Accept combinations, rejection, or new directions. Translate feedback into a proposed answer and explain your inference: choosing B does not endorse every detail. Resolve remaining uncertainty with focused follow-ups or revised prototypes; preserve settled parts.

## Finish

Finish when needed decisions are settled or explicitly deferred by the user, with no hidden assumptions. An empty frontier is insufficient if work or blocked questions remain; surface those blockers.

Summarize decisions, reasons, selected prototypes, and deferrals. Wait for confirmation of shared understanding before acting on the plan. Interview prototypes are authorized by this skill; production implementation requires the user's instruction.
