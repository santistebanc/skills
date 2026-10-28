# Clear work records

Use ASD-STE100 writing principles. Use approved words when possible. Keep software names and exact identifiers. Do not claim full STE compliance without a dictionary check.

Write one instruction per sentence. Use active verbs. Keep instructions within 20 words and descriptions within 25 words. Use the same word for the same thing.

Use a title of about 3–7 words. Start with a verb. Name the result: “Add the factory dashboard.” Put implementation terms in the details.

Start each ticket with these sections:

```markdown
## Goal
One or two short sentences about the result.

## Done when
- A visible result that can be checked.
- Another result, only if needed.

## Details
The necessary constraints, risks and exact references.
```

Keep each visible group to about five items. Keep all required scope. Move supporting evidence to Details instead of deleting it. Use numbered steps for an ordered task.

For an update, state the result first. Then give the remaining action or blocker. For a question, state the decision needed and the options. Record only the human's actual answer.

For a PR, state what changes for the user. Then give checks, risks and technical detail. Use native Markdown headings and disclosure sections. Match a required repository template while keeping its first section short.

Link exact targets: `[Ticket #3](https://HOST/#task/OWNER%2FREPO/3)`, `[PR #10](https://github.com/OWNER/REPO/pull/10)`, or `[file](CODE_URL)`. Use the configured dashboard host. Keep unlinked identifiers in backticks. Do not invent a link or a relationship. A diagram must explain a real sequence or dependency.

For existing long text, use `factory brief N --version VERSION --title TITLE --summary SUMMARY --checks-json '["Check one","Check two"]'`. The brief is a reading aid. It does not change permissions, dependencies, status or the original task instructions. It stops displaying after the title or body changes. Keep decisions and audit history intact.

Inspiration: [i-have-adhd](https://github.com/ayghri/i-have-adhd/blob/main/skills/i-have-adhd/SKILL.md). Use clear next actions, small groups and visible progress. Do not adopt its diagnosis, time estimates, session mode or other rules.
