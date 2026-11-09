# Design taste profile

The design preferences of the owner of these projects, drawn from six shipped UIs and about 25 T3 threads with design feedback. It is the input for task #50, a custom design skill.

**How to read it.** Each rule says whether it is backed by *both* code and threads, by *threads* (said outright) or by *code* (a habit with no stated reason). Threads are cited by id. Quotes are the owner's own words, typos included. Code is cited by path under `C:\Users\santi\code\`.

Sources:

| Project | What it is | Look |
|---|---|---|
| `portfolio` | Public site | "Wayfinding": Berlin transit signage, paper + ink + one yellow signal, radius 0, Archivo + JetBrains Mono |
| `berlin-cinema` (OV Berlin) | Showtimes tool | Dark-only, poster-forward, slate + orange signal, DM Sans + DM Serif Display |
| `flyscan` (desktop) | Flight comparison workspace | "Ledger, refined": dark slate, square corners everywhere, Sora, tabular figures, blue accent |
| `splitnext` | Expense splitting (Expo/RN) | "Ledger, calmer": warm paper, near-black ink, hairline rules, no cards, Instrument Sans + Geist Mono |
| `rankzap` | Live ranked voting | "Podium": condensed uppercase Archivo at 900, one bold colour per poll, black/white blocks |
| `snapquiz` | Party quiz on a TV | Older shadcn defaults: Poppins, teal/cream, rounded, decorative hex background |

Snapquiz predates the other projects and has no design feedback in any thread. Treat it as a baseline, not as evidence of current taste.

---

## 1. Rules

### Layout and structure

**R1. Flat, one surface. No boxes inside boxes.** *Both.*
- "none of them are good, i would like a design that makes good use of space and is flat, (no boxes within boxes each leaving less and less space, no overly exagerated rounded corners, no unnecessary or redundant text)" (`15513a51-a143-4b21-9377-d55966447e20`)
- "I dont like unenecsary boxing and carding … I prefer flat and clean UI, with no fluf or redundant elements." (`214cb156-b07d-4bec-a6f2-352577d8d232`)
- Code: `splitnext/apps/client/src/design/tokens.ts` ("hairline rules instead of cards … nothing sits on a card"), `berlin-cinema/DESIGN.md` ("Flat-By-Default Rule", "Don't wrap everything in cards"), `splitnext/docs/design-alternatives/round-2.html` ("everything sits on one flat surface, rows run the full width … no cards inside cards").
- Apply: separate rows with hairlines and spacing, not containers. A card is allowed only when its boundary really helps scanning, as with OV Berlin's poster tiles.

**R2. Use the space for content. Every column and every pixel must earn its place.** *Both.*
- "the RET and OUT labels are not needed and just take space, remove them" (`5e679f06-8f77-4435-9f7c-27f1dd46af73`)
- "I think the space in the project manager is not well used … the tags take too much space of the task title which is a lot more important … there is like a wasted column before the task status color … the side column with projects is not necessary to be always vbisible" (`214cb156…`)
- "these could be less tall when in small screens"; "make them fir all the way to the edges of the screen" (`a9993330-ab6d-496b-ade9-2cb705a8afbb`)
- "make the items in the list of members more compact in height"; "make the paid by also more compact" (`57ae6dcc-a239-49af-b00b-827a9b78ba7d`)
- Apply: when a field's value is obvious from context, drop its label. Remove reserved slots that are usually empty. Sidebars start hidden. Content goes edge to edge on phones.

**R3. Progressive disclosure: one question per level.** *Both.*
- "too much overload of information and text, maybe there is a way to overload less the user using maybe icons, maybe hiding parts or defer when they show up … to more levels of rendering or hierarchy" (`15513a51…`). The answer the owner accepted ("ok this looks good, lets implement this design") is `splitnext/docs/design-alternatives/round-5.html`: "each level answers one question and leaves detail to the next tap", "One figure per row", "Defaults over choices", "Fewer words in the chrome".
- Tags moved from task rows to the detail panel (`214cb156…`). `berlin-cinema/PRODUCT.md` principle 4: "Progressive disclosure, not clutter".

**R4. No redundant or decorative text.** *Threads, repeated often.*
- "No need for that 'All caught up. Every change from this device is in.' text"; "the text 'Describe the expense' … probably can be removed completely" (`56c33264-e9a2-4fd0-b47a-d3a6fc46e0cf`)
- "if a flight is nonstop, dont put the text nonstop there" (`767d9d91-5ece-4d99-9a87-a9a19f6cee3a`)
- "the screens in the Screens and states section seem redundant, they are already shown in the videos" (`a3b2f11c-2d65-4ebb-88bc-cc5154a334ba`)
- Concise labels: "be shorter like maybe just say 'delete'" (`56c33264…`); "always have titles be very concise" (`214cb156…`)
- Apply: show the default state silently and mark only the exceptions. Never label the same thing twice.

