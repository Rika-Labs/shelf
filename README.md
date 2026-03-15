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
# Add a repo
shelf add https://github.com/Effect-TS/effect.git
shelf list

# Or use a shelffile for your project
shelf install
```

Agents read repos directly at `~/.agents/shelf/repos/{alias}/` using their native tools.

## How It Works

```
shelf add / install  ──▶  Git Clone + Pin/Sync  ──▶  ~/.agents/shelf/repos/
                                                        effect/
                                                        react/
                                                        ...
                                                         │
                                                         ▼
                                                  Agent reads directly
                                                  (Grep, Read, Glob)
```

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
