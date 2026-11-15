---
status: accepted
---

# One shared base and two UI tracks

All apps use the same base: check levels, deploy scripts, lint rules and git hooks, the showcase tools, monitoring and repo docs. On top of the base, an app uses one of two UI tracks:

- **Web-only track** (the default): React 19, Vite and TypeScript, deployed on Cloudflare Workers, with design tokens as CSS variables.
- **Native-capable track**: Expo with React Native for web, as in Splitnext. Use it only when the app will also ship as a phone app.

We chose this because most of our web apps already use React, Vite and TypeScript on Workers, and Splitnext's base (deploy script, check levels, lint, monitoring) works on that stack without change. Splitnext's components and tokens are tied to React Native, so a web-only default cannot reuse them directly, and forcing React Native on every web app adds weight that only phone apps need.

## Considered options

- **Splitnext's full stack (Expo / React Native for web) for every app.** Rejected: web-only apps do not need it, and most current web apps would have to move.
- **React, Vite and TypeScript for every app, with no native track.** Rejected: apps that must also ship as phone apps would lose Splitnext's working components and catalog.
- **No default stack, each app chooses.** Rejected: the shared base, lab and showcase tools would need a version for each stack.

## Consequences

- The component lab and catalog need a web-only version as well as Splitnext's React Native version.
- Desktop apps, libraries and command-line tools get smaller versions of the base later (see ADR 0004).
