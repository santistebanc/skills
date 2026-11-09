# Capture config

`docs/media/capture.config.mjs` is an ES module whose default export describes what to capture. Media and `manifest.json` are written next to it, unless you pass `--out`. A complete working example for a live site is [example.capture.config.mjs](example.capture.config.mjs).

## Top level

| Key | Meaning |
| --- | --- |
| `name` | Product name stored in the manifest. Default: the repository folder name. |
| `url` | Base URL to capture: the live site or a preview. `--url` overrides it. |
| `serve` | `{ command, url, timeoutMs? }`. With `--serve`, `command` runs from the repository root, the run waits until `url` answers, and the server stops afterwards. Use a production build (`npm run preview`, `vite preview`) so dev overlays stay out of the media. |
| `themes` | Themes to capture, default `['light', 'dark']`. List only the themes the app has. The run warns when two themes are pixel-identical. |
| `theme` | How a theme is applied. `{ strategy: 'media' }` (default) sets `prefers-color-scheme`. `{ strategy: 'storage', key, values: { light, dark } }` also writes `localStorage[key]` before the page loads (values default to the theme name). For anything else, `{ setup: async (context, theme) => {} }`, e.g. `context.addInitScript(...)` or `context.addCookies(...)`. |
| `viewports` | Replaces the default `{ desktop: 1440×900 @1x, mobile: 390×844 @2x mobile: true }`. Each viewport is `{ width, height, scale?, mobile? }`. A desktop-only app sets just `desktop`. |
| `ready(page)` | Runs after every navigation, once the network is idle and fonts are loaded. Wait for the element that proves real content is there (e.g. the first card image). Images visible in the first screen are always awaited. |
| `css` | Extra CSS injected into every page, e.g. to hide a consent banner or a dev badge. Scrollbars and the text caret are already hidden. |
| `locale`, `timezone` | Defaults `en-US`, `Europe/Berlin`. |
| `shots`, `flows` | Below. Ids are lowercase kebab-case and unique across both lists; files are named after them. |

## Shots

```js
{ id: 'listing', path: '/', caption: 'What the user sees here', hero: true,
  viewports: ['desktop', 'mobile'], themes: ['light', 'dark'], fullPage: false,
  before: async (page, h) => { /* reach the state to photograph */ } }
```

Output: `screens/<id>-<viewport>-<theme>.png` for every viewport × theme (defaults: all of them). The viewport frame is the default, which works best in READMEs; use `fullPage` only for pages that read top to bottom.

## Flows

```js
{ id: 'find-a-film', path: '/', viewport: 'desktop', theme: 'dark', caption: 'Search, open a film, switch to the grid',
  fps: 10, holdMs: 1500, gifWidth: 800, videoWidth: 1440, cursor: true,
  before: async (page, h) => {},            // runs before recording starts
  run: async (page, h) => { await h.type('input[type=search]', 'love'); await h.click('main a'); } }
```

Recording starts after `path` is loaded and `before` has run, and stops when `run` returns, so loading screens stay out of the clip. Output:

- `clips/<id>.gif` is for READMEs. Default width 800 (320 on mobile viewports), `fps` 10, last frame held `holdMs`. Aim for under 3 MB; the run warns above 8 MB.
- `clips/<id>.webm` (VP9, up to the viewport width) is for explainers and cards. It needs Playwright's ffmpeg, which setup installs.
- `clips/<id>.png` is the final state without the cursor, used as a video poster or a still.

Keep a flow to one idea and under 10 seconds. Script it at a person's pace with the helpers, and the fake cursor (`cursor: false` hides it) shows where each action happens.

## Helpers (`h`)

| Helper | Does |
| --- | --- |
| `h.click(target)` | Glides the cursor to the target, then clicks. `target` is a CSS selector (first match) or a Playwright locator. |
| `h.hover(target)` | Glides the cursor to the target. |
| `h.type(target, text, { delay })` | Moves to a field, focuses it and types at 75 ms per key. |
| `h.scroll(dy)` | Smooth wheel scroll by `dy` CSS pixels. |
| `h.pause(ms)` | Holds the frame so a viewer can read the result. Default 600. |
| `h.settle()` | Waits until the network is idle and every image on screen has loaded and decoded. Call it after an action that swaps content in place (search, filters, tabs), so the clip shows real images. |
| `h.goto(path)` / `h.ready()` | Navigate and wait as at the start; call `h.ready()` after a click that changes route. |
| `h.page` | The Playwright page, for anything else (`page.keyboard.press('Escape')`, `page.getByRole(...)`). |

Prefer selectors from roles, titles and placeholders over generated class names, so the config survives restyling.

## Manifest

`manifest.json` lists every item in config order:

```json
{ "schema": 1, "project": "OV Berlin", "source": "https://ovberlin.online", "commit": "a7575f0",
  "capturedAt": "…", "viewports": { … }, "warnings": [],
  "items": [
    { "id": "listing", "kind": "screenshot", "file": "screens/listing-desktop-dark.png", "viewport": "desktop",
      "theme": "dark", "caption": "…", "path": "/", "hero": true, "width": 1440, "bytes": 1313421 },
    { "id": "find-a-film", "kind": "clip", "files": { "gif": "clips/find-a-film.gif", "poster": "clips/find-a-film.png",
      "webm": "clips/find-a-film.webm" }, "viewport": "desktop", "theme": "dark", "caption": "…", "durationS": 8.3, … } ] }
```

`commit` is the checkout the config sits in. When capturing a live site, it is the code you have locally, not necessarily what is deployed. Consumers (README, portfolio explainers and cards) select items by `id`, `viewport`, `theme` and `hero`, and use `caption` as alt text.
