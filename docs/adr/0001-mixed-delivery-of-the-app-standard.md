---
status: accepted
---

# Ship shared tooling as packages, copy components into each app

The app standard has two kinds of parts. Parts that should stay the same in every app ship as shared, versioned packages that we update in one place: tool settings, lint rules, monitoring setup, the component lab and showcase tools, and the design tokens. Parts that each app shapes for itself are copied into the app and owned there, in the shadcn way: UI components and app code. A scaffolder sets up both when it creates an app.

We chose this because tooling drifts quickly when each app keeps its own copy, but components need local changes that a shared package would block.

## Considered options

- **Everything as shared packages.** Rejected: every component change would need a package release, and apps could not adapt a component without forking it.
- **Everything copied (a template only).** Rejected: lint rules, check scripts and monitoring would drift apart after the first copy, and fixes would have to be repeated in each app.

## Consequences

- Shared packages need version numbers and release notes, and each app updates them on purpose.
- Copied components do not get updates by themselves. The scaffolder or a later tool can show what changed in the source copy.
