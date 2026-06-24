# Contribution Guide

## Code of Conduct

This project is committed to fostering a welcoming and inclusive community. As a contributor,
you agree to uphold the principles outlined in the [Code of Conduct](./CODE_OF_CONDUCT.md). If
you have concerns or encounter any unacceptable behavior, please reach out to cliqrelay@gmail.com.

## I Want To Contribute

> ### Legal Notice
>
> By contributing to this project, you agree that you are the original author of the contributed material and that you have the necessary rights to contribute it, and that the contributed material may be distributed under the project's license.

### Report bugs

We rely on bug reports to enhance this project for all users. To assist us, we have a bug reporting template specifying the necessary details. Ensure you check our [existing bug reports](https://github.com/CliqRelay/cliqrelay/issues?q=is%3Aissue+is%3Aopen+label%3Abug) prior to submitting a new one to avoid duplicates.

### Reporting security issues

Avoid creating a public GitHub issue for security concerns. If you discover a security vulnerability, contact us directly via email at cliqrelay@gmail.com rather than opening an issue.

### Requesting new features

To request new features, please create an issue on this project.
To ensure that we can understand the problem you are looking to solve, please be as detailed as possible.
To see what other people have already suggested, you can look [here](https://github.com/CliqRelay/cliqrelay/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement).
Please be aware that duplicate issues might already exist. If you are creating a new issue, please check existing open, or recently closed. Having a single vote for an issue is far easier for us to prioritise.

## Setup

### Requirements

To start contributing:

- [Fork](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo) the repository
- Clone the fork on your workstation:

  ```bash
  $ git clone git@github.com:{YOUR_USERNAME}/cliqrelay.git

  $ cd cliqrelay
  ```

Choose one of the following development setups:

1. `Devcontainers`:

    Once you have this repo cloned to your local system, you will need to install the VSCode extension [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack).

    Then run the following command from the command palette:
    `Dev Containers: Open Folder in Container...`

    This will automatically select the workspace folder. But if you need to find the project manually then it is located at `/workspaces/cliqrelay`. You can then proceed to the development section below.

2. `Without devcontainers`:

  - Make sure to install [Node.js](https://nodejs.org/en/download/) and set it up as shown in their docs.
  - Make sure to install [Go](https://go.dev/doc/install) and set it up as shown in their docs.

3. Make sure to also have Docker Desktop installed and running on your machine, as it is required for the development environment.

## Project Structure

This Turborepo includes the following packages/apps:

### Apps and Packages

`apps`:
- `extension`: a [Tanstack Router](https://tanstack.com/router/latest) app for the chrome extension
- `web`: a [Tanstack Start](https://tanstack.com/start/latest) web app for the platform
- `api`: a REST API built with Go 1.26+, providing all API endpoints for the platform and handling business logic, database interactions, and integrations with external services. Also includes the worker module which can be ran standalone to offload background jobs from the API (via Redis Streams).

`packages:`
- `@repo/api-client`: a TypeScript client for the API, generated from the OpenAPI spec defined in the `api` app, used by both `web` and `extension` applications
- `@repo/data-commons`: a shared library used by both `web` and `extension` applications

These packages/apps are 100% [TypeScript](https://www.typescriptlang.org/).

## Development

### Install Dependencies

`Node.js`:

- Once you have your environment set up and you are within the project, run `pnpm install` to install Node.js dependencies.

`Go`:

- Once you have your environment set up and you are within the project, run `go mod download && go mod tidy` to install Go dependencies.

- Then as a test run `make build` to ensure the project builds successfully, this could take a few seconds to a minute.

- Now install air for hot reloading of your server:

  ```bash
  # install it into ./bin/
  $ curl -sSfL https://raw.githubusercontent.com/air-verse/air/master/install.sh | sh -s
  ```

`Docker`:

- Run the following docker compose command to start the development environment:

    ```bash
    $ docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml --env-file=docker-compose.dev.env up -d
    ```

## Testing

`Node.js`:

E2E tests validate the capture-to-editor pipeline — the messaging bridge, ingestion hooks, and guide creation flow — against the full stack (DB, Redis, S3).

**Prerequisites:**
- Docker services running: `docker compose -f docker-compose.dev.yml --env-file=docker-compose.dev.env up -d`
- Playwright browsers installed: `pnpm exec playwright install chromium`

**Run e2e tests:**

```bash
# From the web app directory
pnpm --filter web test:e2e

# With UI mode
pnpm --filter web test:e2e:ui
```

**Architecture:** Tests use Approach A — simulate a capture event by posting a `cliqrelay:capture-event` message directly to `window` via `page.evaluate()`. This tests the full pipeline (messaging bridge listener → ingestion hooks → guide + step creation → editor navigation) without requiring the Chrome extension.

See `apps/web/e2e/` for test files and utilities.

`Go`:

- Run unit and integration tests:

  ```bash
  # Run all tests
  make test

  # Run specific tests
  go test -v -race ./path/to/package -run TestName
  ```

## Building

To build all apps and packages, run the following command:

```bash
$ pnpm build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

```bash
$ pnpm build --filter=web
```

## Making Changes

When making changes, please follow these guidelines:

- Follow the project’s folder structure.
- Write tests for new features.
- Ensure all code passes tests before submitting a PR.

## Submitting a PR

- Push your branch and open a pull request.
- Fill out the PR and link related issues.

## AI Agents

We welcome contributions from AI agents, but please ensure that any code generated by an AI agent is reviewed and tested by a human before submission. This helps maintain the quality and integrity of the codebase.

You can run the following script from the root of the project to symlink all the Agent Skills to some of the most well-known agent folders:

```bash
$ bash ./scripts/agent-skills-symlinker.sh
```

If you're using a different agent and the directory is not included in this script, you can raise a PR so we can add support for it.
