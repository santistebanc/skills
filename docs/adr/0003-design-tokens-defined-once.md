---
status: accepted
---

# Define design tokens once and generate them for both tracks

Design values (colours, sizes, spacing, durations: "tokens") are written one time, in one source, and a build step generates them for each UI track: CSS variables for the web-only track and style objects for the native-capable track. The token source ships in the shared tokens package (ADR 0001).

We chose this because two hand-kept token sets would drift apart, and the same brand must look the same on both tracks.

## Considered options

- **A separate token file for each track.** Rejected: the two sets would drift.
- **CSS variables only, read by React Native at run time.** Rejected: React Native does not read CSS variables, so native screens would lose the tokens.
