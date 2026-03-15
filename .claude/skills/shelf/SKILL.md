---
name: shelf
description: >
  Access code reference repositories managed by shelf. Repos are cached at
  ~/.config/shelf/repos/{alias}/ and kept in sync. Use your native tools
  (Grep, Read, Glob) to explore them.
---

# Shelf — Code Reference Repos

Shelf maintains a local cache of code reference repositories at
`~/.config/shelf/repos/{alias}/`.

## Discovery

Run `shelf list` to see available repos and their local paths.

## Reading Code

Use your native tools directly on the repo directories:

- **Search**: `Grep` or `rg` on `~/.config/shelf/repos/{alias}/`
- **Read files**: `Read` on any file in the repo
- **Find files**: `Glob` with patterns like `~/.config/shelf/repos/{alias}/**/*.ts`
- **Explore**: `ls ~/.config/shelf/repos/{alias}/src/`

## Management Commands

| Command | Purpose |
|---------|---------|
| `shelf list` | Show repos with local paths |
| `shelf update` | Sync all repos to latest |
| `shelf update <alias>` | Sync a specific repo |
| `shelf add <url> --alias <name>` | Add a new reference repo |
| `shelf remove <alias>` | Remove a repo |
