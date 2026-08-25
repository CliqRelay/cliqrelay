# Webapp

## Development

```bash
$ pnpm install
$ pnpm dev
```

## Build

```bash
$ pnpm build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
$ pnpm test

# Run tests in a UI
$ pnpm test:ui
```

---

## NOTES

- `fmt:check` package.json script command is removed intentionally for now to allow the project to pass tests and to incrementally format files as we develop since we've migrated to Oxc now.
