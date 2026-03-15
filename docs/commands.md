# Commands

## Core

| Command | Purpose |
|---------|---------|
| `shelf add <url> [--alias name] [--pin ref]` | Add a reference repo |
| `shelf remove <alias>` | Remove a repo |
| `shelf list` | Show repos with local paths |
| `shelf update [alias]` | Sync one or all repos |

## Shelffile

| Command | Purpose |
|---------|---------|
| `shelf install [--dir path]` | Install repos from a shelffile |
| `shelf share [--filter aliases] [--stdout]` | Generate a shelffile from current repos |

## Management

| Command | Purpose |
|---------|---------|
| `shelf status` | Show detailed status of all repos |
| `shelf info <alias>` | Detailed info for a single repo |
| `shelf pin <alias> <ref>` | Pin a repo to a branch, tag, or commit |
| `shelf alias <old> <new>` | Rename a repo alias |
| `shelf prune [--dry-run] [--force]` | Remove unreferenced repos |
| `shelf config [key] [value]` | View or modify configuration |
| `shelf init [--agent name]` | Scaffold a skill file for your agent |
