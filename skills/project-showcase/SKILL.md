---
name: project-showcase
description: Refresh a project's showcase: a quick-to-read README from the standard template, plus screenshots, GIFs and demo clips captured with Playwright into docs/media/ with a manifest. Use when writing or refreshing a README, capturing or updating screenshots, demo clips or GIFs after UI changes, or preparing media for portfolio explainers and cards.
---

# Project showcase

A project's **showcase** is its README plus the media in `docs/media/`: screenshots, clips (GIF for the README, WebM and a poster PNG for web pages), and `manifest.json`. The README, portfolio explainers and portfolio cards all draw from that one folder, so a capture run refreshes all of them.

Paths below are relative to this skill's folder unless they start with `docs/`, which means the target project.

## Steps

1. **Survey the project.** Read the README, `docs/`, `package.json` and the main screens in the code, then write down:
   - the one-line pitch: what it does, for whom;
   - the live URL, and the local command that serves a production build;
   - the themes the app *actually* has and how it picks one: `prefers-color-scheme`, a `localStorage` key, or something else;
   - whether phones are a primary target;
   - 3–5 features worth showing, each as a flow of under 10 seconds.
   A **library** (no UI, e.g. treem) skips capture: go to step 5 and use the library variant.
   Done when every item has an answer taken from the code or site, not guessed.

2. **Write `docs/media/capture.config.mjs`.** Follow [references/capture-config.md](references/capture-config.md). One shot per feature screen and one flow per key interaction. Mark one item `hero: true`. Captions describe what the user sees; they become alt text. Flows that create or change data run against a local server (`--serve`), never production.

3. **Capture.** From the project root:
   ```sh
   node <skill-dir>/scripts/capture.mjs --config docs/media/capture.config.mjs
   ```
   Add `--serve` to start `config.serve` and capture it, or `--url` to point at a preview. The first run installs pinned tools into `~/.cache/project-showcase` (override with `SHOWCASE_DEPS`); the target project gains no dependencies. `--help` lists every flag.

4. **Review every file.** Open each PNG in `docs/media/screens/` and each poster, plus the contact sheet path printed as `review` for each clip (frames on one image). Reject and fix the config when any of these shows:
   - loading spinners, blank images, skeletons, or a cookie/consent banner;
   - personal data, real names of private people, tokens or admin-only screens;
   - a cursor that misses its target, or a flow that does not show what its caption says;
   - a `warn` line from the run (identical themes, a GIF over 8 MB).
   Recapture just the fixed items with `--only id,id`. Done when every file passes and the run prints no warnings.

5. **Write the README** from [references/readme-template.md](references/readme-template.md), or [references/readme-library-template.md](references/readme-library-template.md) for a library. Move anything longer than the template's sections into `docs/*.md` and link it. Copy rules live in the template; apply all of them.

6. **Verify and commit.** Every image path in the README exists in `docs/media/manifest.json`; every link resolves; the quick start works from a fresh clone. Commit README, `docs/` changes, config and media together.

## Refreshing after UI changes

Rerun step 3 with the same config, then step 4. A full run deletes media the config no longer produces (only files listed in the previous manifest). Update the README only when an item was added, removed or renamed. Keep ids stable: explainers and portfolio cards reference files by name.

## Mobile apps (Expo)

Not built yet. [references/mobile-later.md](references/mobile-later.md) records the intended approach; read it before capturing a native app.
