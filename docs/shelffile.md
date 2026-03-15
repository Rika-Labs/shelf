# Shelffile

A `shelffile` is a per-project manifest declaring which reference repos the project needs.

## Format

One repo per line: `alias url [pin:type:value]`

```
# comments start with #
effect https://github.com/Effect-TS/effect.git pin:branch:main
react https://github.com/facebook/react.git pin:tag:v19.0.0
my-lib https://github.com/org/lib.git
```

## Pin formats

- `pin:branch:<name>` — track a branch
- `pin:tag:<name>` — pin to a tag
- `pin:<40-char-hash>` — pin to a specific commit

## Usage

```bash
shelf install              # clone all repos from ./shelffile
shelf install --dir /path  # clone from a shelffile in another directory
shelf share                # generate a shelffile from current repos
shelf share --stdout       # print to stdout instead of writing
shelf share --filter a,b   # only include specific aliases
```

## Garbage collection

Shelf tracks which projects reference each repo via a registry. When repos are no longer referenced by any shelffile or manual `shelf add`, they can be cleaned up:

```bash
shelf prune --dry-run   # show what would be removed
shelf prune --force     # actually remove unreferenced repos
```
