# Design skills survey (task #48)

Input for #14 (one custom design skill set) and #50 (writing it). #49 covers the owner's own taste, so this report covers only what existing skills offer. Surveyed 2026-11-09.

## Sources and method

- **Installed skills** were read from `~/.skills-manager/skills/<name>` (`~/.claude/skills` and `~/.codex/skills` link there). Their upstream repos come from the skills-manager DB: `emilkowalski/skills`, `jakubkrehel/skills`, `leonxlnx/taste-skill`, `codeswithroh/tastemaker`, `nextlevelbuilder/ui-ux-pro-max-skill`, `conardli/garden-skills`, `elayadesign/ai-design-skills`, `mengto/skills`.
- **Popularity**: the skills.sh all-time leaderboard, as cached by skills-manager (snapshot taken 2026-10-22), plus GitHub stars fetched through the API on 2026-11-09.
- **Community skills** were read as raw `SKILL.md` files (plus key references) through the GitHub API. Links:
  - Anthropic `frontend-design`: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md (190k★ repo; 1.02M installs, #13 overall and the top design skill). The older plugin copy is https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design (63k installs).
  - Impeccable: https://github.com/pbakaus/impeccable (106k★, v4.8.1; its sub-commands `polish`, `animate`, `colorize` and `quieter` each have 78–85k installs)
  - taste-skill upstream: https://github.com/leonxlnx/taste-skill (112k★; `design-taste-frontend` has 655k installs, and its siblings `high-end-visual-design`, `redesign-existing-projects` and `minimalist-ui` have 425–459k each)
  - Vercel `web-design-guidelines`: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines (769k installs). It fetches its rules from https://github.com/vercel-labs/web-interface-guidelines.
  - Emil Kowalski: https://github.com/emilkowalski/skills (55k★; emil-design-eng 376k, review-animations 246k, apple-design 233k)
  - Jakub Krehel `better-*`: https://github.com/jakubkrehel/skills (11.8k★), and the predecessor https://github.com/jakubkrehel/make-interfaces-feel-better (4k★, 73k installs)
  - UI/UX Pro Max: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (408k installs)
  - uizze: https://github.com/uizze/uizze (`ui-taste` is served from uizze.sh with 711k installs; `ios-design` has 403k)
  - Google Stitch `taste-design` / `design-md`: https://github.com/google-labs-code/stitch-skills (8.7k★)
  - Addy Osmani `frontend-ui-engineering`: https://github.com/addyosmani/agent-skills (114k★)
  - `design-mobile-apps` (Sleek): https://github.com/designed-by-ai/skills (959k installs but only 28★, and it wraps a paid API)

Token figures assume about 4 bytes per token. **Desc** is the description that loads in every session. **Body** is SKILL.md, which loads when the skill triggers. **Refs** are files that load on demand.

## Per-skill findings: installed

### Taste and art direction (the five skills that collide)

**design-taste-frontend (taste-skill v2)**. Installed copy is v2; upstream is now 2.5.1 and adds a Stop-hook gate.
- *Purpose:* art direction for public pages, plus a separate run for app screens.
- *Scope:* marketing pages (main focus) and app screens (dashboards, settings, inboxes). No mobile-native coverage. Motion is required on pages.
- *Keep:*
  - Decide first whether the work is a *page* (read and scrolled) or an *app screen* (worked in).
  - Make a subject inventory of 8–12 things only this client has, and take the page's idea from it.
  - Write "the argument": one claim per section, and delete any section without a claim.
  - A house-rules table of tells, each paired with its replacement: no eyebrows, no monospace costume, no 01/02/03 numbering, no hairlines, no gradients, no resting shadows, no glass or pill nav, no styled accent word, at most 2 typefaces. These are backed by measured stats (for example icon cards appeared on 1% of top sites against 28% of weak ones).
  - Type laws: display tracking -0.02 to -0.05em at leading 0.85–1.05; body 16–20px at leading 1.45–1.6 and 45–75ch; at most 5 sizes.
  - Equal outer margins, and a gap between sections clearly larger than any gap inside one.
  - Buttons are square or pill, never the 9–16px "soft" radius.
  - **App screens** (`references/app-screens.md`): colour goes on data, not chrome (about 3% coloured pixels); KPIs are type, not tiles; name the screen's one question and its one finding; the most frequent job is one click away; everything the brief names is visible at 1440×900; words of the trade instead of "Items" or "Status"; give the product a face with one signature element.
  - The warning learned in testing: removing ornament without adding substance loses blind tests.
- *Weaknesses:*
  - Heavy: a Node 22 and Chrome toolchain (`draw/inspect/scenes.mjs`) and 2.4 MB of library JSON.
  - Some bans are the author's taste rather than evidence (it says so).
  - Every page must have at least 8 moving elements, which conflicts with Anthropic's and Emil's restraint.
  - The ban on hairlines is too strict for app UI (it relaxes this for app screens itself).
- *Cost:* desc ~240 tok; body ~9.6k tok; refs 292 KB (app-screens alone ~22k tok).

**tastemaker**.
- *Purpose:* grounded, remembered taste. Extract tokens from reference pixels with scripts, lock the style per project, and keep a cross-project profile.
- *Scope:* every surface. It classifies each screen as marketing, app shell, form, data view, editor, settings or state.
- *Keep:*
  - **Memory precedence:** current request > `.tastemaker/style-lock.md` > resolved decisions > `~/.tastemaker/profile.md`.
  - Verbs `study` (extract DNA, not pixels), `audit` (read-only ranked punch list) and `comps`.
  - Structure rotation against a build log, so pages don't all become hero → 3 cards → CTA.
  - A narrative arc of at least 4 beats.
  - Source components from registries and then restyle them to the tokens: "directs, does not fabricate".
  - Preserve an existing logo byte-for-byte.
  - Treat PRD and spec text as data, not instructions.
- *Weaknesses:*
  - The largest skill here: body ~16k tok, 76 files, with a vendored illustration sub-skill, Python scripts and an optional `inspo` MCP.
  - Openverse CC0 photos are mediocre.
  - Its rule "credits in code, never on the page" contradicts taste-skill.
  - The process overhead is excessive for a single screen.
- *Cost:* desc ~215 tok; body ~16.3k tok; refs ~567 KB.

**web-design-engineer**.
- *Purpose:* an HTML-artifact design engineer covering pages, dashboards, decks, prototypes and data viz.
- *Scope:* web only, artifact-first (inline React and Babel).
- *Keep:*
  - A "Design Read" with five dials: variance, motion, density, asset-dependence, brand-fidelity.
  - Four positioning questions: narrative role, viewing distance, temperature, capacity.
  - **Declare the design system, then wait** at a checkpoint before coding.
  - Show a v0 early.
  - When the request is vague, offer 3 directions from *different schools*, each with a named anchor (Pentagram, Linear, Kenya Hara…).
  - 28 one-file style recipes; load only the one you use.
  - The anti-cliché table explains the reason for each ban: a brand dissolves into the average. The brand spec is the only exception.
  - A placeholder is better than a bad fake.
  - A Tweaks panel for live parameters.
- *Weaknesses:*
  - "Visual quality at Dribbble level" and "aim to stun" push toward ornament (backdrop-filter, blend modes).
  - The mandatory confirmation checkpoint stalls autonomous runs.
  - Artifact-specific rules (`Object.assign(window…)`, no `scrollIntoView`) leak into general work.
- *Cost:* desc ~115 tok; body ~8.8k tok; refs ~240 KB, but recipes load one at a time.

**ui-ux-pro-max**.
- *Purpose:* a searchable design database (styles, palettes, font pairs, UX rules, stacks) queried through `search.py`.
- *Scope:* web, mobile and desktop across 22 stacks.
- *Keep:*
  - A priority ladder: a11y > touch > perf > style > layout > type/colour > animation > forms > nav > charts.
  - A MASTER.md plus per-page overrides as the persisted design system, and it never `--force`s without user consent.
  - Dials for variance, motion and density that map to spacing scales.
  - The `pro-rules.md` pre-delivery checklist for native apps (safe areas, touch feedback, dark-mode contrast).
- *Weaknesses:*
  - Picking a style from a catalogue produces exactly the "category default" that Anthropic and taste-skill warn about.
  - 3.6 MB of CSV data.
  - Generic advice ("Line-height 1.5").
- *Cost:* desc ~125 tok; body ~4k tok; data 3.6 MB (queried, not read).

**landing-page-design**.
- *Purpose:* a conversion landing-page system: intake, structure, copy, SEO and strict visual tokens.
- *Scope:* marketing pages. Its description also claims "ANY … web UI, component, prototype", which is a trigger grab.
- *Keep:*
  - Conversion structure and intake (A1–A8).
  - Nested radius: `inner = outer − gap` when the gap is under 32px.
  - `text-wrap: balance` on headings and `pretty` on body.
  - Never `window.addEventListener('scroll')`; use IntersectionObserver.
  - A closed spacing scale.
- *Weaknesses:* hard-coded house taste that contradicts almost every other skill:
  - a glass pill nav with `backdrop-blur-3xl`;
  - a gradient on hero heading text;
  - `transition-all duration-700`;
  - a blur-and-fade-up on every element at 800ms or more;
  - a mandatory word-by-word tagline reveal;
  - bans Inter and Helvetica but prescribes Geist and Poppins;
  - no italics and no hyphens anywhere.
- *Cost:* desc ~165 tok; body ~4.1k tok; no refs.

**build-awwwards-quality-sites**.
- *Purpose:* motion-led showcase sites with GSAP, a single smooth-scroll engine and optional Three.js.
- *Scope:* showcase and marketing pages.
- *Keep:*
  - Choose exactly one smooth-scroll engine (Lenis *or* Locomotive) and wire it to ScrollTrigger.
  - Under reduced motion, render the final state instead of shortening the animation.
  - Split text keeps an unsplit accessible name.
  - The static first frame is complete without JavaScript.
  - Three.js rules: cap DPR, pause offscreen, dispose everything, provide a poster fallback.
  - Honest assets: no SVG-drawn people, no Logo Ipsum used as proof, never claim "award-winning".
- *Weaknesses:*
  - Photo avatars are required everywhere, which conflicts with initials as identity tints in app screens.
  - GSAP is mandatory even when CSS would do.
- *Cost:* desc ~125 tok; body ~1.8k tok. The cheapest here.

### Craft and polish

**emil-design-eng** (Emil Kowalski).
- *Purpose:* the philosophy behind UI polish and animation decisions.
- *Keep:*
  - **The animation decision framework:**
    - Frequency gate: 100+ uses a day gets no animation, and keyboard actions are never animated.
    - Purpose list.
    - Easing tree: enter/exit uses ease-out, on-screen movement uses ease-in-out, never ease-in.
    - Custom curves: `--ease-out: cubic-bezier(0.23,1,0.32,1)`, `--ease-in-out: cubic-bezier(0.77,0,0.175,1)`, `--ease-drawer: cubic-bezier(0.32,0.72,0,1)`.
    - Durations: press 100–160ms, tooltip 125–200ms, dropdown 150–250ms, modal 200–500ms; UI stays under 300ms.
  - Never animate from `scale(0)`; start at 0.95 plus opacity.
  - Origin-aware popovers.
  - Skip the tooltip delay on subsequent hovers.
  - Transitions rather than keyframes for interruptibility.
  - `@starting-style`.
  - Blur to mask imperfect crossfades.
  - The clip-path recipes.
  - Before/After/Why review table format.
- *Weaknesses:* the "Initial response" persona line is filler. It overlaps with `animate` (by the same author) by about 60%.
- *Cost:* desc ~40 tok; body ~6.8k tok.

**apple-design** (Emil).
- *Purpose:* Apple's fluid-interface principles for the web.
- *Scope:* gestures, sheets, springs, materials and type.
- *Keep:*
  - Interruptibility is the top principle; start from the live presentation value.
  - Velocity handoff from gesture to spring.
  - Momentum projection: `current + (v/1000)·d/(1−d)` with d ≈ 0.998.
  - Decide reverse or commit by velocity *sign*.
  - Rubber-banding.
  - Spring defaults: damping 1.0 and response 0.3–0.4; flick damping ~0.8.
  - Size-specific tracking.
  - Under reduced motion, cross-fade instead of slide.
- *Weaknesses:* only relevant to gesture-heavy UI, and it overlaps with animate-expo for native.
- *Cost:* desc ~105 tok; body ~5.7k tok.

**better-interface / better-layout / interface-review** (Jakub Krehel).
- *Purpose:* evidence-based review and fixes.
- *Keep:*
  - Every finding cites `file:line` with the current code.
  - Rank by user impact, and prefer the cheaper fix.
  - Review in order a11y → layout → writing → type → colour → UI so polish doesn't hide foundational failures.
  - Read the *removed* lines in a diff.
  - better-layout:
    - group with space, not lines;
    - one primary action per view;
    - logical properties for anything that mirrors;
    - content bleeds, controls float;
    - room for translated text.
- *Gap:* better-interface requires six domain skills, but only better-layout is installed. better-accessibility, better-colors, better-typography, better-ui and better-writing exist upstream and are missing locally, so better-interface marks those domains "Not reviewed".
- *Upstream extras worth keeping:*
  - better-ui: outer radius = inner radius + padding; press scale 0.96; exits shorter than enters; suppress transitions on theme switch; hover only on hover-capable pointers.
  - better-typography: tabular numbers on changing values; inputs at 16px on mobile; truncate with a way back.
  - better-colors: palettes as ramps; fill exactly one action per view; name primitives by hue and semantic tokens by role.
  - better-writing: verb-first buttons; settings describe the ON state; undo beats confirmation.
- *Cost:* each ~2–3k tok; desc ~40 tok each.

**pick-ui-library** (Emil, manual-only). A curated list of libraries per job (toasts, OTP, charts, cmdk, virtualization, DnD) with common mismatches. About 1.2k tok. Its job overlaps with tastemaker's `library-selection.md`.

### Motion family (Emil)

- **animate**:
  - A build sequence: should it animate → purpose → cheapest tool → properties → curve/duration/spring → interruption → reduced motion and pointer gating.
  - A "Never ship" table:
    - no `transition: all`;
    - no ungated `:hover` motion; use `@media (hover:hover) and (pointer:fine)`;
    - reduced motion means gentler, not zero;
    - stagger 30–80ms.
  - "No approximated values": take curves from the tables.
  - Extend the codebase's tokens, don't fork them.
  - ~2.9k tok, plus RECIPES ~2k.
- **animate-expo**: the only real mobile-native motion source.
  - Reanimated, not core Animated.
  - Never `setState` from a gesture.
  - `scheduleOnRN` only in `onEnd`.
  - `.get()`/`.set()`.
  - Press feedback 0.97 over 100–150ms.
  - `hitSlop` for 44pt targets.
  - Haptics in the same frame as the visual, one per action, never the only feedback.
  - Measure with `onLayout` because type scales.
  - Verify on a release build on the slowest device.
  - ~4.4k tok, plus RECIPES ~4.3k.
- **review-animations** (manual): the ten non-negotiable standards and a verdict. ~2.1k tok, plus STANDARDS.
- **improve-animations**: a read-only audit that writes self-contained plans for cheaper agents. ~2k tok.
- **find-animation-opportunities**: a read-only gate (frequency, purpose, speed, function) that requires a "Rejected candidates" list. ~2.4k tok.
- **animation-vocabulary**: a glossary from vague descriptions to terms. ~3.3k tok, niche.
- Upstream has four more not installed:
  - `animation-performance` (frame budget, pipeline);
  - `remove-animations` (subtract-only);
  - `mobile-native` (web apps that feel native: 100vh, tap highlight, input zoom, safe areas);
  - `break-ui` (worst-case data toggle).
  - `mobile-native` and `break-ui` would both feed the custom set.

*Shared weakness:* all six repeat the same frequency, purpose and easing tables, so the overlap between them is about 40%. Together they cost about 17k tok if several load at once.

## Per-skill findings: community (not installed)

**Anthropic `frontend-design`** (~2.3k tok, the most installed).
- *Keep:*
  - Ground the design in the subject's world. Open the hero with "the most characteristic thing in the subject's world".
  - **Name the current AI clusters explicitly:**
    - cream #F4F1EA with a serif and terracotta #D97757;
    - near-black with an acid accent;
    - broadsheet hairlines;
    - the SaaS card kit;
    - template chrome: ALL-CAPS eyebrows, `A · B · C` meta strings, "WORD — fragment", a tinted near-black #0B0B0B, monospace labels, an appended `→`.
  - Two passes: a compact plan (4–6 named hexes, type roles, ASCII wireframes, alignment), then review the plan against the brief ("would a similar prompt land here too?"), then build.
  - Spend boldness in one place.
  - Remove one accessory (Chanel).
  - Non-user-triggered motion: one orchestrated moment only.
  - A writing section: an action keeps its name through the flow (Publish → Published); errors don't apologise.
  - "Structure is information": use numbering only for real sequences.
- *Weaknesses:* no app-screen guidance, no verification tooling, no motion values.

**Impeccable** (~2.9k tok body, with 46 reference files routed per command).
- *Keep:*
  - **Modes by visitor success:** Persuade, Operate, Read, Experience. These are cleaner than taste-skill's page/app split, adding docs and portfolio.
  - "The brief wins", even over its own bans.
  - Refinement preserves the existing look; a redesign replaces it.
  - PRODUCT.md for context and DESIGN.md for the visual system.
  - Command verbs: `polish`, `quieter`, `bolder`, `distill`, `harden`, `typeset`, `colorize`, `clarify`, `adapt`.
  - **Craft floor:**
    - theme the browser surfaces (selection, caret, scrollbars, focus ring, underline offset, tabular numerals);
    - secondary text on coloured surfaces is tinted, never grey;
    - more space above a heading than below;
    - display text at most 6rem with tracking at least -0.04em;
    - never nest cards;
    - eyebrows are an absolute ban;
    - choose light or dark from the use scene, not the category.
  - Batch the visual checks instead of screenshotting after every tweak.
- *Weaknesses:* a large CLI and hook system with drift "doctor" machinery, and adapters for 20 agent dirs. Heavy to adopt whole.

**Vercel `web-design-guidelines`** (~300 tok). A thin wrapper that fetches https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md at review time and reports in `file:line` form. Worth borrowing as a *pattern*: keep the rule list in one external file that is fetched or loaded only on review. Its value is in that rule list, which is not vendored here.

**UIZZE `anti-ui-slop` / `ui-design`** (~1–1.3k tok each). Light routers to playbooks (new-work, operate, polish, distill, audit, iOS, overdrive), with optional evidence from an 800k-screen corpus behind an account. The structure mirrors Impeccable. Its ideas: "a precise request is enough to proceed", and a hard finish gate.

**Stitch `taste-design` / `design-md`** (~3k / 1.9k tok). Write the design system as a semantic DESIGN.md (atmosphere, colour roles, type, components, layout, motion, anti-patterns) so agents can reuse it. Its anti-pattern list is a good source: no fabricated metrics, no `LABEL // YEAR`, no "Elevate/Seamless/Unleash", no "Scroll to explore", no fake round numbers, no "John Doe/Acme". It also contradicts others: *perpetual micro-motion on every active component* and *no pure black*.

**Addy Osmani `frontend-ui-engineering`** (~3k tok). Engineering hygiene: component architecture, state, WCAG 2.1 AA, empty and error states, "common rationalizations / red flags". Its "AI aesthetic" table overlaps the others; its distinctive piece is the rationalization/red-flag checklist.

**`design-mobile-apps` (Sleek)**. Very high installs, but it is an API client for a paid service and offers no transferable design knowledge. Skip.

## Overlaps

| Theme | Covered by | Best single source |
| --- | --- | --- |
| AI-slop tell list | taste-skill, frontend-design, impeccable craft-floor, web-design-engineer, addy, stitch, tastemaker anti-slop-checklist | **frontend-design**'s named clusters, **taste-skill**'s tell → replacement table with evidence, **stitch**'s copy/data fakes |
| Ground the design in the subject | frontend-design, taste-skill (inventory), uizze, impeccable | **taste-skill** subject inventory |
| Plan before code | frontend-design (plan → review → build), web-design-engineer (Design Read + system), taste-skill (argument), tastemaker (arc) | frontend-design's two-pass plan, plus taste-skill's argument |
| Dials | web-design-engineer (5), ui-ux-pro-max (3), tastemaker | web-design-engineer |
| Persisted design system | tastemaker style-lock, ui-ux-pro-max MASTER.md, impeccable DESIGN.md/PRODUCT.md, stitch DESIGN.md | **DESIGN.md** (a de-facto standard shared by impeccable and Stitch) with tastemaker's precedence order |
| Animation decision gate | emil-design-eng, animate, animate-expo, review, improve, find, better-ui | **animate** (single copy) |
| Press feedback, radius, shadows | emil, better-ui, make-interfaces-feel-better | better-ui (exact values) |
| Review format | emil Before/After table, better-interface file:line ranked by impact, review-animations verdict, taste-skill critique score | better-interface |
| Visual verification | taste-skill inspect.mjs (measured), impeccable batched look, frontend-design screenshots, web-design-engineer browser-acceptance | taste-skill's checks, run with any screenshot tool |

## Contradictions to settle (owner's taste, #49)

| Topic | Positions |
| --- | --- |
| Page motion amount | taste-skill: at least 8 moving elements, stagger every section. landing-page-design: fade-up with blur on *every* element. stitch: perpetual micro-motion. Versus frontend-design and impeccable: **one orchestrated moment**; per-section fade-up "reads as AI-generated". |
| Durations | emil/animate: UI under 300ms. landing-page-design: 700–800ms+. taste-skill: 60–90ms stagger. animate: 30–80ms. better-ui: 100ms. |
| Press scale | emil/animate-expo 0.97, better-ui 0.96 |
| Animatable properties | animate/review-animations/taste-skill: transform and opacity only. impeccable: "reach past" to blur, clip-path, mask, shadow. Emil himself uses blur and clip-path. |
| Glass / pill nav | landing-page-design prescribes it. taste-skill, impeccable and awwwards ban or limit it. |
| Gradients | landing-page-design: gradient hero text. taste-skill: none at all. impeccable: no gradient text. web-design-engineer: only brand ones are allowed. |
| Fonts | landing-page-design bans Inter and Helvetica but prescribes Geist and Poppins. web-design-engineer bans Inter, Roboto and Fraunces. stitch bans Inter and generic serifs. taste-skill deals type from a library. frontend-design: deliberate, not default. |
| Black | landing-page-design allows #000. stitch: no pure black. frontend-design: a tinted near-black #0B0B0B is a tell. |
| Hairlines / borders | taste-skill bans them on pages and allows them in app UI. better-ui: borders for structure, shadows for elevation. frontend-design: broadsheet hairlines are a tell. |
| Image credits | taste-skill: credit every found image on the page. tastemaker: credits in code, never on the page. |
| Avatars | awwwards: photos only, never initials. taste-skill app screens: initial plus a personal pale tint. web-design-engineer: an initial circle as placeholder. |
| Asking vs deciding | web-design-engineer: stop and wait at a checkpoint. taste-skill and uizze: state your reading in one line and proceed. |
| Catalogue vs. derived look | ui-ux-pro-max and web-design-engineer recipes pick from a catalogue. frontend-design and taste-skill derive the look from the subject. tastemaker grounds it in references or memory. |

## Recommended structure for the custom set

Principle: one small always-on core, plus surface modules that load only when needed. Write one owner taste file (from #49) that every module defers to. Keep the motion rules in one place, not six. Target under 3k tok per SKILL.md body, with details in references.

```
design/                    core: triggers on any UI build, review or restyle
  SKILL.md                 router + the core rules below (~2.5k tok)
  taste.md                 owner's taste profile (#49): pinned choices that win the contradictions above
  references/
    tells.md               AI-tell registry: tell → replacement, dated
    plan.md                the plan/argument template + DESIGN.md format
    review.md              review format, severity, evidence rules
    motion.md              the single motion source (gate, curves, durations, springs, never-ship)
    copy.md                interface writing rules
design-app/                Operate surfaces: dashboards, settings, lists, forms, inboxes
design-showcase/           Persuade/Experience surfaces: landing, marketing, portfolio, launch
design-expo/               React Native / Expo screens and motion
```

Each module below lists what to carry over and where it comes from.

**`design` (core)**
- *Context and routing:*
  - Surface modes (Persuade / Operate / Read / Experience) decide which module loads. From **impeccable**, extending taste-skill's page/app split.
  - "The brief wins"; refinement preserves, redesign replaces. From **impeccable**, **uizze**.
  - Memory precedence: request > project `DESIGN.md` > `taste.md`. Write `DESIGN.md` in the Stitch/impeccable format. From **tastemaker** (order) and **impeccable/stitch** (file).
  - Decide and state your reading in one line; ask only when a missing fact blocks the work. From **taste-skill**, **uizze** (overrides the web-design-engineer checkpoint).
- *Planning:*
  - Subject inventory (8–12 things only this subject has). From **taste-skill**.
  - Two-pass plan: tokens (4–6 named hexes, type roles, layout sketch, alignment), then "would a similar prompt land here?", then build. From **frontend-design**.
  - The argument (claims per section or block; delete blocks without one). From **taste-skill**.
  - Optional dials (variance, motion, density) recorded in the plan. From **web-design-engineer**.
  - Spend boldness in one place; remove one accessory. From **frontend-design**.
- *Craft rules:*
  - Tell registry with replacements. Sources:
    - **frontend-design** clusters (cream/terracotta, acid-on-black, broadsheet, SaaS kit, template chrome);
    - **taste-skill** house rules with study numbers;
    - **impeccable** refuse list (nested cards, coloured side border, hard offset shadow, emoji icons, geometric masks);
    - **stitch** content fakes (invented metrics, `LABEL // YEAR`, "Elevate/Seamless", "Scroll to explore").
  - Type laws: tracking by size, leading by role, measure 45–75ch, at most 5 sizes, 1–2 families, tabular numbers on changing values, `text-wrap: balance/pretty`, 16px inputs on mobile. From **taste-skill**, **better-typography**, **apple-design**, **landing-page-design**.
  - Colour: one ground, one ink, one accent; ramps; semantic tokens; one filled action per view; secondary text tinted on colour; measure rendered contrast. From **taste-skill**, **better-colors**, **impeccable**.
  - Space and structure:
    - group with space, not lines; use equal outer margins;
    - leave more space above a heading than below it;
    - the gap between sections is larger than any gap inside one;
    - use logical properties.
    - Sources: **better-layout**, **taste-skill**, **impeccable**.
  - Surfaces: outer radius = inner + padding; borders for structure, shadows only for things that float; theme browser surfaces (selection, focus, scrollbars). From **better-ui**, **landing-page-design**, **impeccable**.
  - Honesty: no fabricated data, logos or testimonials; placeholder better than a bad fake; no SVG-drawn people; preserve existing logos byte-for-byte. From **web-design-engineer**, **awwwards**, **tastemaker**.
  - Copy: verb-first buttons, an action keeps its name (Publish → Published), errors say how to fix, settings describe the ON state, words of the trade. From **frontend-design**, **better-writing**, **taste-skill app**.
  - States: hover, focus, active, disabled, loading, empty, error, plus worst-case data. From **web-design-engineer**, Emil **break-ui**.
- *Motion:* `motion.md` merged once:
  - frequency and purpose gate;
  - easing tree and the three named curves;
  - duration table;
  - spring defaults;
  - origin-aware;
  - never `scale(0)`;
  - transitions over keyframes;
  - hover gating;
  - reduced motion means gentler, not zero;
  - never-ship table;
  - "extend existing tokens".
  - Sources: **animate**, **emil-design-eng**, **apple-design**, **better-ui**. Keep review-animations, improve-animations and find-animation-opportunities as they are (manual-only); point them at this file rather than duplicating.
- *Verification and review:*
  - Look at screenshots at 1440 / 768 / 390, batched; judge only what the pictures show; at most 3 fix rounds. From **taste-skill**, **impeccable**.
  - Review format: `file:line` evidence, ranked by user impact, cheaper fix first, Before/After/Why table. From **better-interface**, **emil**.

**`design-app`** (Operate). Mostly **taste-skill `app-screens.md`**, trimmed to about 4k tok:
- The screen's one question and its one finding, placed first.
- Everything named is above the fold at 1440×900.
- The most frequent job is one click away.
- Colour on data, not chrome (about 3%).
- KPIs are type.
- The five shell archetypes.
- Tables: no zebra striping, numbers right-aligned.
- Honest zeros and dashes.
- One signature element and the product's mark.
- Identity tints for people.

Also carry over:
- The screen classification from **tastemaker** (form, data view, editor, settings, states).
- **ui-ux-pro-max** priority ladder (a11y first) for forms and navigation.
- Hairlines are allowed here.
- Motion gets crisp: no entrances, only feedback.

**`design-showcase`** (Persuade and Experience):
- Narrative arc with at least 4 beats, plus structure rotation against previous builds. From **tastemaker**.
- Hero from "the most characteristic thing" in the subject's world; one dominant image covering at least half the first screen. From **frontend-design**, **taste-skill**.
- Section blueprints that differ from their neighbours; carry the idea into pricing, FAQ and footer; the footer as a designed close. From **taste-skill**.
- Conversion rules and intake. From **landing-page-design** A1–A8 only; drop its Part B visual rules.
- Motion stack:
  - one signature moment;
  - one smooth-scroll engine only;
  - a static first frame that is complete without JS;
  - split text keeps an accessible name;
  - Three.js only with purpose (DPR cap, pause, dispose, poster);
  - IntersectionObserver, never a raw scroll listener.
  - Sources: **build-awwwards-quality-sites**, **landing-page-design** B7.
- Assets: honest sourcing and a stated credit policy. Pick one, either taste-skill's or tastemaker's.
- Optional: 3 directions from different schools when the brief is vague. From **web-design-engineer**.

**`design-expo`** (mobile):
- **animate-expo** whole, as the motion core:
  - Reanimated and the UI thread;
  - `.get()`/`.set()`;
  - press, not hover;
  - haptic rules;
  - `hitSlop`;
  - reduced motion;
  - release-build verification.
- **apple-design** gestures: velocity handoff, momentum projection, rubber-banding, sign-based commit.
- **ui-ux-pro-max `pro-rules.md`** native checklist: safe areas, touch feedback, dark-mode contrast, 44pt/48dp.
- **taste-skill app-screens** rules for the insides of data screens.
- Emil **mobile-native** for web views and PWAs.

**Drop or leave out of the set**:
- ui-ux-pro-max's style catalogue and search (catalogue looks).
- landing-page-design's visual Part B (fixed Geist/Poppins, glass nav, gradient text, 700ms everything).
- web-design-engineer's artifact-specific rules and mandatory checkpoint.
- tastemaker's illustration sub-skill and photo pipeline.
- taste-skill's Node/Chrome toolchain. Keep its *checks* as a written list; adopt the scripts later only if #50 wants a measured gate.
- design-mobile-apps (paid API).
- animation-vocabulary (keep it installed separately; it does not belong in the set).

**Trigger hygiene**: five installed skills (tastemaker, design-taste-frontend, landing-page-design, ui-ux-pro-max, web-design-engineer) all claim "build or style any UI". Together they cost about 1.75k tok of descriptions per session and load conflicting rules for the same request. When the custom set ships, disable those five so only `design` triggers on generic UI work. Keep the manual-only reviewers.

## Open items for #49 / #50

- Settle the contradictions table in `taste.md`: motion amount, durations, borders, fonts, black, credits, avatars.
- Install the missing `better-*` domain skills (accessibility, colors, typography, ui, writing), or fold their rules into `design`, so that better-interface stops reporting "Not reviewed".
- Decide whether to adopt a measured gate (taste-skill's inspector or impeccable's detector hook) or to rely on screenshot review only.
- The installed taste-skill is v2 and upstream is 2.5.1 (its new Stop-hook gate and "shader effects only on tech pages"). Re-read upstream before carrying rules over.
