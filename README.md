<div align="center">

  <h1>shelf</h1>
  <p><em>A CLI to manage a global cache of code reference repositories for agents</em></p>

</div>

## Install

```bash
bun install -g @rikalabs/shelf
```

## Quick Start

**One-off add:**
```bash
shelf add https://github.com/Effect-TS/effect.git
shelf list
```

**Project shelffile:**
```bash
# Create a shelffile in your project
cat > shelffile <<EOF
effect https://github.com/Effect-TS/effect.git pin:branch:main
react https://github.com/facebook/react.git pin:tag:v19.0.0
EOF

shelf install    # clones all repos from the shelffile
```

Agents read repos directly with their native tools (`Grep`, `Read`, `Glob`) at `~/.agents/shelf/repos/{alias}/`.

## How It Works

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────────────┐
│  shelf add   │──────▶│  Git Clone   │──────▶│ ~/.agents/shelf/repos/   │
│  shelffile   │       │  + Pin/Sync  │       │   effect/                │
│  + install   │       │              │       │   react/                 │
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
| `shelf add <url> [--alias name] [--pin ref]` | Add a reference repo |
| `shelf remove <alias>` | Remove a repo |
| `shelf list` | Show repos with local paths |
| `shelf update [alias]` | Sync one or all repos |
| `shelf install [--dir path]` | Install repos from a shelffile |
| `shelf share [--filter aliases] [--stdout]` | Generate a shelffile from current repos |
| `shelf prune [--dry-run] [--force]` | Remove unreferenced repos |
| `shelf status` | Show detailed status of all repos |
| `shelf info <alias>` | Detailed info for a single repo |
| `shelf pin <alias> <ref>` | Pin a repo to a branch, tag, or commit |
| `shelf alias <old> <new>` | Rename a repo alias |
| `shelf config [key] [value]` | View or modify configuration |
| `shelf init` | Scaffold a skill file for your agent |

## Shelffile

A `shelffile` is a per-project manifest declaring which reference repos the project needs:

```
# one repo per line: alias url [pin:type:value]
effect https://github.com/Effect-TS/effect.git pin:branch:main
react https://github.com/facebook/react.git pin:tag:v19.0.0
my-lib https://github.com/org/lib.git
```

Pin formats: `pin:branch:<name>`, `pin:tag:<name>`, `pin:<40-char-commit-hash>`.

- `shelf install` — clone all repos from the shelffile and register the project
- `shelf share` — generate a shelffile from your currently shelved repos
- `shelf share --stdout` — print to stdout instead of writing a file

## Garbage Collection

Shelf tracks which projects and manual adds reference each repo. When repos are no longer referenced by any shelffile or manual add, `shelf prune` can clean them up:

```bash
shelf prune --dry-run   # show what would be removed
shelf prune --force     # actually remove unreferenced repos
```

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
