# README template (libraries)

For a package with no UI (e.g. treem). The [app template](readme-template.md)'s copy rules, link-line rule and "Moving content out" rule all apply. Instead of screenshots, a library is shown with **a diagram of its model** and **runnable examples whose output is printed**. A reader should understand the core idea from the diagram and copy a working snippet within a minute.

## Skeleton

````markdown
# {Package name}

{One-line pitch: what problem it solves, for whom. Under 20 words.}

[![npm](https://img.shields.io/npm/v/{package})](https://www.npmjs.com/package/{package}) · [How it works]({explainer URL}) · [API](docs/api.md)

```mermaid
{Diagram of the core model: the data structure, its operations, or the pipeline a call goes through. 5–12 nodes.}
```

## Install

```sh
npm install {package}
```

## Examples

### {Task 1, phrased as what the user wants}

```ts
{Smallest complete program: imports, input, one call, a log line.}
```

```text
{Its exact output, pasted from a real run.}
```

### {Task 2}
…
<!-- 3–5 examples, simplest first. Each mirrors a file in examples/ that runs as-is. -->

## How it's built

- **{Core idea}:** {the data structure or algorithm and its key trade-off}.
- **{Guarantee}:** {complexity, immutability, typing, test coverage, as the code supports}.
<!-- 3–5 bullets. -->

## More

- [API reference](docs/api.md)
- [{Topic}](docs/{file}.md): {what the reader finds there}

## License

{License name}. See [LICENSE](LICENSE).
````

## Filling it in

- **Diagram:** Mermaid renders on GitHub and stays diffable. Draw the concept a user must hold in their head, not the folder structure. If the explainer needs an image, export the same diagram to `docs/media/diagram.svg`.
- **Examples are runnable:** each one lives in `examples/<name>.(ts|js)` and runs with one command (add `"examples": "…"` to `package.json` if needed). Run every example, paste its real output, and keep README snippets identical to the files. An example whose output you did not see is left out.
- **Badge line:** only badges that hold facts (published version, CI status). Omit the npm badge for unpublished packages.
- **Showcase media:** a library may still have a demo app or playground; capture it with the app workflow and add one GIF under the diagram.