**R5. Design for real, messy data, not tidy demos.** *Threads.*
- "they may soon break apart when you have cases like large groups or long list of recorded expenses or complicated shares" and "you still rely on some convenient assumptions like that names of members are short" (`15513a51…`)
- Apply: every mockup includes long names, 14+ people, five-digit amounts, empty states, offline and error states. Rankzap's harness (`rankzap/design-explorations/_harness/`) and splitnext rounds 3–5 work this way.

**R6. Alignment and stability: things line up and never jump.** *Threads, repeated often.*
- "make sure they are all well aligned vertically"; "the elements in the split members dont align in columns vertically" (`56c33264…`)
- "when i scroll all the way to the top i notice the filters/sort controllers area shofts a couple pixels vertically, it should not shift" (`a9993330…`)
- "this violent shaking in the header" while scrolling (`56c33264…`), fixed only after the owner diagnosed it
- "the whole balances with expenses spacing is maintained without jarring jumps" (`7cc6817a-55f6-411e-add9-fb87b34267f6`)
- "make it look like the item never shifts in position vertically" when items are inserted around the selection (`0c415100-431a-4a37-9284-59483667871d`)
- "there is a empty space between the bottom of members list and the expenses section when the memebrs list is collapsed" (`56c33264…`)
- Code: `flyscan/desktop/src/styles.css` header comment ("A pixel short of the header … does not hop as the page leaves the top"). Numbers use tabular figures in flyscan, OV Berlin and splitnext.

**R7. Consistency through a small token set and shared components.** *Both.*
- "make … the whole app is consistent in style and look and behaviour, and that is possible to reduce the most the amount of different design system tokens and styles and reusable components and their variations" (`ea106567-4f2a-4f70-9566-1409c1e8a0b4`). The result went from 30 colours to 11, 18 type steps to 13, and a 4-pt grid enforced by the type checker.
- "make the share up/down buttons same style as the checkbox"; "make the controls button in split list have the same shape and size as the checkbox" (`56c33264…`, `57ae6dcc…`)
- "make the app be built using a design system and a set of reusable components. Then document that … sort of like storybook but simpler" (`cf0fb815-327f-4bd0-8185-1c38c1bba290`)
- Code: `splitnext/apps/client/src/design/tokens.ts` ("a role gets its own token only when no other token already looks and means the same"), with a `/components` catalog.

### Shape and colour

**R8. Corners are square or nearly square. Round shapes are only for dots, avatars and counts.** *Both.*
- "no round corners or at least not super rounded" (`214cb156…`); "no overly exagerated rounded corners" (`15513a51…`)
- Code: portfolio "Radius 0, circles only for stations" (`portfolio/src/styles.css`). Flyscan `*, *::before, *::after { border-radius: 0 !important; }` with only status dots round (`flyscan/desktop/src/flyscan.css`). Splitnext `radii = { control: 8, chip: 6, round: 999 }`, "only avatars, dots, radio marks, and counts are round". Rankzap blocks are square.
- Default: 0px. At most 8px for touch controls in a mobile app.

