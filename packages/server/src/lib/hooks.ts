import { prisma } from './db';
import type { GlobalHook, GlobalHookCreate, ClaudeSettingsHookGroup, HookType } from '@ccm/shared';

// Parse settings.local.json hook format into our normalized format
export function parseClaudeHooks(settingsHooks: Record<string, ClaudeSettingsHookGroup[]>): GlobalHookCreate[] {
  const hooks: GlobalHookCreate[] = [];

  for (const [hookType, hookGroups] of Object.entries(settingsHooks)) {
    if (!Array.isArray(hookGroups)) continue;

    for (const group of hookGroups) {
      const matcher = group.matcher || '*';

      // Handle nested hooks array format
      if (group.hooks && Array.isArray(group.hooks)) {
        for (const hook of group.hooks) {
          if (hook.command) {
            hooks.push({
              hookType: hookType as HookType,
              matcher,
              command: hook.command,
              timeout: hook.timeout,
              description: guessHookDescription(hook.command),
              category: guessHookCategory(hook.command),
              enabled: true,
            });
          }
        }
      }
      // Handle direct command format (legacy)
      else if (group.command) {
        hooks.push({
          hookType: hookType as HookType,
          matcher,
          command: group.command,
          timeout: group.timeout,
          description: guessHookDescription(group.command),
          category: guessHookCategory(group.command),
          enabled: true,
        });
      }
    }
  }

  return hooks;
}

// Export hooks to settings.local.json format
export function exportToClaudeFormat(hooks: GlobalHook[]): Record<string, any[]> {
  const result: Record<string, any[]> = {};

  // Group by hookType
  const grouped = hooks.reduce((acc, hook) => {
    if (!hook.enabled) return acc;

    if (!acc[hook.hookType]) {
      acc[hook.hookType] = [];
    }
    acc[hook.hookType].push(hook);
    return acc;
  }, {} as Record<string, GlobalHook[]>);

  // Convert to Claude format
  for (const [hookType, typeHooks] of Object.entries(grouped)) {
    // Group by matcher
    const byMatcher = typeHooks.reduce((acc, hook) => {
      if (!acc[hook.matcher]) {
        acc[hook.matcher] = [];
      }
      acc[hook.matcher].push(hook);
      return acc;
    }, {} as Record<string, GlobalHook[]>);

    result[hookType] = Object.entries(byMatcher).map(([matcher, matcherHooks]) => ({
      matcher,
      hooks: matcherHooks
        .sort((a, b) => a.order - b.order)
        .map(h => ({
          type: 'command',
          command: h.command,
          ...(h.timeout && { timeout: h.timeout }),
        }))
    }));
  }

  return result;
}

function guessHookDescription(command: string): string | undefined {
  const lowerCmd = command.toLowerCase();

  if (lowerCmd.includes('eslint') || lowerCmd.includes('prettier') || lowerCmd.includes('format')) {
    return 'Auto-format/lint code';
  }
  if (lowerCmd.includes('git add') || lowerCmd.includes('git commit')) {
    return 'Auto-commit changes';
  }
  if (lowerCmd.includes('slack') || lowerCmd.includes('discord') || lowerCmd.includes('webhook')) {
    return 'Send notification';
  }
  if (lowerCmd.includes('security') || lowerCmd.includes('semgrep') || lowerCmd.includes('bandit')) {
    return 'Security scan';
  }
  if (lowerCmd.includes('backup') || lowerCmd.includes('.bak')) {
    return 'Create backup';
  }
  if (lowerCmd.includes('log') || lowerCmd.includes('echo')) {
    return 'Logging';
  }

  return undefined;
}

function guessHookCategory(command: string): string | undefined {
  const lowerCmd = command.toLowerCase();

  if (lowerCmd.includes('git')) return 'git';
  if (lowerCmd.includes('eslint') || lowerCmd.includes('prettier') || lowerCmd.includes('format') || lowerCmd.includes('lint')) return 'formatting';
  if (lowerCmd.includes('security') || lowerCmd.includes('semgrep') || lowerCmd.includes('bandit') || lowerCmd.includes('gitleaks')) return 'security';
  if (lowerCmd.includes('slack') || lowerCmd.includes('discord') || lowerCmd.includes('webhook') || lowerCmd.includes('notify')) return 'notifications';
  if (lowerCmd.includes('log') || lowerCmd.includes('echo')) return 'logging';
  if (lowerCmd.includes('test') || lowerCmd.includes('validate')) return 'validation';

  return 'other';
}

// Import hooks from parsed data
export async function importHooks(hooks: GlobalHookCreate[], replace: boolean = false): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  if (replace) {
    await prisma.globalHook.deleteMany({});
  }

  for (const hook of hooks) {
    try {
      // Check for duplicate
      const existing = await prisma.globalHook.findFirst({
        where: {
          hookType: hook.hookType,
          matcher: hook.matcher,
          command: hook.command,
        }
      });

      if (existing && !replace) {
        skipped++;
        continue;
      }

      await prisma.globalHook.create({
        data: {
          hookType: hook.hookType,
          matcher: hook.matcher,
          command: hook.command,
          timeout: hook.timeout,
          description: hook.description,
          category: hook.category,
          enabled: hook.enabled ?? true,
          order: imported,
        }
      });
      imported++;
    } catch (error) {
      errors.push(`Failed to import hook: ${hook.hookType}/${hook.matcher} - ${error}`);
    }
  }

  return { imported, skipped, errors };
}

/**
 * Get all global hooks with optional filtering
 */
export async function getAllGlobalHooks(
  prismaClient: typeof prisma,
  filters?: { enabled?: boolean; hookType?: string }
): Promise<any[]> {
  const where: any = {};

  if (filters?.enabled !== undefined) {
    where.enabled = filters.enabled;
  }
  if (filters?.hookType) {
    where.hookType = filters.hookType;
  }

  const hooks = await prismaClient.globalHook.findMany({
    where,
    orderBy: [
      { hookType: 'asc' },
      { order: 'asc' },
    ],
  });

  return hooks;
}
