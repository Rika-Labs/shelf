<div align="center">

  <h1>shelf</h1>
  <p><em>A global cache of code reference repositories for AI agents</em></p>

</div>

## Install

```bash
bun install -g @rikalabs/shelf
```

## Quick Start

```bash
# Setup agent + auto-detect project repos
shelf init
shelf init --agent claude

# Add repos by name, owner/repo, or URL
shelf add react
shelf add Effect-TS/effect
shelf add https://github.com/vercel/next.js.git --pin tag:v15.0.0

# Or use a shelffile for your project
shelf install

# Detect repos from package.json / go.mod
shelf detect
shelf detect --apply

# Keep repos fresh in the background
shelf daemon start
```

Agents read repos directly at `~/.agents/shelf/repos/{alias}/` using their native tools.

## How It Works

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────────────┐
│  shelf add   │──────▶│  Git Clone   │──────▶│ ~/.agents/shelf/repos/   │
│  shelffile   │       │  (shallow)   │       │   effect/                │
│  + install   │       │              │       │   react/                 │
└──────────────┘       └──────────────┘       │   ...                    │
                                              └────────────┬─────────────┘
                                                           │
                                              ┌────────────▼─────────────┐
                                              │  Agent reads directly    │
                                              │  Grep, Read, Glob, ls   │
                                              └──────────────────────────┘
```

Shelf manages the lifecycle — clone, pin, sync, remove. Your agent uses its own tools to explore the code. Clones are shallow by default (`--depth 1`, `--single-branch`) since repos are for code reference, not building.

## Docs

- [Commands](docs/commands.md) — full command reference
- [Shelffile](docs/shelffile.md) — per-project repo manifests and garbage collection
- [Agent Integration](docs/agent-integration.md) — setting up skill files for your agent

## Development

```bash
bun test                 # run tests
bunx --bun tsc --noEmit  # typecheck
```

## License

MIT
