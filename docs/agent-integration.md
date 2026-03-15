# Agent Integration

Run `shelf init` to generate a skill file that teaches your agent how to discover and read shelf repos.

```bash
shelf init                    # writes to .agents/skills/shelf/SKILL.md (universal)
shelf init --agent claude     # writes to .claude/skills/shelf/SKILL.md
shelf init --agent opencode   # writes to .opencode/skills/shelf/SKILL.md
shelf init --agent gemini     # writes to .gemini/skills/shelf/SKILL.md
```

By default, shelf writes to `.agents/skills/shelf/` — the cross-agent standard read by Codex, Copilot, Amp, OpenCode, and Gemini. Use `--agent` only for agents that require their own directory.

## How agents use shelf

Agents read repos directly with their native file tools:

- **Search**: `Grep` / `rg` on `~/.agents/shelf/repos/{alias}/`
- **Read files**: `Read` / `cat` on any file in the repo
- **Find files**: `Glob` with patterns like `~/.agents/shelf/repos/{alias}/**/*.ts`
- **Explore**: `ls ~/.agents/shelf/repos/{alias}/src/`

Run `shelf list` to see available repos and their local paths.
