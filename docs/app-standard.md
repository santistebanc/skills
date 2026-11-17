# App standard

One rule for each area of an app. Each rule says why it exists, how we check it, and where to copy a working example. The rules apply to every new app and to an existing app when it has a large change ([ADR 0004](adr/0004-when-an-app-leaves-the-standard-stack.md)). How the standard ships is in [ADR 0001](adr/0001-mixed-delivery-of-the-app-standard.md); the shared base and the two UI tracks are in [ADR 0002](adr/0002-one-shared-base-two-ui-tracks.md). The facts behind each rule are in [the inventory](../research/app-standard-inventory.md).

"Check" names what fails when the rule is broken. A rule with no automatic check says who checks it.

## 1. Design system and components

- **Rule:** Every colour, size, space and duration comes from a design token with a role name. Screens use the shared components; a new component is made only when no existing one fits, and it goes into the design folder, not into a screen.
- **Why:** One place to change the look, and screens that agree with each other.
- **Check:** Lint fails on raw colour values outside the token file. Review checks that a new component was needed.
- **Copy from:** Splitnext `apps/client/src/design/tokens.ts` and `design/` (native-capable track). Tokens are written once and made for both tracks ([ADR 0003](adr/0003-design-tokens-defined-once.md)); the web-only track uses Tailwind classes that read the token CSS variables.

## 2. Component lab

- **Rule:** Each shared component and each screen state (loading, empty, error, long content, offline) has a page in the component lab, with usage, props, source path and live examples.
- **Why:** Agents and the owner see every state without clicking through the app, and reuse what exists.
- **Check:** A test lists the design folder and fails when a component has no lab page.
- **Copy from:** Splitnext `apps/client/src/catalog/` (`DocPage` with `Usage`, `Props`, `Example`).

## 3. Page of user flows

- **Rule:** The app has a flows page that records each main user flow as a video and screenshots on a phone-size screen, from a fresh local server with seed data. A state that the flows cannot reach is listed as missing, with the reason.
- **Why:** The owner understands pictures better than text, and the README and portfolio reuse the media.
- **Check:** `npm run showcase` runs in the heavy tier; a flow that fails stops it.
- **Copy from:** Splitnext `showcase/` (`capture.spec.ts`, `cases.spec.ts`, `build.mjs`).

## 4. Proof before and after each change

- **Rule:** Each slice has comparable before and after proof: video for interactions, screenshots for a static change, and a text record for a change with no screen. A missing baseline is explained.
- **Why:** The owner approves what was shown, not what was described.
- **Check:** `delivery prepare` refuses a slice without an evidence package.
- **Copy from:** the project-delivery skill (`delivery evidence`); Flyscan `scripts/verify.mjs` for non-visual proof with negative controls.

## 5. Seed data and demo mode

- **Rule:** One set of fixtures feeds the lab, the flows page and the tests. Network calls in tests replay recordings and fail loudly on a request that was not recorded. Fixtures never hold real personal data.
- **Why:** The same states everywhere, tests that do not depend on outside services, and no private data in public places.
- **Check:** Tests run with the network off; a request to an unrecorded address fails the test.
- **Copy from:** Splitnext `apps/client/src/workbench/`; Flyscan `tests/recordings/` with offline mode on by default.

## 6. Test levels

- **Rule:** Unit tests for pure logic with many cases; integration tests at each boundary against real local services; browser tests only for the main flows that handle money or keep data safe; speed checks only in a timing group. Each real bug gets a test that fails before the fix. One command runs all tests, and CI runs it on each push. The full policy is in the project-delivery skill.
- **Why:** The test audit found that browser tests cost most of the CI time and caused almost all random failures.
- **Check:** `check:fast` (text check, lint, types, dry-run deploy, unit and integration tests) runs in the pre-push hook and in CI; `check` adds the browser tests.
- **Copy from:** Splitnext `package.json` scripts `check:fast` and `check`, and `.githooks/pre-push`.

## 7. Limits for accessibility, speed and size