**R9. Neutral ground, ink text and one signal colour used rarely.** *Code, consistent across all current projects.*
- Portfolio: paper `#f3f1ea`, ink `#121212`, signal yellow `#f5c400` ("Ink + paper + one signal color").
- OV Berlin: slate + orange, and the "Signal Rarity Rule" says orange covers at most 10% of a screen (`berlin-cinema/DESIGN.md`).
- Splitnext: ink on warm paper. Green means money back and orange means money owed or attention needed. Colour carries meaning, not decoration.
- Flyscan: one blue accent, "the accent must not look like a status" (`flyscan.css`).
- Rankzap is the loud exception (R10).
- Neutrals are tinted, never pure `#000` or `#fff` (OV Berlin's "Tinted Neutral Rule"; warm paper in portfolio and splitnext).

**R10. Colourful is fine when it is calm and functional.** *Threads.*
- "I like C, but make it more colorful and calm" (`a33e33bf-4139-4b8f-ac93-77ec409f3536`). Swiss was "too brutalist or also uninspiring and coorporate" (`15513a51…`).
- Rankzap: from five directions, "i like number 2 style", then "i like the original and floodlight … the color can be chosen when makign a poll" (`mcp:31331754-0212-44ed-88dc-b9170d1b0493`). The result is one strong colour per poll plus black and white.
- Functional colour coding is welcome: stable per-cinema hues (`berlin-cinema/DESIGN.md`), per-person split hues and avatar tints (`splitnext/.../tokens.ts`), and a 5-step rating scale (`flyscan/desktop/src/styles.css`).
- Apply: monochrome alone reads as cold. Add colour where it identifies something (a person, a poll, a status), not as decoration.

**R11. Readable numbers matter.** *Both.*
- "That typography for the numbers is not very readable" (`a33e33bf…`)
- Code: tabular figures in flyscan (`font-variant-numeric: tabular-nums`) and OV Berlin. Splitnext uses Geist Mono for amounts in rows but switches to tabular sans for large balances because those "read better than monospaced ones at this size" (`tokens.ts`). Prices and balances are the largest text in flyscan and splitnext.

### Typography

**R12. One workhorse sans and at most one second face, and that face has a job.** *Code.*
- Portfolio: Archivo + JetBrains Mono. Splitnext: Instrument Sans + Geist Mono (figures only). OV Berlin: DM Sans + DM Serif Display (film titles only, "The One Serif Rule"). Rankzap: Archivo only, condensed via the width axis. Flyscan: Sora only.
- Small tracked uppercase labels (0.06–0.1em, 9.5–12px) appear in portfolio, flyscan and OV Berlin.
- Tight negative tracking on large headings (splitnext titles at −0.03em × size, rankzap display at `line-height: 0.9`).
- Text-wrap balance for headings and pretty for body (`portfolio/src/styles.css`).

**R13. Size controls to the content. Avoid oversized chrome.** *Threads.*
- "The content in the drawers appears too big (like text and buttons are too big), they should all be about the same size as the content in the currency drawer (though maybe titles in all drawers could also be smaller)" (`56c33264…`)
- Headers that shrink to compact on scroll (`57ae6dcc…`).
- Apply: on desktop, body text is 13.5–15px for tools (flyscan 13.5px, OV Berlin 15px). Marketing pages are the place for large display type.

### Interaction and feedback

**R14. Motion is smooth, purposeful and continuous. Never sudden, never jumpy.** *Both.*
- "Also with good user feedback and transitions" (`214cb156…`)
- "when going from collapsed to expanded while on a bit scrolled down it looks a bit sudden" (`57ae6dcc…`)
- Shared-element poster morph from home to detail and back (`cd928b20-d212-403e-b77b-535a09489206`), now in `berlin-cinema/src/index.css` (View Transitions, 300ms ease-in-out).
- A long description of a coordinated collapse plus scroll so the "…" button glides to its new place (`7cc6817a…`).
- "animate some entrance short animation when new items are added" (`0c415100…`)
- Rankzap: "a black background when loading that then switches to the color with that circle expanding animation" (`mcp:31331754…`)
- Code: strong ease-out curves shared across projects: `cubic-bezier(0.23, 1, 0.32, 1)` (portfolio, flyscan), `(.22,.8,.16,1)` (splitnext). Durations of 150 / 300 / 500ms (splitnext), 140–200ms (portfolio). Rankzap allows springy overshoot for a "punch" on changed numbers.
- Reduced motion is always respected (portfolio even has a Motion on/off toggle; OV Berlin, splitnext and rankzap support it).

**R15. Pop-ups adapt to the device and the viewport.** *Threads.*
- "use a drawer/popup for the paid by (on mobile drawer on bigger screens popup)", plus a currency picker with "a search bar autofocused … most common ones are listed on top by default" (`57ae6dcc…`)
- "the dropdowns in filters and anywhere else should always popup in a direction where they will not be overflowing out of the viewport" (`cd928b20…`)
- "allow up/down navigation with keyboard in airport dropdowns, or really in any dropdown with a list" (`a9993330…`)

**R16. Quiet status signals beat banners.** *Threads.*
- "when the user is offline its better to show it with some icon on the header or so instead of this banner", which became "a thin strip at the top of the header that is persistent and shown in every view" (`56c33264…`)
- "Undo should not be shown or available for member actions, they are pretty trivial" (`56c33264…`)

**R17. Promote the likely next action.** *Threads.*
- "The invite button seems a bit inconsipuous mostly when the group is new and its probably the thing the user would click next" (`56c33264…`)
- Empty state: "show a screen the logo big, and udner it a join and a create button all of that centered" (`a3b2f11c…`)
- "Book in the first line in big, and then in smaller less bold font the source" next to the price (`5e679f06…`)

**R18. Show only filter options that apply. Defaults should not look like active filters.** *Threads.*
- "if there are no results that match those layover values or stops maybe dont show them at all"; "make those filters the default, so the filters dont shine like there are new filter applied"; "put the no limit option … last" (`0c415100…`)
- "the onhover highlight and the selected highlight should differ" (`0c415100…`)

### Product voice

**R19. Tools, not marketing.** *Code.*
- OV Berlin: "This is a tool you open, use, and close." No hero banners, no upsells, no social proof (`berlin-cinema/PRODUCT.md`, `DESIGN.md`).
- Splitnext: "You first, everyone else after": your balance and your next step lead the screen (`round-5.html`).
- Flyscan: "the results as the page itself" (`flyscan/desktop/src/styles.css`).

**R20. You choose by comparing several options side by side, then refine across rounds.** *Threads, a process preference.*
- Five-direction rounds for splitnext (five rounds, `15513a51…`), rankzap (`mcp:31331754…`, then five variations of the winner) and flyscan (two competing candidates, `3bc4647a-7203-446a-a6aa-2ef5435218c8`, `b7c6c307-1791-4b4c-9f25-47e95ba19824`).
- You expect to see the result running with screenshots, before/after comparisons, and a showcase of every distinct state (`a3b2f11c…`).
- Apply: a design skill should produce several real alternatives with the same data, take blunt feedback, and iterate. It should not deliver one polished guess.

---

## 2. Dislikes and anti-patterns

From rejected work and corrections:

| Anti-pattern | Evidence |
|---|---|
| Card-based, boxes-in-boxes layouts | Round-1 "Midnight" (card-based) rejected; "no boxes within boxes" (`15513a51…`); "unenecsary boxing and carding" (`214cb156…`) |
| Large or pill radii, sticker cards with offset shadows, chunky rounded type | Round-1 "Postcard" rejected (`splitnext/docs/design-alternatives/index.html`); "no round corners" (`214cb156…`) |
| Glassy, native-imitation chrome: gradient summary cards, translucent tab bars | Round-1 "Native glass" rejected; OV Berlin forbids "gradient text, glassmorphism, or decorative blurs" |
| Gimmicky skeuomorphism (till slips, zig-zag edges, rubber stamps) | Round-1 "Receipt" rejected |
| Swiss brutalism done straight: hard black rules, a corporate feel | "the swiss one here is the best but still looks too brutalist or also uninspiring and coorporate" (`15513a51…`) |
| Hard-to-read numerals | "That typography for the numbers is not very readable" (`a33e33bf…`) |
| Background colours that feel off | "im not convinced by the background color" → "Slate looks best" (`a33e33bf…`) |
| Banners for status (offline, sync done) | `56c33264…` |
| Labels restating the obvious ("Nonstop", "OUT/RET", "Describe the expense") | `767d9d91…`, `5e679f06…`, `56c33264…` |
| Tags or metadata crowding the primary text | `214cb156…` |
| Layout shift, jitter, scroll jumps, gaps that open and close | `56c33264…`, `a9993330…`, `7cc6817a…` |
| Sudden size changes without transition | `57ae6dcc…` |
| Popovers overflowing the viewport | `cd928b20…` |
| A wrong colour flashing during loading (default yellow before the poll colour) | `mcp:31331754…` |
| Undo affordances for trivial actions | `56c33264…` |
| Sticky-edge "fixes" that add visual noise. You asked for a better edge between sticky and scrolling parts, then rejected the change: "i dont like the change you did on the sticky pieces edges, undo all that" | `57ae6dcc…`. In flyscan, by contrast, you asked for a shadow that is always visible under sticky elements (`a9993330…`) |
| Demo data that hides breakage | `15513a51…` |

---

## 3. Where the projects disagree

These are real inconsistencies. #50 should decide them, not average them.

1. **Light vs. dark.** Portfolio and splitnext are light (portfolio adds night mode). Rankzap is light. OV Berlin and flyscan are **dark only**, and OV Berlin removed its theme toggle (`2eb5a880 Redesign app to dark-only poster-forward cinematic UI`). Data-dense tools went dark and personal or social apps went light, but this has never been stated.
2. **OV Berlin's docs contradict its code.** `berlin-cinema/DESIGN.md` describes a light slate system with "light and dark modes treated as equals", 12px card radii and "Don't add ratings". The shipped app is dark-only, uses 8px radii and shows star ratings on every poster (`docs/screenshot1.png`). `tailwind.config.js` still carries unused red `primary` and sky `cinema` palettes. DESIGN.md has drifted.
3. **Radius.** Portfolio, flyscan and rankzap use 0. Splitnext uses 8/6. OV Berlin uses 8, with pill search fields from the redesign commit. Snapquiz uses 8 (shadcn default). Is 0 the rule and 8 a mobile-touch exception, or is "not super rounded" (up to 8) enough?
4. **Fonts.** Each app has its own family: Archivo (portfolio, rankzap), DM Sans/Serif (OV Berlin), Sora (flyscan theme; the base sheet says Geist), Instrument Sans (splitnext), Poppins (snapquiz). Flyscan loads Geist in `styles.css` and overrides it with Sora in `flyscan.css`, so the base sheet is half dead.
5. **Mono for numbers.** Splitnext uses a monospace for row amounts, flyscan sets `--mono: var(--sans)` (tabular sans), and the portfolio uses mono for labels, not numbers. Your one comment on numerals (R11) was about readability, so the choice between mono and tabular sans is still open.
6. **Accent colour.** Yellow (portfolio), orange (OV Berlin), blue (flyscan), per-poll (rankzap), none besides semantic green and orange (splitnext), teal (snapquiz). The flyscan theme explicitly avoided orange because it "must not look like a status".
7. **Loud vs. calm.** Rankzap's condensed 900-weight uppercase and full-bleed colour is the opposite of splitnext's "Ledger, calmer". Both were your picks, so taste may depend on context (a party/social app vs. a money app), but the rule is unstated.
8. **Springy vs. pure ease-out motion.** Rankzap uses overshoot springs (`--ease-spring: cubic-bezier(0.3, 1.5, 0.5, 1)`). Everything else uses non-overshooting ease-out.
9. **Header size consistency.** You asked to "make all headers in all views consistent in size" and then said "ok undo the change on the headers consistent in size" in the same session (`56c33264…`), after asking for consistent headers a few days earlier (`57ae6dcc…`).
10. **Snapquiz** still has the shadcn look your later feedback rejects: rounded corners, a decorative hex background and Poppins. It is the outlier if the profile becomes a house style.

---

## 4. Open questions for you

1. **Dark or light by default?** Is dark-only right for dense tools (flyscan, OV Berlin) and light right for everyday apps? Should every app offer both?
2. **Radius:** is 0px the house rule with 6–8px allowed only for touch targets in mobile apps, or is up to 8px fine everywhere?
3. **One house typeface or one per product?** If one, which: Archivo (variable width, used twice) or something else?
4. **Numbers:** monospace (Geist Mono in splitnext) or tabular proportional figures (flyscan, OV Berlin)?
5. **Accent:** should every product keep its own signal colour, or should there be a shared one? Is the "≤10% of the screen" rarity rule yours, or something an agent wrote?
6. **Loud mode:** is the rankzap Podium style (heavy condensed uppercase, full-bleed colour) welcome for playful or social products, or was it a one-off?
7. **OV Berlin:** should DESIGN.md be rewritten to match the dark, poster-forward app, ratings included, or should the app return to the documented direction?
8. **Sticky edges:** flyscan got an always-visible shadow under sticky parts, and splitnext's edge treatment was rolled back. What do you want there: a hairline, a shadow, or nothing?
9. **Snapquiz:** restyle it to this profile, or leave it as is?
10. **Process:** should the #50 skill always start with several competing directions (the five-way rounds you ran), or only for new products?

---

## 5. Defaults for #50

Starting values from what the current projects share, until the open questions are answered:

- Surface: one flat ground (a warm-paper or slate tint, never pure white or black), hairline rules, no cards by default.
- Radius 0. Circles only for status dots, avatars and counts.
- One sans for everything, plus at most one specialist face with a stated job. Tabular figures for all numbers. 10–12px tracked uppercase labels for metadata only.
- Ink text in three tones (ink / muted / faint). One signal colour under 10% of the screen. Semantic colour only where it carries meaning.
- 4-pt spacing grid. 44px minimum touch target. Phone content goes edge to edge.
- Motion: ease-out `cubic-bezier(0.23, 1, 0.32, 1)`, 150 / 300 / 500ms for control / appear / data-change, no layout shift, reduced motion respected.
- Copy: short labels, no restating the obvious, no status banners, the next action promoted.
- Process: several directions drawn on stress-case data, screenshots at 1440 / 768 / 390 / 320px, iterated on blunt feedback.
