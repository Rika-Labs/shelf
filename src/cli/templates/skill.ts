export const skillTemplate = `---
name: shelf
description: >
  Access code reference repositories managed by shelf. Repos are cached at
  ~/.agents/shelf/repos/{alias}/ and kept in sync. Use your native tools
  (Grep, Read, Glob) to explore them.
---

# Shelf — Code Reference Repos

Shelf maintains a local cache of code reference repositories at
\`~/.agents/shelf/repos/{alias}/\`.

## Discovery

Run \`shelf list\` to see available repos and their local paths.

## Reading Code

Use your native tools directly on the repo directories:

- **Search**: \`Grep\` or \`rg\` on \`~/.agents/shelf/repos/{alias}/\`
- **Read files**: \`Read\` on any file in the repo
- **Find files**: \`Glob\` with patterns like \`~/.agents/shelf/repos/{alias}/**/*.ts\`
- **Explore**: \`ls ~/.agents/shelf/repos/{alias}/src/\`

## Management Commands

| Command | Purpose |
|---------|---------|
| \`shelf list\` | Show repos with local paths |
| \`shelf update [alias]\` | Sync one or all repos |
| \`shelf add <url> [--alias name] [--pin ref]\` | Add a new reference repo |
| \`shelf remove <alias>\` | Remove a repo |
| \`shelf install [--dir path]\` | Install repos from a shelffile |
| \`shelf share [--filter aliases] [--stdout]\` | Generate a shelffile from current repos |
| \`shelf prune [--dry-run] [--force]\` | Remove unreferenced repos |
| \`shelf status\` | Show detailed status of all repos |
| \`shelf info <alias>\` | Show detailed info for a single repo |
| \`shelf pin <alias> <ref>\` | Pin a repo to a branch, tag, or commit |
| \`shelf alias <old> <new>\` | Rename a repo alias |

## Shelffile

A \`shelffile\` is a per-project manifest declaring which reference repos the project needs. Format:

\\\`\\\`\\\`
# one repo per line: alias url [pin:type:value]
effect https://github.com/Effect-TS/effect.git pin:branch:main
react https://github.com/facebook/react.git pin:tag:v19.0.0
\\\`\\\`\\\`

Run \`shelf install\` in a project directory to clone all repos from its shelffile. Run \`shelf share\` to generate a shelffile from your current repos.
`;
