# README template (apps)

Copy the skeleton below into the project's `README.md` and replace every `{…}`. A reader should know what the product does within five seconds and be able to run it within two minutes. The README holds only the sections below; everything longer goes to `docs/`.

## Copy rules

- Write for someone deciding whether to use, run or read the project: what it does, for whom, how to try it.
- Name the product and its users as the subject ("OV Berlin lists…", "Hosts create a poll…"). Keep the voice neutral and product-focused. Leave out the author's career and any address to employers, recruiters or hiring.
- Use concrete nouns and verbs from the UI. Let screenshots carry the praise: drop adjectives such as *powerful*, *seamless*, *blazing*.
- Each feature is one short sentence of up to ~15 words, led by a bold label of 2–4 words.
- Use present tense. State facts the code supports; a feature that is not shipped is left out.
- Images use the manifest `caption` as alt text, and paths start with `docs/media/`.

## Skeleton

````markdown
# {Product name}

{One-line pitch: what it does, for whom. Under 20 words, no trailing claims.}

**[Open {Product}]({live URL})** · [How it works]({explainer URL}) · [Docs](docs/)

![{hero caption}](docs/media/clips/{hero-id}.gif)

## Features

<table>
<tr>
<td width="50%"><img src="docs/media/screens/{id}-desktop-{theme}.png" alt="{caption}"></td>
<td><b>{Label}</b><br>{One sentence.}</td>
</tr>
<tr>
<td width="50%"><img src="docs/media/screens/{id}-mobile-{theme}.png" alt="{caption}" width="220"></td>
<td><b>{Label}</b><br>{One sentence.}</td>
</tr>
<!-- 3–5 rows in total. A row may use a clip GIF instead of a screenshot. -->
</table>

<details>
<summary>Light and dark themes</summary>

| Light | Dark |
| --- | --- |
| ![{caption}, light](docs/media/screens/{id}-desktop-light.png) | ![{caption}, dark](docs/media/screens/{id}-desktop-dark.png) |

</details>

## Quick start

```sh
git clone https://github.com/{owner}/{repo}.git
cd {repo}
{install command}
{run command}   # → {local URL}
```

{One line on configuration, only if something must be set before it runs (e.g. "Copy `.env.example` to `.env.local` and set `X`."). Otherwise omit.}

## How it's built

- **{Layer}:** {technology and the one decision worth knowing}.
- **{Layer}:** {…}
<!-- 3–5 bullets: frontend, data/backend, sync or pipeline, deployment. Link deep dives in docs/. -->

## More

- [{Topic}](docs/{file}.md): {what the reader finds there}
- [Media and capture config](docs/media/), refreshed with the project-showcase capture script.

## License

{License name}. See [LICENSE](LICENSE).
````

## Filling it in

- **Hero:** the manifest item with `hero: true`. Prefer its clip GIF; use a desktop screenshot when no flow tells the story better.
- **Links line:** omit "How it works" until the portfolio explainer exists, and "Docs" when `docs/` has no reader-facing pages. Never ship a placeholder link.
- **Features:** pick 3–5 manifest items that show different capabilities. Mix desktop and mobile when phones matter. Put mobile screenshots at `width="220"` so the table stays balanced.
- **Themes block:** include it only when the app has both themes (the manifest has both for the same id). Single-theme apps skip it.
- **Moving content out:** existing README material beyond these sections (architecture detail, data pipelines, deployment, ops, contribution notes) moves to `docs/<topic>.md` with its wording intact, then gets one line under **More**. Check that links inside the moved text still resolve from their new location.