- **Rule:** Each main flow's browser test runs an axe accessibility check with no serious or critical findings. CI fails when the app bundle is larger than its limit; the limit is today's size plus stated headroom, and it is raised only on purpose.
- **Why:** No project checked accessibility or size, so both could get worse without anyone seeing it.
- **Check:** axe in the browser tests; a bundle size check in `check`.
- **Copy from:** Splitnext `test/storageBudget.test.ts` for the "limit with headroom" pattern. axe and the bundle check are new work.

## 8. Environments and automatic checks and deploys

- **Rule:** Each deployed app has a staging and a production environment, with separate data, and each reports the commit it runs. A deploy refuses a dirty working tree, applies migrations to that environment, then deploys. Merging into main never publishes production; production is a release on the owner's request. CI actions are pinned to a commit hash.
- **Why:** Changes are tried with real-like data before people use them, and a running app can be traced to its code.
- **Check:** `GET /health` returns the deployed commit; the release workflow checks every destination before it tags.
- **Copy from:** Splitnext `wrangler.jsonc` `env.staging` and `scripts/deploy.mjs`; Flyscan `.github/workflows/release.yml`.

## 9. Monitoring

- **Rule:** The server logs each request with route, status, duration and request id, never names, amounts, links or keys. The browser sends errors to the server with the request id and the running revision. `/health` and `/ready` exist. Debug routes and tools are off in every deployed environment.
- **Why:** Problems can be found from logs without collecting personal data.
- **Check:** Tests check the log fields and that debug routes return 404 when the switch is off.
- **Copy from:** Splitnext `test/requestLog.test.ts`, the `/client-errors` route and `ENABLE_DEBUG_INSPECTION`.

## 10. Security and secrets

- **Rule:** No secret is in the repository. `.env.example` lists each key, where to get it, and that it stays on the server. A secret scan runs on each commit and again in CI. A public repository has an allowlist of files that may be published.
- **Why:** A leaked key or private file cannot be taken back.
- **Check:** gitleaks in the pre-commit hook and in CI; the public-files check in CI.
- **Copy from:** Flyscan `.pre-commit-config.yaml` (gitleaks); OV Berlin `.env.example`; Portfolio `tools/check-public.mjs`.

## 11. Library updates

- **Rule:** Renovate opens one grouped pull request each week for minor and patch updates, and one pull request for each major update. CI must pass before a merge. The lock file is committed, and the Node version is pinned in `.nvmrc`.
- **Why:** Small, regular updates are safer than one large update after months, and a drifted lock file broke deploys before.
- **Check:** CI runs `npm ci`, which fails when the lock file and `package.json` disagree; an audit step fails on high or critical findings.
- **Copy from:** new work (no project has it). Flyscan shows pinned actions and lock files.

## 12. Knowledge in the repository

- **Rule:** `AGENTS.md` is a short index of facts an agent cannot find in the code. `CONTEXT.md` holds the domain words. Each important decision is an ADR. The README is 300 to 600 words with screenshots. A slice that changes a decision updates its document in the same slice.
- **Why:** Agents and people start from the same facts, and old documents do not lie.
- **Check:** Review checks the documents in each slice; the skills `domain-modeling` and `project-showcase` write them.
- **Copy from:** Splitnext `AGENTS.md`, `CONTEXT.md` and `docs/adr/`.

## 13. Minimum user experience

- **Rule:** Each app works from a 320 px phone to a wide desktop with no sideways scroll, respects reduced motion, has visible keyboard focus, sets the page language, and works offline where its data allows.
- **Why:** These are the parts that users notice first when they are missing.
- **Check:** A browser test checks for sideways overflow at 320, 390, 768 and 1440 px; axe (area 7) covers focus and language.
- **Copy from:** Portfolio `tools/ui-check.mjs` (widths); Career Desk (skip link and focus); Splitnext service worker for offline.

## 14. Feature flags

- **Rule:** Unfinished work that must be merged hides behind one typed setting for each environment: on in local and staging, off in production. Each flag has an owner task and is removed when the work is finished.
- **Why:** Small slices can merge without showing half-finished screens to users, with no external flag service.
- **Check:** The generated environment types include each flag; a test checks the behavior with the flag off.
- **Copy from:** Splitnext `ENABLE_DEBUG_INSPECTION` in `wrangler.jsonc`.
