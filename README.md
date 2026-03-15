<div align="center">

  <h1>shelf</h1>
  <p><em>A global cache of code reference repositories for agents</em></p>

</div>

## Quick Start

```bash
bun install
bun run src/startup/index.ts add https://github.com/Effect-TS/effect.git
bun run src/startup/index.ts list
```

Agents read repos directly with their native tools (`Grep`, `Read`, `Glob`) at `~/.config/shelf/repos/{alias}/`.

## How It Works

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────────────┐
│  shelf add   │──────▶│  Git Clone   │──────▶│ ~/.config/shelf/repos/   │
│  shelf sync  │       │  + Pin/Sync  │       │   effect/                │
│              │       │              │       │   react/                 │
└──────────────┘       └──────────────┘       │   ...                    │
                                              └────────────┬─────────────┘
                                                           │
                                              ┌────────────▼─────────────┐
                                              │  Agent reads directly    │
                                              │  Grep, Read, Glob, ls   │
                                              └──────────────────────────┘
```

Shelf manages the lifecycle — clone, pin, sync, remove. Your agent uses its own tools to explore the code.

## Commands

| Command | Purpose |
|---------|---------|
| `shelf add <url> [--alias name] [--pin branch:main]` | Add a reference repo |
| `shelf remove <alias>` | Remove a repo |
| `shelf list` | Show repos with local paths |
| `shelf update [alias]` | Sync one or all repos |
| `shelf config [key] [value]` | View or modify configuration |
| `shelf init` | Scaffold a skill file for your agent |

## Agent Integration

Run `shelf init` to generate a skill file that teaches your agent how to discover and read shelf repos:

```bash
shelf init
# Creates .claude/skills/shelf/SKILL.md
```

The skill file points agents at `~/.config/shelf/repos/{alias}/` and lists the management commands — no wrapper needed.

## Development

```bash
bun test              # run tests
bun test --coverage   # run with coverage
bunx --bun tsc --noEmit  # typecheck
```

## License

MIT
