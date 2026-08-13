---
name: backend
description: Go backend patterns for the api app — covering dependency injection, services, repositories, handlers, use cases, plugins, service registry, and TDD unit testing
---

# Backend Patterns

Reusable patterns for the Go backend (`apps/api`). These skills cover the layered architecture: repositories → services → use cases → handlers, wired via constructor-based dependency injection and organized around a plugin system.

## Architecture Overview

Dependencies flow bottom-up and are wired in `bootstrap.go`:

- **Repositories** accept `bun.IDB` and return interfaces — data access only
- **Services** accept repositories and return interfaces — business logic
- **Use cases** accept services — orchestrate multi-service workflows
- **Handlers** accept use cases — HTTP boundary only
- **Plugins** accept a `PluginContext`, retrieve services from the registry, and expose routes/migrations

## Skills

### [Dependency Injection](./dependency-injection/SKILL.md)
Constructor-based DI — dependencies passed via parameters, interface-based, wired at bootstrap time. No service locators or global state.

### [Repositories & Data Access](./repositories-and-data-access/SKILL.md)
One repository interface per domain model, implemented with Bun ORM. CRUD only, `WithTx` support, context-aware, no business logic.

### [Services & Interfaces](./services-and-interfaces/SKILL.md)
Services encapsulate business logic — interfaces exported from `interfaces.go`, implemented by concrete structs with constructors that inject repositories.

### [Use Cases & Orchestration](./use-cases-and-orchestration/SKILL.md)
Orchestrate multiple services for application-level workflows. Single `Execute` method, pure domain, no HTTP concerns.

### [Handlers & HTTP](./handlers-and-http/SKILL.md)
Thin HTTP boundary — parse/validate requests, delegate to use cases, map errors to status codes via `constants/errors.go`, format responses with `reqCtx.SetJSONResponse`.

### [Plugin Architecture](./plugin-architecture/SKILL.md)
Self-contained pluggable features (OAuth2, JWT, email-password) with metadata, `Init`, optional Routes/Migrations/Middleware, and lifecycle cleanup.

### [Service Registry](./service-registry/SKILL.md)
Thread-safe registry for runtime service discovery between plugins. Register in `Init`, retrieve with type assertions, using `models.ServiceXxx` constants.

### [TDD & Unit Testing](./tdd-unit-testing/SKILL.md)
Red-Green-Refactor testing — mocked dependencies, table-driven tests, AAA pattern, real SQLite for repositories, httptest for handlers.
