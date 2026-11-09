# App standard inventory (task #82)

Input for #84 (the written standard) and #83 (how the standard ships). It records what the owner's projects already do in each area of #81, with file paths, so the standard copies working code instead of inventing rules. It does not recommend rules; the "best reference" lines and the stack summary are inputs for #83 and #84 to confirm.

Surveyed 2026-11-09, read-only, from the repos under `C:\Users\santi\code\`. All paths below are relative to that project's root unless they start with `docs/research` or `research`. Reuses `research/design-taste-profile.md`, `research/design-skills-survey.md` and `docs/research/test-suite-audit.md` (project-delivery, task #41) rather than repeating them.

**Maturity scale.** **Strong** = works, is enforced or documented, and could be copied. **Partial** = real but narrow, manual or undocumented. **Basic** = a trace of it. **None** = nothing found. A grep for a keyword that finds nothing means "none found", not proof of absence.

## Headline findings

1. **Splitnext is the reference for almost every area, but it is not a React + Vite app.** Its client is Expo 57 / React Native 0.86 rendered to the web with react-native-web and Expo Router (`apps/client/package.json`, ADR 0013). Only the Worker side is plain TypeScript (Hono on Cloudflare Workers, D1, SQLite Durable Objects). Its component catalog, tokens and `.web.tsx` platform variants are tied to React Native primitives. Its showcase, lab, deploy script, check tiers, lint and hooks are not.
2. **Four areas have no implementation anywhere:** automated accessibility checks (no axe), performance and bundle budgets (no Lighthouse, no size limits), dependency automation (no Renovate, no Dependabot, no `npm audit` in any workflow), and feature flags. i18n is also absent: the only trace is `lang="en"`.
3. **Before/after evidence is not built into any project.** Splitnext records only the "after" (the showcase). Flyscan's verification records are the closest thing to a comparable baseline for non-visual changes. The standard will have to get this from the delivery workflow, not from a project.
4. **No project has all three of preview, staging and production.** Splitnext has staging only (production is a placeholder id). Rankzap deploys straight to production on push to `main`. OV Berlin has staging on the Beelink and production on GitHub Pages. Nothing deploys a preview per `wip/` branch.
5. **Observability is home-grown, and Splitnext's version is the good one.** No project uses Sentry or product analytics; Splitnext deliberately has none ("no analytics on how people use the app", `docs/operations.md`).

## Projects surveyed

| Short | Project | What it is | Activity |
|---|---|---|---|
| SN | `splitnext` | Offline-first shared-expense ledger | 233 commits, 2026-09-15 to 2026-11-06 |
| FS | `flyscan` | Flight price comparison: TypeScript backend, one Python curl-transport helper, Tauri desktop app | 122 commits |
| OV | `berlin-cinema` | OV Berlin: cinema showtimes site plus a scraping and entity-resolution pipeline | 665 commits |
| RZ | `rankzap` | Live ranked voting | 57 commits |
| SQ | `snapquiz` | AI party quiz on a TV with phones | 140 commits, no CI |
| PF | `portfolio` | Public portfolio site | 38 commits |
| TR | `treem` | Declarative state-management library plus example apps | 30 commits |
| CD | `career-desk` | Private career record with an agent-first CLI and a read-only UI | 6 commits |

## Matrix

Cells say what exists in a few words. Details, paths and evidence are in the per-area notes below.

| Area | SN splitnext | FS flyscan | OV berlin-cinema | RZ rankzap | SQ snapquiz | PF portfolio | TR treem | CD career-desk |
|---|---|---|---|---|---|---|---|---|
| **1. Design system and tokens** | **Strong**: `tokens.ts`, 13 `design/` files, role-named colours | Partial: 34 CSS vars, one file | **Strong** (documented): `DESIGN.md` + `DESIGN.json`, Tailwind tokens | Partial: Tailwind 4 `@theme` + 16 poll palettes | Partial: shadcn base, 77 CSS vars | Partial: 63 CSS vars, day/night themes | None | Basic: 6 CSS vars |
| **2. Component reuse and lab** | **Strong**: `/components` catalog (1,085 lines) + device lab | None | Basic: 7 `components/ui/` primitives | Partial: `_harness/` component pages | None (shadcn `components/ui`) | None | Partial: `examples/` + devtool | None |
| **3. Flows showcase** | **Strong**: `showcase/` (11 flows, video + conditional-UI cases) | None (docs screenshots) | Partial: `scripts/screenshot.ts` | Partial: `_harness/capture-screens.mjs` | None (1 screenshot) | Basic: `ui-check.mjs` walk | Basic: live example pages | Basic: `ui-check.mjs` walk |
| **4. Before/after evidence** | Partial: after-only showcase; `docs/design-alternatives/` | **Partial**: commit-bound `evidence.json` + negative controls | Partial: `pipeline:compare`, rollout baseline JSON | Partial: `design-explorations/` screenshots | None | None | None | None |
| **5. Seed data and demo mode** | **Strong**: `workbench/` fixtures feed catalog, lab, tests | **Strong** (network): `tests/recordings/` replay | Partial: `pipeline/*-fixtures.ts`, `seed-audit` | Partial: demo polls seeded over WS | None | Partial: `src/data/projects.ts` | None | Partial: fictional UI-test thread |
| **6. Test tiers** | **Strong**: `check:fast` (pre-push) / `check` (CI) | Strong: pre-commit + 5 test suites, 5 CI jobs | Partial: one `npm test` tier, 33 ts-node scripts | None | None | Partial: unit + `test:ui` | Partial: 113 tests, not in CI | Partial: unit + `test:ui` |
| **7. Budgets (perf, a11y, bundle)** | Partial: `storageBudget` test only | None | None | Basic: `check-contrast.mjs` | None | Partial: overflow check, 4 widths × 2 themes | None | None |
| **8. Environments and CI/CD** | **Strong** staging: `wrangler` env + `deploy.mjs`; no prod | **Strong** release: `Release` workflow, signed updater | **Strong**: tag → Beelink → Pages; staging on Beelink | Partial: push-to-main → prod | Partial: `deploy.js`, no CI | Partial: PR checks + Pages deploy | Partial: Pages deploy of examples | Partial: checks only |
| **9. Observability** | **Strong**: request ids, `/client-errors`, `/health`, `/ready`, debug routes | Basic: logging, build identity | Partial: audit log, `notify()` hook, build stamp | Basic: Workers `observability` on | None | None | None | None |
| **10. Secrets** | Partial: none in repo; Cloudflare login | **Strong**: gitleaks hook, signing key in GH secrets | **Strong**: documented `.env.example`, Beelink `secrets.env` | Partial: GH secrets, deploy skips if unset | Partial: `.env.example`, gitignored | **Strong**: `public-files.json` allowlist | None needed | Partial: `private/` gitignored |
| **11. Dependency hygiene** | Partial: pinned `overrides`, type-aware lint | Partial: SHA-pinned actions, `uv.lock`, pinned hook revs | Basic: `npm ci`, `.nvmrc`, engines | Partial: exact pins, but lockfile drift broke deploys | None | None | None | None |
| **12. Repo knowledge** | **Strong**: AGENTS.md, CONTEXT.md, 30 ADR files, spec, architecture, ops | **Strong**: AGENTS.md, GLOSSARY, CODING_STANDARDS | Strong: PRODUCT/DESIGN.md, `docs/agents/`, 7 docs | Partial: long README | Partial: README | Partial: README | Partial: README, INTERNALS.md | **Strong**: AGENTS.md, CONTEXT.md, ADR 0001 |
| **13. UX baseline** | Partial: PWA offline shell, reduced motion, light only, 166 a11y attrs | Partial: dark only, reduced motion | Partial: PWA + dark only, `lang=en` | Partial: reduced motion, light only | None | **Strong**: system + manual theme, reduced motion, overflow | None | Partial: skip link, focus-visible |
| **14. Feature flags** | Basic: `ENABLE_DEBUG_INSPECTION` | None | Basic: `PIPELINE_MODE`, `SOURCE_DISABLED` | None | None | None | None | None |
| **15. Static checks and git hooks** (extra) | **Strong**: oxlint type-aware + vendored anti-slop, `pre-push` | **Strong**: ruff, tsc, gitleaks via pre-commit | None | None | None | None | None | None |

## Per-area notes

### 1. Design system and tokens

- **SN**: `apps/client/src/design/tokens.ts` holds every colour, size and duration, each with a doc comment on its role ("a role gets its own token only when no other token already looks and means the same"). `design/` has 13 files: `Text`, `Button`, `Field`, `controls`, `feedback`, `structure`, `layout`, `Avatar`, `BrandMark`, `icons`, `initials`, `index.ts`. Screens must take values from here. One fixed light theme; fonts served locally.
- **OV**: `DESIGN.md` is a front-matter spec (colours, typography, rules such as "Flat-By-Default") plus `DESIGN.json` (schema v2 with colour roles and tonal ramps), alongside `PRODUCT.md` (principles). Tokens live in `tailwind.config.js` and `src/index.css` (28 CSS vars). `src/components/ui/` has `Badge`, `Button`, `Card`, `MoviePoster`, `MultiSelectDropdown`, `RatingBadge`, `TextInput`. This is the best written design brief, but it has no live catalog.
- **RZ**: `src/styles/index.css` uses Tailwind 4 `@theme inline` with semantic tokens and sixteen per-poll palettes (`src/lib/pollColour.ts`). `design-explorations/` holds five competing designs and an `IMPLEMENTATION-PLAN.md`.
- **FS**: `desktop/src/styles.css` (34 custom properties: `--bg`, `--panel`, `--ink`, `--accent`, ...) and `flyscan.css` (22). No token doc.
- **PF**: `src/styles.css` (63 custom properties), `src/Tweaks.tsx` for visitor preferences.
- **SQ**: shadcn/ui base (`components.json`, Radix, cva, `tailwind-merge`), 77 CSS vars in `src/styles.css`. The taste profile calls it "older shadcn defaults".
- **CD**: one minified stylesheet, `src/client/workspace.css`, with 6 custom properties.
- **TR**: n/a (library).
- The look of each app is already described in `research/design-taste-profile.md`; this inventory only covers the machinery.

### 2. Component reuse and component lab

- **SN** is the only real lab, in two parts.
  - **Catalog** at `/components`: `apps/client/src/catalog/` (`Catalog.tsx`, `components.tsx`, `foundations.tsx`, `screens.tsx`, `doc.tsx`). Each page is a `DocPage` with a summary, a `source:` path, `Usage`, `Props` and live `Example` blocks. It also catalogues whole screens in conditional states (for example `screen('loading', 'Loading', ...)`). Gated by debug inspection (`devtools/available.ts`).
  - **Device lab**: `lab/` (supervisor `server.mjs`, `cli.mjs`, `inspector.mjs`, `runtime.mjs`, UI panels), described for agents in `docs/agents/device-lab.md`. It runs real browser devices or many in-page devices, with online/offline toggles, checkpoints, a request timeline and action forms built from the app's action schemas. Guarded by `lab:test` (in `check:fast`) and `lab:acceptance`. ADRs 0027–0029 explain it. The lab is about multi-device sync, which most other apps do not need; the catalog is the part the standard wants.
- **RZ**: `design-explorations/_harness/` has Vite pages for the admin, home and voter screens (`admin.tsx`, `home.tsx`, `voter.tsx`) over a fake room (`fakeRoom.tsx`, `fakeHomeRoomClient.ts`). It is a manual stand-in for a lab and not linked to the real components' states.
- **TR**: `examples/` (counter, pricing, shop, search, react-todo, devtool) are the "component demos", deployed to Pages.
- **OV, FS, PF, SQ, CD**: no catalog. OV has the 7 shared primitives; FS components are plain files in `desktop/src/`.
- **No project shows every state** (loading, empty, error, long content, offline) in one place. SN's catalog and showcase `cases.spec.ts` come closest, by listing conditional UI per area.

### 3. Flows showcase

- **SN** `showcase/`: `capture.spec.ts` drives 11 named flows (`start`, `expenses`, `people`, `settle`, `invite`, `join`, `realtime`, `history`, `offline`, `leave`, `big`) on a 390×844 phone viewport. It records one video per flow with an injected cursor and captions, takes screenshots at key moments, and logs steps. `cases.spec.ts` spotlights every conditional element (empty, offline, failure, conflict) by area, and a case that cannot be reached is saved as "missing" with the reason. `build.mjs` turns `showcase/out/` into `index.html`. Run with `npm run showcase`. It starts its own Worker on port 8793 with fresh state (`showcase/playwright.config.ts`), so it is deterministic. Output is not committed (20 MB locally).
- **RZ**: `design-explorations/_harness/capture-screens.mjs` and `capture-readme.mjs` seed demo polls over the poll server's WebSocket, then screenshot for the README and portfolio. Screenshots only, no flows, and it imports Playwright from the `career-desk` checkout by absolute path.
- **OV**: `scripts/screenshot.ts` (`npm run screenshots`) captures five README screenshots from the live or local site at desktop and mobile sizes, in dark scheme.
- **PF, CD**: `tools/ui-check.mjs` and `tests/ui-check.mjs` are Playwright walkthroughs that assert, not record. The skills repo already has the README and showcase-media skill (`project-showcase`, task #23), which is the capture standard for README media.
- **FS, SQ, TR**: static screenshots only (`docs/screenshots/`, `docs/screenshot.png`, `docs/brew-shop.png`).

### 4. Before/after evidence

- **None of the projects produces comparable before and after pairs.** What exists:
  - **FS** `docs/verification.md` and `scripts/verify.mjs`: `discover`, `doctor`, `run recorded-search`, `controls` and `evidence RUN_ID`. Evidence goes to ignored `tmp/verification/RUN_ID/evidence.json` with hashes and outcomes, is bound to the commit and a source fingerprint, and a stale run is not green. `controls` deliberately breaks a copy of the recording (count, digest, truncation) and requires the replay to fail for the expected reason. This is the best model for non-visual evidence, and the only negative-control pattern.
  - **OV** `npm run pipeline:compare`, `pipeline:eval`, `docs/ingestion-rollout-baseline.json`, `docs/ingestion-rollout-observations.md`, `docs/metadata-audit-2026-10-30.md`: data-level before/after of the pipeline, with a shadow mode (`PIPELINE_MODE=shadow`) that processes without publishing.
  - **SN** `docs/design-alternatives/` (`round-2.html` … `round-5.html`, `design-*.png`): design options compared before choosing. `showcase/out` is overwritten by each run, so there is no baseline to diff. Root-level `.visual-after.log`, `.visual-observation.log` and similar files are untracked agent leftovers (`*.log` is gitignored).
  - **RZ** `design-explorations/screenshots/` and per-design review notes (`home-review.md`, `connection-review.md`).
- Nothing records a baseline automatically or diffs images. The delivery workflow (`delivery evidence`) is currently the only place this is standardised.

### 5. Seed data and demo mode

- **SN**: `apps/client/src/workbench/` (`fakeApp.ts`, `app.ts`, `memberListFixture.ts`) builds a fake app controller used by the catalog and devtools; `src/memoryTransport.ts` plus `test/harness.ts` give in-memory server and client for tests; `test/virtualNetwork.test.ts` and `apps/client/src/lab/virtualNetwork.ts` fake the network. Deterministic enough to power catalog, lab and tests from shared fixtures. There is no public demo mode.
- **FS**: `tests/fixtures/` and `tests/recordings/` replayed by `backend/src/transport.ts`; `FLYSCAN_OFFLINE=1` is set for tests and verification, and the replay "fails loudly on an unrecorded URL". `AGENTS.md` makes offline mode the default. Best network-replay pattern.
- **OV**: `pipeline/evaluation-fixtures.ts`, `pipeline/rollout-fixtures.ts`, `scripts/seed-audit.ts` (baselines the audit log from the published snapshot on build), and `public/movies.json` committed as data. Seeds are test data for a pipeline, not UI demo data.
- **RZ**: demo polls seeded for screenshots (`capture-screens.mjs`), `design-explorations/_harness/live-test-room.json`.
- **PF**: content records in `src/data/projects.ts`; `src/career-content.json` as an approved override layer from career-desk.
- **CD**: `tests/ui-check.mjs` uses a fictional thread id so no private data reaches tests.

### 6. Test tiers

- **SN** (best): `package.json`
  - `check:fast` = `scripts/check-text.mjs` (BOM and mojibake), `types:check` (generated Worker types), `lint` (oxlint type-aware), `typecheck`, `app:typecheck`, `wrangler deploy --dry-run`, `lab:test`, `npm test` (vitest, Workers pool). Runs in `.githooks/pre-push`, with a WSL branch.
  - `check` = `frontend:check` (app build and service-worker syntax) + `check:fast` + `test:e2e` (Playwright against a local Worker). Runs in `.github/workflows/check.yml` on every PR and push to `main`; failed runs upload Playwright traces.
  - No heavy tier (device or perf runs) exists. `lab:acceptance` is the nearest thing.
  - Test styles worth copying: property-based tests with `fast-check` (`test/money.test.ts`, `syncConvergence.test.ts`) whose shrunk failures are kept as `examples`; a table of every command rule (`groupCommandRules.test.ts`); `actionModel.test.ts` auto-covers new app actions. Note the audit's finding that SN's browser job takes about 9 minutes against 2m43 for the rest of the check, and that almost all of its CI failures were E2E flakes.
- **FS**: `.pre-commit-config.yaml` (hygiene, ruff, gitleaks, tsc) + `npm test` (backend 99, desktop 274, packaging 8, transport, verification) + `ci.yml` (5 jobs: pre-commit, tooling, desktop, web, backend) + `ci-packages.yml` (not required) + `ci-tauri.yml`. `test:verification` is not run in CI (audit finding 7).
- **OV**: one tier. `npm run typecheck` + `npm test` in `ci.yml`, built from ~33 `ts-node` launches (147 s in CI, over 600 s locally). No browser tests.
- **PF, CD**: `npm test` + `check:public`/`build` + Playwright `test:ui`; PF runs it on PRs (`checks.yml`) and again before deploy.
- **TR**: `npm test` (`tsc --noEmit` + `tsx test.ts`, 113 tests); not run in CI.
- **RZ, SQ**: no tests. RZ has ad-hoc `_harness/check-*.mjs` scripts.

### 7. Budgets (perf, a11y, bundle)

- Nothing enforces a bundle size, Lighthouse score or axe result in any project.
- **SN** `test/storageBudget.test.ts`: the persisted installation document must stay under 128 KiB (about 1.5× today's 88 KiB) and each operation within a frame. "Raise a budget only on purpose." A good pattern for budgets as tests with a stated headroom.
- **RZ** `design-explorations/_harness/check-contrast.mjs` writes `contrast-report.json`; not run in CI.
- **PF** `tools/ui-check.mjs` asserts no horizontal overflow in every section at 1440, 768, 390 and 320 px in both themes.
- **FS** and **OV** have no budget checks.

### 8. Environments and CI/CD

| | Preview | Staging | Production | Trigger |
|---|---|---|---|---|
| SN | None | **`env.staging` in `wrangler.jsonc`**: own Worker `splitnext-api-staging`, own D1 (`splitnext-staging-index`), own Durable Objects | Placeholder D1 id; not deployed | Manual `npm run deploy:staging` (`scripts/deploy.mjs`) |
| FS | None | None | GitHub Release of signed Tauri updater assets for Windows, macOS, Linux | `Release` workflow (`workflow_dispatch`, version and notes inputs) |
| OV | None | Beelink build of `origin/main` with production data, served on :4174 over Tailscale (`ops/beelink/ovberlin.sh staging`, `preview.allowedHosts`) | GitHub Pages (`publish.yml`) | `npm run release` tags `v*`, the Beelink poller deploys within 5 minutes |
| RZ | None | None | Cloudflare Worker, `rankzap.site` (`wrangler.jsonc` routes) | Push to `main` (`deploy.yml`) |
| SQ | None | None | PartyKit (`scripts/deploy.js`) | Manual |
| PF | None | None | GitHub Pages (`deploy.yml`) | Push to `main`; PR checks in `checks.yml` |
| TR | None | None | Examples on GitHub Pages | Push to `main` |
| CD | n/a | n/a | n/a (private, local) | `checks.yml` on push |

- **SN `scripts/deploy.mjs`** is the model for a deploy step: refuse a dirty tree, build, apply D1 migrations to that environment, then `wrangler deploy --var DEPLOY_SHA:<sha>` so the running Worker says which commit it is (`GET /health`). Migrations are in `migrations/`; the Worker bundle is checked by `wrangler deploy --dry-run` in `check:fast`.
- **FS `release.yml`**: all actions pinned to commit SHAs; a first job refuses to tag until every release destination is configured; version bump and tag are one job; per-OS build matrix; updater assets are signed (`TAURI_SIGNING_PRIVATE_KEY`). Releases only on the owner's request (`AGENTS.md`).
- **RZ `deploy.yml`**: skips quietly when `CLOUDFLARE_API_TOKEN` is unset. The audit found 11 of 38 runs failing on lockfile drift.
- **OV** also publishes via an artifact-in-a-release hand-off (`site-live` release downloaded by `publish.yml`); nothing is committed.
- Migrations: forward-only D1 migrations (SN), none elsewhere. Backups: SN documents D1 Time Travel and Durable Object point-in-time recovery in `docs/operations.md` but admits the group-restore path does not exist yet; OV keeps the last 20 pre-run state copies (`backup_state` in `ovberlin.sh`).

### 9. Observability

- **SN** (best):
  - `wrangler.jsonc`: `"observability": { "enabled": true, "head_sampling_rate": 1 }` and `LOG_REQUESTS`.
  - Request log lines (`event: "request"`, `unhandled_error`, `client_error`) carry route, status, duration and ids, never names, amounts, links or keys. Tests: `test/requestLog.test.ts`, `diagnostics.test.ts`, `clientErrors.test.ts`.
  - Browser errors are POSTed to `/client-errors` (stack frames and page path, no messages, at most five distinct reports per page) and carry the Worker's revision.
  - Request ids join client reports to Worker logs. **Copy diagnostics** in the in-app devtools (`apps/client/src/devtools/`) copies a report; `/app?devtools` and `/components` need debug inspection.
  - `GET /health` returns the deployed commit (`DEPLOY_SHA`); `GET /ready` checks D1 and the Durable Object.
  - `ENABLE_DEBUG_INSPECTION` is a `wrangler.jsonc` var (false in every deployed environment), set true by `npm run dev`, the lab and Playwright; `src/routes/debug.ts` returns 404 for `/debug/*` unless true. Tested in `test/identities.test.ts`.
  - `docs/operations.md` has the monitoring, backup and release checklist.
- **OV**: `api/audit-log.ts` and `public/audit/` (provenance for every published value), a `notify()` webhook in `ovberlin.sh` (`NOTIFY_URL`), and `__BUILD_VERSION__` (git hash and time) in the footer.
- **FS**: plain application logging, `desktop/src/BuildIdentity.tsx`, Tauri updater version; no remote error reporting.
- **RZ**: `observability.enabled` in `wrangler.jsonc` only.
- No project uses Sentry (the `siSentry` hit in PF is an icon), analytics, or tags errors with release versions beyond SN's `revision`.

### 10. Secrets

- **FS**: `gitleaks` in `.pre-commit-config.yaml` (also runs in CI through pre-commit); `TAURI_SIGNING_PRIVATE_KEY` as a GitHub secret; `AGENTS.md` bans live requests that risk IP bans.
- **OV** `.env.example` documents every key with where to get it and a rule: "Keep every key server-side (never use a VITE_ prefix)", "keep the real key only in .env / GitHub secrets". The Beelink runner sources `$OVB_ROOT/secrets.env` outside the repo. Decision-model spend is capped in config (`DECISION_MONTHLY_USD_LIMIT`).
- **PF** `public-files.json` allowlist plus `tools/check-public.mjs` (fails on any unreviewed file in `public/`, on German CVs, on names matching private patterns): a guard against publishing private data, run in CI.
- **RZ** `deploy.yml` reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from repository secrets. **SQ** has `.env.example` (OpenAI key) with `.env` untracked. **CD** gitignores `private/`, `.env`, `profile.json`, `dashboard.json`, `output/`.
- **SN** keeps no secrets in the repo (device credentials are generated per installation and stored as hashes; invite tokens are stored as hashes, ADR 0009), and uses local Cloudflare login for deploys. Its `AGENTS.md` makes production deployment and remote data changes an explicit owner decision.
- No secret-scanning in SN, OV, RZ, SQ, PF, TR or CD.

### 11. Dependency hygiene

- No Renovate or Dependabot config in any repo; no audit step in any workflow.
- **FS**: actions pinned by SHA with version comments, `uv.lock`, pre-commit hook revs pinned, Rust `Cargo.lock`.
- **SN**: `overrides` pin `react`, `react-dom` and `react-native` (`package.json`); lockfile; `.nvmrc`; `wrangler types --check` fails when generated types drift from the config.
- **RZ**: exact versions (no `^`) for most dependencies, yet the lockfile drifted from `package.json` and broke 11 deploys.
- **OV**: `.nvmrc` and `engines.node: 24.x`; the Beelink reinstalls only when the lockfile hash changes.
- Most workflows use floating `actions/*@v4`/`@v5` tags except FS.

### 12. Repo knowledge

- **SN** (best): `AGENTS.md` is a short index: "Read these before changing behavior", the working agreement, boundaries, and links to `CONTEXT.md` (domain language with `_Avoid_` lists), `docs/product-spec.md`, `docs/architecture.md`, `docs/operations.md`, `docs/support-playbook.md`, 30 ADR files (numbered 0001–0029; 0020 is used twice) in `docs/adr/` and `docs/agents/{domain,issue-tracker,device-lab}.md`. The README has a check table mapping each test file to what it guarantees. "If a decision changes, update the relevant document in the same slice."
- **FS**: `AGENTS.md` (offline rule, how to show a change on the Beelink, check commands), `GLOSSARY.md`, `CODING_STANDARDS.md` (15 numbered rules "describing what the code already does"; its Python rules are partly stale, since the scraper moved to the TS backend), `CLAUDE.md`.
- **CD**: `AGENTS.md`, `CONTEXT.md`, `docs/adr/0001-agent-first-rebuild.md`, `skills/career-profile-builder`. **OV**: `AGENTS.md` (skill config only), `PRODUCT.md`, `DESIGN.md`, `docs/agents/`, pipeline docs. **TR**: `INTERNALS.md`; its `AGENTS.md` only holds a generated "graphify" block. **RZ, SQ, PF**: README only (PF's README is accurate and detailed; RZ's is long; SQ's is a product description).
- Stale docs seen: OV `README.md` still lists a "Dark / light theme" though the app is dark only (`index.html` has `class="dark"`, no toggle).

### 13. UX baseline

| | Responsive | Dark mode | A11y | i18n | PWA / offline |
|---|---|---|---|---|---|
| SN | Phone-first, 390 px showcase | Light only (one fixed theme) | 166 `aria-*`/`accessibility*` attributes, `lang="en"`, reduced-motion in `.web.tsx` variants | None | Service worker precache (`scripts/service-worker.js`, versioned cache name); offline-first data |
| FS | Desktop app | Dark only | Reduced-motion | None | n/a (Tauri) |
| OV | Mobile + desktop | Dark only | `lang="en"` | None | `vite-plugin-pwa` (manifest, runtime caching for `movies.json`, posters, fonts) |
| RZ | Mobile-first | Light only | Reduced-motion | None | None |
| PF | Tested at 4 widths | `prefers-color-scheme` plus manual Day/Night in Tweaks | Reduced-motion in test | None | None |
| SQ | Phones + TV | Light | None found | Quiz language selectable in the game | None |
| CD | Menu at 700 px | Light | Skip link, `:focus-visible`, `aria-current`, reduced-motion | None | None |

### 14. Feature flags

- No flag system. The patterns that exist:
  - **SN** `ENABLE_DEBUG_INSPECTION` (string var in `wrangler.jsonc`, typed in generated `worker-configuration.d.ts`, per-environment, overridable with `--var`).
  - **OV** `PIPELINE_MODE` (`live` | `shadow`) and `SOURCE_DISABLED`, documented in `.env.example`.
  - **RZ** per-poll settings (`allowRevote`, `showLiveResults`, ...) are product settings, not flags.

### 15. Static checks and git hooks (extra)

- **SN** `.oxlintrc.json` runs `oxlint --type-aware` with the vendored `tools/oxlint/anti-slop/` plugin (provenance in `UPSTREAM.md`: `dmmulroy/anti-slop` at a pinned revision, installed by the `install-anti-slop` skill) enabling 20 rules, for example `no-array-filter-map`, `no-chained-type-assertions`, `no-module-mocking`, `no-object-parameters`, `no-unknown-parameters`, `no-widen-then-assert`, `require-readable-spacing`, plus `typescript/no-deprecated` and `oxc/no-accumulating-spread`, all as errors. Effect-specific rules exist under `anti-slop/effect/` but are not enabled. `scripts/check-text.mjs` catches BOMs and mojibake. `scripts/install-hooks.mjs` runs on `prepare` and sets `core.hooksPath` to the tracked `.githooks/pre-push`, which runs `check:fast` and skips with `--no-verify`.
- **FS** pre-commit (ruff check and format, merge-conflict, yaml, toml, large files over 1 MB, gitleaks, two `tsc` hooks) and a Claude `PostToolUse` hook that formats edited files (`.claude/hooks/format-edited.sh`). CI repeats the same hooks so `--no-verify` does not get anything past.
- Nobody else has lint, formatter or hooks (checked `package.json`/config in OV, RZ, SQ, PF, TR, CD).

## Best existing implementation per area

| Area | Best reference | Why | Gap to close in the standard |
|---|---|---|---|
| 1. Design system and tokens | **SN** `apps/client/src/design/tokens.ts` + `design/`; the brief format from **OV** `DESIGN.md`/`DESIGN.json` | Role-named tokens that every screen must use, with the rule written next to them; OV's brief is the best human-readable spec | SN's tokens are RN `StyleSheet` objects; a web default needs CSS variables (PF/FS/OV/RZ pattern) or Tailwind `@theme` (RZ) |
| 2. Component reuse and lab | **SN** `apps/client/src/catalog/` + `lab/` | Only live catalog, with usage, props, source path and examples; states per screen | Tied to React Native web; needs a port to the default stack; no "reuse first" enforcement exists |
| 3. Flows showcase | **SN** `showcase/` | Deterministic own-state Worker, video per flow, spotlighted conditional states, unreachable cases listed | Output not committed or linked from the README; no diff against a baseline |
| 4. Before/after evidence | **FS** `scripts/verify.mjs` for non-visual; **SN** showcase for visual (after only) | Commit-bound evidence with negative controls | A real baseline capture is still unbuilt; falls to the delivery workflow |
| 5. Seed data and demo mode | **SN** `apps/client/src/workbench/` for UI; **FS** `tests/recordings/` for network | One fixture set feeding catalog, lab and tests; loud-failing replay | No public demo mode; no shared seed format across projects |
| 6. Test tiers | **SN** `check:fast` / `check` | Clear two tiers, hook plus CI use the same commands, text hygiene and dry-run deploy included | No heavy tier; E2E flakiness cost (see test audit) |
| 7. Budgets | **SN** `test/storageBudget.test.ts` (pattern); **PF** `ui-check.mjs` (overflow) | Budgets as tests with stated headroom | No a11y, bundle or perf budget exists; needs new work |
| 8. Environments and CI/CD | **SN** staging (`wrangler.jsonc` env + `scripts/deploy.mjs`) plus **FS** `release.yml` discipline; **OV** for tag-driven prod | Separate resources per environment, SHA stamp, dirty-tree refusal; pinned actions and a destination pre-check | No prod environment in SN; no preview per branch anywhere |
| 9. Observability | **SN** | Request ids, privacy-safe logs, client error endpoint, health/ready, gated debug routes and devtools, ops doc | No Sentry or alerting; no release tagging beyond `DEPLOY_SHA`; no analytics (deliberate) |
| 10. Secrets | **OV** `.env.example` conventions + **FS** gitleaks | Documented per-key, server-side only, scanned on commit; **PF** allowlist for public files | No single standard; SN has no secret scan |
| 11. Dependency hygiene | **FS** (pinned actions, lockfiles, pinned hook revs) | Only partial practice | Automation entirely missing |
| 12. Repo knowledge | **SN** | Index-style `AGENTS.md`, `CONTEXT.md`, 30 ADR files, spec, architecture, ops, playbook, with the "update docs in the same slice" rule | Matches the skills in `domain-modeling`; CD and FS are smaller models |
| 13. UX baseline | **PF** for theme, motion, width checks; **OV** and **SN** for offline/PWA; **CD** for skip link and focus | Each project has one part | No i18n; no automated a11y; dark mode only in PF |
| 14. Feature flags | None; **SN** `ENABLE_DEBUG_INSPECTION` pattern is the closest | Typed per-environment var | A flag mechanism for shipping incomplete work to staging does not exist |
| 15. Static checks and hooks | **SN** | Type-aware lint, vendored anti-slop, pre-push hook; **FS** for secret scanning and repeating hooks in CI | Only two projects have any |

## Stacks in use

| Project | Client | Server / data | Build and tooling | Tests | Host |
|---|---|---|---|---|---|
| SN | **Expo 57 / React Native 0.86 + react-native-web**, Expo Router, React 19.2 | **Hono + zod-openapi on Cloudflare Workers; D1; SQLite Durable Object per group** | TS 7, npm workspaces, wrangler 4, oxlint 1.83, Node via `.nvmrc` | vitest 4 (Workers pool), fast-check, Playwright, `node --test` (lab) | Cloudflare (staging) |
| FS | React 19 + Vite 6, inside **Tauri 2** (Rust) | **TS backend** (Node CLI + local API, bundled to CJS) plus one Python curl-transport helper (`flyscan/transport.py`, uv, ruff) | tsc, esbuild, pre-commit | `tsx --test` / `node --test` (backend, desktop, packaging), replay verification | GitHub Releases (signed updater) |
| OV | React 19 + **Vite 7** + Tailwind 3 + react-router 7 + vite-plugin-pwa | Static JSON; ts-node pipeline (cheerio, zod) on a Beelink | tsc, Node 24 | ts-node scripts (~33), no browser tests | **GitHub Pages** + Beelink |
| RZ | React 19 + **Vite 8** + Tailwind 4 + react-router 7, dnd-kit | **Cloudflare Worker + SQLite Durable Object** via `@cloudflare/vite-plugin` | TS 6 | none | **Cloudflare Workers** (production only) |
| SQ | React 19 + esbuild via PartyKit + Tailwind 3 + shadcn/Radix + zustand + framer-motion | **PartyKit** (Cloudflare Durable Objects) + OpenAI + R2 | Node 20 | none | PartyKit |
| PF | React 19 + **Vite 8**, no router | Static | TS 5.7, Node 22 | `node --test`, Playwright script | **GitHub Pages** |
| TR | TypeScript library; examples in Vite | None | tsc, tsx | `tsx test.ts` (113) | npm-style package, Pages for examples |
| CD | React 19 + **Vite 8** | Node ESM CLI with a local server | Node 22 | `node --test`, Playwright script | Local, private |

**Counts.**
- **React 19:** 7 of 8 (all but the TR library, whose examples use it).
- **TypeScript:** 8 of 8 (FS has one Python helper file besides its TS backend).
- **Vite:** 5 of 8 (FS desktop, OV, RZ, PF, CD; TR examples also).
- **Cloudflare:** Workers or Durable Objects in 3 (SN, RZ, SQ through PartyKit); GitHub Pages in 3 (OV, PF, TR).
- **Tailwind:** 3 (OV v3, RZ v4, SQ v3). Hand-written CSS custom properties: 3 (FS, PF, CD), plus SN's token objects.
- **Test runners:** `node --test` or `tsx --test` is the most common (FS, PF, CD, SN lab; OV and TR run scripts through ts-node or tsx); only SN uses vitest. Playwright is used in SN, PF and CD (committed), OV and RZ (scripts).
- **Node versions:** 20 (SQ), 22 (FS, PF, CD, RZ CI), 24 (OV); SN pins through `.nvmrc`.

**What this suggests for the default stack (input for #83, not a decision).**
- The newest and most-maintained web apps already converge on **React 19 + TypeScript + Vite + Cloudflare Workers** (RZ today; SN's server side). SN's deploy script, staging environment, observability, debug flag, check tiers and lint all work on that stack unchanged.
- **Expo / React Native web** is only justified when a native app is a real goal. If the standard defaults to it, the component catalog and tokens carry over; if it defaults to Vite + React, the catalog has to be rebuilt (the showcase, lab supervisor, `deploy.mjs`, `check:fast` shape, oxlint and hooks do not). This is the main question #83 should settle.
- **Styling:** Tailwind 4 `@theme` (RZ) and hand-written CSS variables (PF, FS) are both in use. Tokens must stay readable by agents, which both are; OV's `DESIGN.json` adds machine-readable roles.
- **Test runner:** vitest is the SN choice and works with the Workers pool; the `node --test` projects are plain Node.
- Non-web shapes need their own track: FS (Tauri desktop app), TR (library) and CD (local CLI) are not covered by a web-app golden path.

## Not found anywhere (to build, not to copy)

- Axe or any automated accessibility check; Lighthouse or Core Web Vitals; bundle-size limits.
- Renovate or Dependabot; `npm audit`, `pip-audit` or `cargo audit`.
- Sentry or any third-party error tracking; product analytics.
- Feature flags beyond environment variables.
- i18n.
- Preview deploys per branch; a production environment in the same repo as a staging one (SN's production is unconfigured).
- Visual diff against a stored baseline.
- A public demo mode.

## Method and limits

- Read-only: directory listings, config, workflow files, package manifests, scripts and docs; targeted `grep` for keywords (`sentry`, `i18n`, `axe`, `lighthouse`, `renovate`, `dependabot`, feature-flag terms, `prefers-color-scheme`, service worker). Test counts and timings come from the existing test audit and were not re-measured.
- Nothing was run (no installs, builds, deploys, tests or showcases). Maturity ratings are from reading the files, not from executing them.
- CI/CD detail comes from the workflow files in the repos. Run history and secrets configured in GitHub or Cloudflare were not inspected, so "uses secret X" means "the workflow references it".
- `career-desk` has no examined deploy; its UI is a local read-only view. `treem` is a library and several areas do not apply.
- The generated `.audit-*.log`, `.motion-*.log` and `.verification*.log` files in the Splitnext root are untracked agent output and were ignored.
