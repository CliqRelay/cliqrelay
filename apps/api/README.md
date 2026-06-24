# CliqRelay API

The Go backend server for CliqRelay.

## Tech Stack

- **Language:** Go 1.26+
- **Authentication:** [Authula](https://authula.vercel.app)
- **OpenAPI Spec:** Generated programmatically via [`swaggest/openapi-go`](https://github.com/swaggest/openapi-go)
- **ORM:** Bun
- **Database:** PostgreSQL
- **Cache/Event Bus/Streaming:** Redis

### Prerequisites

- **Go 1.26+**
- **PostgreSQL** (local or remote)
- **Redis**
- **Typst** — required for PDF export. See [Typst setup](#typst-setup) below.

### Setup

```sh
# Copy and fill in environment variables
cp .env.example .env

# Install dependencies
make install

# Run the server
make run
```

The server starts on the port defined by the `PORT` env var (default handled by Authula).

### Environment Variables

Make a copy of the `.env.example` as `.env` and fill in the values.

## Typst Setup

PDF generation requires the `typst` binary on `$PATH`. Install it from the prebuilt release:

```sh
# Download and extract (Linux x86_64)
curl -sL "https://github.com/typst/typst/releases/download/v0.15.0/typst-x86_64-unknown-linux-musl.tar.xz" \
  | tar -xJ -C /tmp

# Install to a directory on your PATH
cp /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst
rm -rf /tmp/typst-x86_64-unknown-linux-musl

# Verify
typst --version
```

For other platforms (macOS, ARM, Windows), see the [releases page](https://github.com/typst/typst/releases).

### Standalone template testing

The Typst template and test data live at `internal/templates/guides/`. You can compile a PDF directly to verify layout changes:

```sh
cd internal/templates/guides/
typst compile --font-path . guide.typ output.pdf
open output.pdf
```

## Commands

All commands are available via `make`:

| Command | Description |
|---|---|
| `make run` | Run the application |
| `make dev` | Run with live reloading via [air](https://github.com/air-verse/air) |
| `make build` | Build the package (library check) |
| `make build-exe` | Build the binary to `./tmp/cliqrelay-api` |
| `make test` | Run all tests with race detection |
| `make test-coverage` | Run tests with coverage report |
| `make test-pg-up` | Start a test Postgres container |
| `make test-pg-down` | Stop and remove the test Postgres container |
| `make test-pg` | Run repository tests against Postgres |
| `make lint` | Run golangci-lint |
| `make fmt` | Format code with `go fmt` |
| `make vet` | Run `go vet` |
| `make check` | Full quality check (fmt + vet + lint + test) |
| `make quick-check` | Quick check (fmt + vet + test) |
| `make ci` | Full CI pipeline (clean + install + check) |
| `make clean` | Remove build artifacts |
| `make install` | Download and tidy dependencies |
| `make setup` | Install dev tools (golangci-lint, air) and dependencies |
| `make openapi-export` | Export the OpenAPI spec to a file |

## Testing

Repository tests run against a real PostgreSQL database using schema-isolated connections. Each package gets its own Postgres schema (`pkgname_nanotimestamp`) with full migration DDL applied via the Authula migrator.

### Setup

Start a Postgres container and run the repository tests:

```bash
# Start the test Postgres container (detached)
$ make test-pg-up

# Run repository tests against Postgres
$ make test-pg

# Stop the container when done
$ make test-pg-down
```

Or point to your own Postgres instance:

```bash
TEST_DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=disable" \
  go test -race -count=1 ./internal/repositories/...
```

The default DSN is `postgres://postgres:postgres@localhost:5432/testdb?sslmode=disable`.

### Test architecture

- `TestMain` in each repository package creates a unique Postgres schema, runs the Authula `Migrator` to apply all migrations, and stores the `*bun.DB` in a package-level `testDB` variable.
- After all tests complete, the schema is dropped with `DROP SCHEMA ... CASCADE`.
- UUID-based data isolation within each schema enables `t.Parallel()` across test cases.
- Seed helpers (`seedGuide`) auto-create `users` table rows when `userID == ""`, satisfying FK constraints.

### OpenAPI Export

```bash
# Export JSON spec (default output: openapi.json)
$ make openapi-export

# Export with custom options
$ make openapi-export ARGS="--output ../../packages/api-client/openapi.json --format json --openapi-version 3.1.0"

# Export YAML
$ make openapi-export ARGS="--format yaml"
```

The exported spec is also served live at `GET /api/v1/openapi.json` when the server is running.
