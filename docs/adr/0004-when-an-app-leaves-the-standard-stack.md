---
status: accepted
---

# When an app may leave the standard stack

- A web app uses the web-only track unless it will also ship as a phone app. Only then does it use the native-capable track (ADR 0002).
- **Exit test.** A web app may leave both UI tracks only for a hard blocker: a library or host it needs does not work on the standard stack. The owner approves each exit.
- **Record of an exit.** Each exit gets a short ADR in that app's repo. It names the blocker and the stack chosen instead.
- **Data store.** The shared base uses Cloudflare D1 for normal stored data and Durable Objects for live, shared state, as Splitnext does. Another store needs a reason in the app's README.
- **Styling.** Web-only apps style pages with Tailwind classes that read the generated token CSS variables (ADR 0003). Tailwind does not define its own colors, spacing or type sizes.
- **Existing apps.** An app on another stack moves to the standard stack only when a large change to it is due anyway. No app moves only to follow the standard.
- **Desktop apps, libraries and command-line tools** do not fit either UI track. Each kind gets a smaller version of the shared base the first time a project of that kind has a large change. That version contains only the parts of the base that fit it. Until then these projects keep their current stack and use the parts of the base that fit them, such as lint rules, git hooks and repo docs.
- An app that uses a different stack keeps the shared base wherever the base works on that stack.

## Considered options

- **An agent may leave the stack with a clear reason, noted in the README.** Rejected: exits would add up without review, and the shared tools would need more versions.
- **No default data store; each app chooses.** Rejected: the base, monitoring and tests would need a version for each store.
- **Plain CSS variables without Tailwind.** Rejected: more hand-written CSS for each app, and agents write Tailwind well.
- **Move all existing apps one by one, or never move them.** Rejected: moving working apps only for the standard costs time with no gain for users; never moving them keeps old stacks forever.
- **Build the desktop, library and command-line versions of the base now.** Rejected: without a project that needs them, their content would be guesses.
