# Context Optimizer

Manage CLAUDE.md optimization to reduce token waste.

## Usage

- `/context analyze` - Analyze current project's CLAUDE.md for optimization opportunities
- `/context optimize` - Preview and apply optimizations
- `/context status` - Show current optimization status and health score
- `/context archives` - List and manage archived content

## Commands

```bash
# Analyze
ccm context analyze
ccm context analyze --verbose

# Optimize
ccm context optimize --dry-run      # Preview only
ccm context optimize                 # Apply with confirmation
ccm context optimize --strategy moderate

# Archives
ccm context archives
ccm context archives show <id>
ccm context archives restore <id>

# Rules
ccm context rules list
ccm context rules add --interactive
```

## Strategies

- **conservative** - Archive only, never modify in place
- **moderate** - Archive + condense + dedupe (recommended)
- **aggressive** - Minimize to essential context only
