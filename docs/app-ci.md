# Shared checks and deploys

Apps that follow [app-standard.md](app-standard.md) use these shared parts
instead of copying CI files. Call each one pinned to a commit of this
repository, as part 8 of the standard asks.

## Checks: `.github/workflows/app-checks.yml`

Call it once per check level. Fast checks run on each push to main and on pull
requests; browser checks run after them.

```yaml
jobs:
  check:
    uses: santistebanc/skills/.github/workflows/app-checks.yml@<commit>
    with:
      stages: |
        checks: npm run check:fast
  browser:
    needs: check
    uses: santistebanc/skills/.github/workflows/app-checks.yml@<commit>
    with:
      browsers: true
      audit: false
      stages: |
        build: npm run frontend:build
        browsers: npm run test:e2e
```

- Each stage line is `id: command`. Stages run in order and stop at the first failure.
- `install` (default `npm ci --ignore-scripts`) fails when the lock file is out of date.
- The `audit` job fails on high or critical `npm audit` findings. Turn it off on the second call so it runs once. `audit-allow` lists advisory ids that have no fixed version yet; they show as warnings. Write why next to the call, and remove the id when a fix exists.
- `result` runs after the stages, also on failure, with `CHECK_OUTCOME` and `CHECK_STEPS` (the outcome of `install` and of each stage). `evidence-path` keeps files for 7 days.

## Deploys: `.github/workflows/app-deploy.yml`

It runs the app's deploy script for `preview`, `staging` or `production` in
the GitHub environment of the same name. That environment holds
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and any approval rule.

- Preview: from a work branch, when a reviewer must try it.
- Staging: after a merge into main.
- Production: only from a release on the owner's request. Merging never deploys production.

When the project-delivery coordinator publishes an app, it stays the owner of
its destinations. Call the deploy workflow from the coordinator's release
step, or do not use it for that app.

## Library updates: `renovate/app.json`

Add `renovate.json` to the app and install the Renovate GitHub app for the repository:

```json
{ "extends": ["github>santistebanc/skills//renovate/app"] }
```

It opens one grouped pull request each Monday for minor and patch updates, one
pull request for each major update, and security fixes at once. CI must pass
before a merge.
