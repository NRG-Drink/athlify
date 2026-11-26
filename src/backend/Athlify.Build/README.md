# Athlify.Build

Build pipeline for Athlify, written with [ModularPipelines](https://github.com/thomhurst/ModularPipelines). The same project runs locally and in GitHub Actions.

## What it does

| Stage | Modules |
| --- | --- |
| Always | Find repo paths, restore/build/test the .NET solution, generate the .NET test report, install/build/test the frontend with coverage |
| Release (default only) | GitVersion, publish `Athlify.Api` as a container image, copy the frontend `dist` into the API, Docker login and push to `ghcr.io`, create the GitHub release |

Modules marked server-only (artifact upload, GitHub step summary, Docker login, release) are skipped on a local machine. Modules marked local-only (opening the test reports) are skipped in CI.

## Arguments

| Argument | Effect |
| --- | --- |
| *(none)* | Run the full pipeline including the release stage |
| `--test-only` | Run only the build and test stages. The leading dashes and the casing are ignored, so `test-only` works too |

```powershell
dotnet run -c Release
dotnet run -c Release -- --test-only
```

Run these commands from this folder. The arguments after the first `--` go to the pipeline, not to `dotnet run`.

## Usage in CI

| Workflow | Trigger | Arguments |
| --- | --- | --- |
| [ci-cd.build-test.yml](../../../.github/workflows/ci-cd.build-test.yml) | Pull requests | `--test-only` |
| [ci-cd.build-test-pack-publish-push.yml](../../../.github/workflows/ci-cd.build-test-pack-publish-push.yml) | Push to `main`, manual | none |

Both workflows pass `GITHUB_TOKEN` and upload `artifacts-upload/` (test reports) after the run.
