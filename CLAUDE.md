# CLAUDE.md

## What is Shelf?

Shelf is a standalone CLI that maintains a global, always-up-to-date cache of code reference repositories that AI agents can read directly using their native tools. It handles repo lifecycle management: clone, pin, sync, remove.

## Commands

- `bun run src/startup/index.ts` — run shelf CLI
- `bun test` — run all tests (bun's native test runner)
- `bun test --coverage` — run with coverage
- `bunx --bun tsc --noEmit` — typecheck

## Architecture

Domain-Sliced Architecture. Each domain has flat, suffix-based files.

```
src/domain/{domain-name}/{name}-service.ts  — business logic
src/domain/{domain-name}/{name}-schema.ts   — schemas
src/domain/{domain-name}/{name}-errors.ts   — typed errors
src/domain/{domain-name}/{name}-utils.ts    — pure functions
src/cli/commands/{name}.ts                  — CLI entrypoints
src/startup/index.ts                        — CLI entrypoint
src/startup/layers/app.ts                   — layer composition
```

Dependency direction: `command → service → storage boundary`. Reverse imports forbidden.

## Effect-TS v4 Patterns

- Services use `ServiceMap.Service<Self>()("tag", { make })` with `static layer`
- Methods use `Effect.fn("ClassName.methodName")(function* (args) { ... })`
- Zero-arg methods still need `()` to call: `service.method()`
- Errors use `Schema.TaggedErrorClass<Self>()("Tag", { fields })`
- `Schema.Literal` accepts a single value; for unions use `Schema.Union([Schema.Literal("a"), Schema.Literal("b")])`
- Optional fields decoded to `Option`: use `Schema.OptionFromOptionalKey(schema)`
- `Effect.catch` replaces v3's `Effect.catchAll`
- `Effect.catchTag` still works for tagged error handling
- Import CLI from `effect/unstable/cli` (`Command`, `Flag`, `Argument`)
- Import BunRuntime from `@effect/platform-bun/BunRuntime`

## Testing

- Tests mirror source in `tests/domain/{domain}/`
- Each domain has `helpers.ts` with mock layers via `Layer.succeed(Service, Service.of(impl))`
- Use `Effect.runPromise` / `Effect.runPromiseExit` for test assertions

## Storage

- Config: `~/.config/shelf/config.json`
- Repos: `~/.config/shelf/repos/{alias}/`
