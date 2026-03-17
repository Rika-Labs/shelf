# Commands

## Core

| Command | Purpose |
|---------|---------|
| `shelf add <repo> [--alias name] [--pin ref] [--depth N] [--sparse paths]` | Add a reference repo |
| `shelf remove <alias>` | Remove a repo |
| `shelf list` | Show repos with local paths |
| `shelf update [alias]` | Sync one or all repos |

### Shorthand resolution

`shelf add` accepts multiple input formats — you don't need the full git URL:

```bash
shelf add react                        # bare name → built-in registry (~90 popular repos)
shelf add Effect-TS/effect             # owner/repo → github.com
shelf add github:vercel/next.js        # prefixed → github.com (also gitlab:, bitbucket:)
shelf add https://github.com/org/repo  # full URL → used directly
shelf add ./local-repo                 # local path → used directly
```

Unknown bare names fall back to a GitHub API search by stars.

### Pin formats

- `--pin branch:<name>` — track a branch (auto-syncs)
- `--pin tag:<name>` — pin to a tag
- `--pin <commit-hash>` — pin to a specific commit
- `--pin auto` — resolve version from `package.json` dependencies

### Clone behavior

All clones default to `--depth 1` and `--single-branch` since repos are for code reference, not building. Use `--depth` to override.

## Detection

| Command | Purpose |
|---------|---------|
| `shelf detect [--dir path]` | Scan project dependencies and show matching repos |
| `shelf detect --apply` | Detect and add all found repos |
| `shelf detect --format shelffile` | Output detected repos in shelffile format |

Scans `package.json` (npm) and `go.mod` (Go) for dependencies. Matches against the built-in registry first (instant, no network), then falls back to the npm registry API.

## Shelffile

| Command | Purpose |
|---------|---------|
| `shelf install [--dir path] [--concurrency N]` | Install repos from a shelffile (default concurrency: 4) |
| `shelf share [--filter aliases] [--stdout]` | Generate a shelffile from current repos |

## Daemon

| Command | Purpose |
|---------|---------|
| `shelf daemon start [--foreground]` | Start background sync daemon |
| `shelf daemon stop` | Stop the daemon |
| `shelf daemon status` | Show daemon status (PID, uptime, last sync) |
| `shelf daemon logs [--lines N]` | Show daemon log output (default: 50 lines) |
| `shelf daemon restart` | Stop and restart the daemon |

The daemon runs `syncAll()` on a configurable interval (`shelf config syncIntervalMinutes <N>`, default 60). It re-reads config each cycle so new repos are picked up automatically.

## Management

| Command | Purpose |
|---------|---------|
| `shelf status` | Show detailed status of all repos |
| `shelf info <alias>` | Detailed info for a single repo |
| `shelf pin <alias> <ref>` | Pin a repo to a branch, tag, or commit |
| `shelf alias <old> <new>` | Rename a repo alias |
| `shelf prune [--dry-run] [--force]` | Remove unreferenced repos |
| `shelf config [key] [value]` | View or modify configuration |
| `shelf init [--agent name] [--no-detect]` | Scaffold a skill file and detect project repos |
