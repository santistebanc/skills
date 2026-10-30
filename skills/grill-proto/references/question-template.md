# Question template

Read [../assets/question.html](../assets/question.html) before rendering a question. Copy it and keep its CSS and shell. Replace content, remove unused sections, and add scoped styles or scripts only for the actual illustration. Follow host rendering constraints if they differ.

Use this structure for all four question forms. The question should read as one calm column, not a dashboard or a row of compressed cards. No decorative emoji, gradients, shadows, new fonts, or per-question theme changes. Use the host's theme and font. Option IDs identify choices; they are not radio buttons.

## Fill the slots

- `QUESTION_ID`, `TITLE`: stable question ID and the actual question. Escape plain text, including the document title.
- `CONTEXT_HTML`: one or two short paragraphs of necessary context. Put deeper detail in an optional `<details>` below the summary.
- `EXAMPLE_TITLE`, `EXAMPLE_HTML`, `EXAMPLE_CAPTION`: optional full-width example. Keep the example readable at actual size. Use a labeled switcher for alternatives that would become cramped side by side. Label illustrative data and simulated behavior. Remove the entire figure if unused.
- `OPTIONS_HTML`: repeat the list item below; use stable full IDs in `data-option-id`, short letters visibly. For a revised build, include its version in the title or link. Remove the list when no choices are needed.
- `TRY_INSTRUCTION`, `LINKS_HTML`: one shared task and one real direct link per build. Use the link markup below. Remove this section for words-only and inline-only questions. Never ship placeholder or fabricated links.
- `RECOMMENDED_ID`, `RECOMMENDATION_HTML`: option ID and a brief reason. Remove the entire aside for missing-fact questions. For a decision without listed choices, remove the ID and separator from the heading.
- `REPLY_HINT`: explain the chat reply, for example: `Reply yes for A, choose B, or describe what you would change.` For facts, invite a factual answer.

These are content slots, not a templating engine. Replace all `{{...}}` markers before rendering; escape inserted text and attribute values. Avoid duplicating the same explanation in the context, options, and recommendation.

## Option markup

```html
<li class="gp-option" data-option-id="Q1-A">
  <span class="gp-option-id" aria-hidden="true">A</span>
  <div>
    <div class="gp-option-heading">
      <h3><span class="gp-sr-only">Option A: </span>Option name</h3>
      <span class="gp-tag">Suggested</span>
    </div>
    <p class="gp-description">What this option does and why it helps.</p>
    <p class="gp-tradeoff">Tradeoff: the cost or limitation.</p>
  </div>
</li>
```

Keep `Suggested` on the recommended option only. Delete optional description or tradeoff lines when redundant. Use normal text rather than controls for choices: the user answers in chat. Add genuine inline example controls only when they demonstrate behavior, with labels, keyboard support, and honest local-only state.

## Build link markup

```html
<a class="gp-link" href="REAL_VERIFIED_URL" target="_blank" rel="noopener noreferrer">Open Q1-A · Option name ↗</a>
```

If the host cannot open a required URI inside HTML, disclose that limitation and provide a working host-supported link in chat rather than a dead button.

## Check before showing

Preview with the host's HTML tools at desktop and phone widths, and both light and dark appearances when available. Check readable text, no clipping or horizontal page scroll, no empty sections or unresolved slots, usable links, and working example interactions. Keep necessary content visible; use optional details only for secondary information. Then render the same checked HTML. Do not add fake answer-submission buttons.
