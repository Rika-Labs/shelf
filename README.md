<div align="center">

  <h1>shelf</h1>
  <p><em>A CLI to manage a global cache of code reference repositories for agents</em></p>

</div>

## Install

```bash
bun install -g @rikalabs/shelf
```

## Quick Start

```bash
shelf add https://github.com/Effect-TS/effect.git
shelf list
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
shelf init                    # writes to .agents/skills/shelf/SKILL.md (universal)
shelf init --agent claude     # writes to .claude/skills/shelf/SKILL.md
shelf init --agent opencode   # writes to .opencode/skills/shelf/SKILL.md
shelf init --agent gemini     # writes to .gemini/skills/shelf/SKILL.md
```

By default, shelf writes to `.agents/skills/shelf/` — the cross-agent standard read by Codex, Copilot, Amp, OpenCode, and Gemini. Use `--agent` only for agents that require their own directory.

## Development

```bash
bun test              # run tests
bun test --coverage   # run with coverage
bunx --bun tsc --noEmit  # typecheck
```

## License

MIT
