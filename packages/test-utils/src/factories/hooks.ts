/**
 * Hooks Factory
 *
 * Factory functions for creating test hook data
 */

import type { GlobalHook, HookType } from '@ccm/shared';

let hookCounter = 0;

/**
 * Creates a global hook with default or custom properties
 */
export function createHook(overrides?: Partial<GlobalHook>): GlobalHook {
  hookCounter++;

  const now = new Date();

  return {
    id: overrides?.id ?? `hook_${hookCounter}`,
    hookType: overrides?.hookType ?? 'PreToolUse',
    matcher: overrides?.matcher ?? '*',
    command: overrides?.command ?? 'echo "Test hook"',
    timeout: overrides?.timeout ?? null,
    description: overrides?.description ?? null,
    enabled: overrides?.enabled ?? true,
    order: overrides?.order ?? 0,
    category: overrides?.category ?? null,
    tags: overrides?.tags ?? '',
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    ...overrides,
  };
}

/**
 * Creates multiple hooks
 */
export function createHooks(count: number, overrides?: Partial<GlobalHook>): GlobalHook[] {
  return Array.from({ length: count }, () => createHook(overrides));
}

/**
 * Creates a pre-tool-use hook
 */
export function createPreToolUseHook(): GlobalHook {
  return createHook({
    hookType: 'PreToolUse',
    matcher: 'Write|Edit',
    command: 'echo "Before file write"',
    description: 'Run before file writes',
    category: 'security',
    tags: 'file,security',
  });
}

/**
 * Creates a post-tool-use hook
 */
export function createPostToolUseHook(): GlobalHook {
  return createHook({
    hookType: 'PostToolUse',
    matcher: 'Write',
    command: 'prettier --write "$CLAUDE_TOOL_FILE_PATH"',
    description: 'Format files after writing',
    category: 'formatting',
    tags: 'prettier,formatting',
  });
}

/**
 * Creates a git commit hook
 */
export function createGitCommitHook(): GlobalHook {
  return createHook({
    hookType: 'PreToolUse',
    matcher: 'Bash(git:commit)',
    command: 'git diff --staged',
    description: 'Show staged changes before commit',
    category: 'git',
    tags: 'git,commit',
  });
}

/**
 * Creates a session start hook
 */
export function createSessionStartHook(): GlobalHook {
  return createHook({
    hookType: 'SessionStart',
    matcher: '*',
    command: 'echo "Session started at $(date)"',
    description: 'Log session start time',
    category: 'notifications',
    tags: 'session,logging',
  });
}

/**
 * Creates a stop hook
 */
export function createStopHook(): GlobalHook {
  return createHook({
    hookType: 'Stop',
    matcher: '*',
    command: 'echo "Stopping Claude Code"',
    description: 'Run cleanup before stopping',
    category: 'notifications',
    tags: 'stop,cleanup',
  });
}

/**
 * Creates hooks for all hook types
 */
export function createHooksByType(): Record<HookType, GlobalHook> {
  return {
    PreToolUse: createPreToolUseHook(),
    PostToolUse: createPostToolUseHook(),
    SessionStart: createSessionStartHook(),
    Stop: createStopHook(),
    Notification: createHook({ hookType: 'Notification', description: 'Notification hook' }),
    SubagentStop: createHook({ hookType: 'SubagentStop', description: 'Subagent stop hook' }),
  };
}

/**
 * Creates hooks grouped by category
 */
export function createHooksByCategory(): Record<string, GlobalHook[]> {
  return {
    git: [
      createGitCommitHook(),
      createHook({
        hookType: 'PreToolUse',
        matcher: 'Bash(git:push)',
        command: 'git log -1',
        category: 'git',
      }),
    ],
    formatting: [
      createPostToolUseHook(),
      createHook({
        hookType: 'PostToolUse',
        matcher: 'Write',
        command: 'eslint --fix "$CLAUDE_TOOL_FILE_PATH"',
        category: 'formatting',
      }),
    ],
    security: [
      createPreToolUseHook(),
      createHook({
        hookType: 'PreToolUse',
        matcher: 'Bash',
        command: 'echo "Running bash command"',
        category: 'security',
      }),
    ],
    notifications: [
      createSessionStartHook(),
      createStopHook(),
    ],
  };
}

/**
 * Creates a disabled hook
 */
export function createDisabledHook(): GlobalHook {
  return createHook({
    enabled: false,
    description: 'Disabled test hook',
  });
}

/**
 * Creates a hook with timeout
 */
export function createHookWithTimeout(): GlobalHook {
  return createHook({
    command: 'sleep 5',
    timeout: 10,
    description: 'Hook with 10 second timeout',
  });
}

/**
 * Reset counter (useful for test isolation)
 */
export function resetHookCounters(): void {
  hookCounter = 0;
}
