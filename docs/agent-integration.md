# Agent Integration

Run `shelf init` to generate a skill file that teaches your agent how to discover and read shelf repos. Init also auto-detects project dependencies and adds matching repos.

```bash
shelf init                    # writes to .agents/skills/shelf/SKILL.md (universal)
shelf init --agent claude     # writes to .claude/skills/shelf/SKILL.md
shelf init --agent opencode   # writes to .opencode/skills/shelf/SKILL.md
shelf init --agent gemini     # writes to .gemini/skills/shelf/SKILL.md
shelf init --no-detect        # write skill file only, skip dependency detection
```

By default, shelf writes to `.agents/skills/shelf/` — the cross-agent standard read by Codex, Copilot, Amp, OpenCode, and Gemini. Use `--agent` only for agents that require their own directory.

## How agents use shelf

Agents read repos directly with their native file tools:

- **Search**: `Grep` / `rg` on `~/.agents/shelf/repos/{alias}/`
- **Read files**: `Read` / `cat` on any file in the repo
- **Find files**: `Glob` with patterns like `~/.agents/shelf/repos/{alias}/**/*.ts`
- **Explore**: `ls ~/.agents/shelf/repos/{alias}/src/`

Run `shelf list` to see available repos and their local paths.

## Adding repos

Agents or users can add repos by name — no full URL required:

```bash
shelf add react              # resolves from built-in registry
shelf add Effect-TS/effect   # resolves owner/repo to GitHub
shelf detect --apply         # detect and add from project dependencies
```

## Background sync

For always-fresh repos, start the background daemon:

```bash
shelf daemon start     # sync repos on a configurable interval
shelf daemon status    # check daemon health
```
