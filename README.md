# @playwright-squash/playwright-squash

Syncs [Playwright](https://playwright.dev) tests into [Squash TM](https://www.squashtest.com/) as test cases, and publishes run results into a campaign iteration.

Checked against Squash TM 8.1.1 (`/api/rest/latest`). The Squash project needs the built-in automation technology `Playwright`, and the nature and type info-list codes the tests send. An unknown code fails the sync with HTTP 412.

The package does not ship a folder layout. Each consumer commits its own `squash-config.json`. A copy of another team's file places cases in that team's folders and the sync still reports success.

## Install

```sh
npm install --save-dev @playwright-squash/playwright-squash
```

`@playwright/test` 1.64.1 or newer is a peer dependency. `zod` 4 is installed with this package. Node.js 22.18 or newer.

TypeScript resolves the entry points through the package `exports` map. Set `"moduleResolution"` to `node16`, `nodenext`, or `bundler`.

## Opt a test in

Only tests tagged `@squash` are synced. A field left out stays as Squash has it.

```ts
import { test } from '@playwright/test';
import { squash } from '@playwright-squash/playwright-squash/annotations';

test.describe('Gyms', { tag: ['@squash'] }, () => {
  test(
    'visitor should see the gym list when opening Gyms',
    {
      tag: ['@smoke'],
      annotation: squash({ weight: 'high', status: 'approved', nature: 'functional', type: 'regression' }),
    },
    async () => {
      // ...
    },
  );
});
```

Top-level `test.step` titles that start with `Given`, `When`, `Then`, `And`, or `But` are copied into the Gherkin script on a passing publish. `squash:sync` lists tests and does not run them, so it keeps the steps Squash already holds.

Pin a case with `@Squash_<id>` before renaming the test, or the next sync creates a new case. The sync never deletes or moves cases.

## Configuration

Precedence, lowest to highest: defaults, then `squash-config.json`, then its `projects.<id>` section, then `SQUASH_TM_*` environment variables, then `--squash-*` flags.

Start from [`squash-config.example.json`](squash-config.example.json). Point at another path with `SQUASH_TM_CONFIG` when the file is not `squash-config.json` in the working directory.

The token is `SQUASH_TM_TOKEN` only. It is rejected in the config file and on the command line. Username and password are not supported.

| Variable                                                                                         | Role                                                                     |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `SQUASH_TM_URL`                                                                                  | Squash root, including the context path (`http://localhost:8080/squash`) |
| `SQUASH_TM_TOKEN`                                                                                | Personal API token                                                       |
| `SQUASH_TM_PROJECT_ID`                                                                           | Squash project id                                                        |
| `SQUASH_TM_MODE`                                                                                 | `dry-run` (default), `publish`, or `auto`                                |
| `SQUASH_TM_FAIL_ON_ERROR`                                                                        | When `true`, a Squash failure fails the Playwright run. Default is false |
| `SQUASH_TM_CAMPAIGN`, `SQUASH_TM_ITERATION`, `SQUASH_TM_ITERATION_ID`, `SQUASH_TM_TEST_SUITE_ID` | Where results are published                                              |
| `SQUASH_TM_FILTER_FOLDER`                                                                        | Run only the tests whose cases sit in this Squash folder                 |
| `SQUASH_TM_ENVIRONMENT`                                                                          | Name used in the iteration. Then `APP_ENV`, then `local`                 |
| `SQUASH_TM_PROFILE`                                                                              | Which `.env.<profile>.local` is read first. Then `APP_ENV`, then `local` |

`mode: auto` publishes when `CI`, `TF_BUILD`, `GITLAB_CI`, `GITHUB_ACTIONS`, `BUILDKITE`, `CIRCLECI`, or `TRAVIS` is `true` or `1`, or when `JENKINS_URL` or `TEAMCITY_VERSION` is set. Otherwise it dry-runs and logs a warning.

Startup reads `SQUASH_TM_*` keys from `.env.<profile>.local`, `.env.<profile>`, `.env.local`, `.env`, then other `.env*.local` files. A value already in the environment wins. The log names the file, not the value.

## Reporters

Publish once, from the merged report, never from a shard.

```sh
# Dry-run sync: lists what would be created or updated. No connection required.
SQUASH_TM_MODE=dry-run npx playwright test --list \
  --reporter=@playwright-squash/playwright-squash/sync

# Publish results. Add the reporter in config, or on the command:
SQUASH_TM_MODE=publish SQUASH_TM_URL=http://localhost:8080/squash \
  SQUASH_TM_TOKEN=… SQUASH_TM_PROJECT_ID=1 \
  SQUASH_TM_CAMPAIGN="Releases/2.4" SQUASH_TM_ITERATION="Nightly" \
  npx playwright test --reporter=list,@playwright-squash/playwright-squash/results
```

`@playwright-squash/playwright-squash/select` writes a Playwright `--test-list` for `SQUASH_TM_FILTER_FOLDER` or `SQUASH_TM_TEST_SUITE_ID`. The `playwright-squash` command runs that pass, then the tests.

## Commands

```sh
# Select the Squash folder or suite, then run those tests and publish.
npx playwright-squash --squash-mode=publish --squash-project-id=1 \
  --squash-campaign="Releases/2.4" --squash-iteration="Nightly" --project=chromium

# A release also creates one Squash execution per test.
npx playwright-squash --squash-mode=publish --squash-release=true --squash-project-id=1 \
  --squash-campaign="Releases/2.4" --squash-iteration="2.4.0"

# Preview, then delete, sync-owned cases in named folders. `/` is the project root.
npx playwright-squash-prune --folder Playwright
npx playwright-squash-prune --folder Playwright --yes
```

Flags that are not `--squash-*` are passed through to `playwright test`. A `--reporter` list keeps the results reporter on the end.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
npm run smoke
```

`npm test` runs the unit tests. They do not launch a browser and do not call Squash. `npm run build` writes `dist/`. `npm pack` and `npm publish` build first. `npm run smoke` packs the package, installs it in a temporary CommonJS project, and loads the public entry points.

## Publishing

A tag `v<version>` publishes that version to the npm registry. The tag has to equal the `version` in `package.json`: `v0.1.0` publishes `0.1.0`. The workflow runs the unit tests, the typecheck, and the packed-install smoke test before `npm publish`. A version already on the registry is skipped, so a failed run can be re-run. npm versions are immutable.

Auth is [trusted publishing](https://docs.npmjs.com/trusted-publishers). On the package settings at npmjs, add a GitHub Actions publisher:

| Field                | Value                 |
| -------------------- | --------------------- |
| Organization or user | `ianoflynnautomation` |
| Repository           | `playwright-squash`   |
| Workflow filename    | `npm-publish.yml`     |
| Environment name     | leave empty           |
| Allowed actions      | `npm publish`         |

The package has to exist before that setting can be saved. Log in as the npm user `iofautomation` and publish `0.1.0` once (`npm login`, then `npm publish`). That account publishes into the npm org `playwright-squash`. Add the publisher the same day, then push tags for later versions. A publisher that does not complete a publish within two days of being created expires. The table above is the GitHub repository. It is separate from the npm org.

The optional repository secret `NPM_TOKEN` publishes when it is set. Remove it once trusted publishing works. While the secret is set, npm uses the token and does not validate the publisher.
