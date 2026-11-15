---
status: proposed
---

# When an app may leave the standard stack

The decided parts of this rule:

- A web app uses the web-only track unless it will also ship as a phone app. Only then does it use the native-capable track (ADR 0002).
- Desktop apps, libraries and command-line tools do not fit either UI track. They will get smaller versions of the shared base later. Until then they keep their current stack and use the parts of the base that fit them, such as lint rules, git hooks and repo docs.
- An app that uses a different stack keeps the shared base wherever the base works on that stack.

The full exit rule is not decided yet, so this ADR stays "proposed".

## Open points

These need an owner decision. They are not decided by this ADR.

1. **Exit test.** What reason lets a web app leave both UI tracks (for example, a library or host that only works on another stack), and who approves it.
2. **Record of an exit.** Whether each exit needs its own ADR in that app's repo.
3. **Database default.** Whether the base includes a default data store (for example, Cloudflare D1 or Durable Objects), or each app chooses.
4. **Styling layer.** Whether the web-only track uses plain CSS variables only, or Tailwind on top of the generated variables.
5. **Existing apps.** Whether current apps on other stacks (for example, static sites on other hosts) move to the standard stack, and when.
6. **Variant timing.** When the desktop, library and command-line versions of the base are made, and what each one contains.
