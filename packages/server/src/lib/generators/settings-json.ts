interface HookConfig {
  hookType: string;
  matcher?: string;
  command: string;
  description?: string;
}

interface Hook {
  name: string;
  config: HookConfig;
}

interface SettingsJsonOptions {
  hooks?: Hook[];
}

export function generateSettingsJson(options: SettingsJsonOptions): string | null {
  const { hooks } = options;

  if (!hooks || hooks.length === 0) {
    return null; // No settings needed
  }

  const settings: Record<string, unknown> = {};

  // Group hooks by type
  const hooksByType: Record<string, Array<{ matcher?: string; command: string; description?: string }>> = {};

  for (const hook of hooks) {
    const { hookType, matcher, command, description } = hook.config;

    if (!hooksByType[hookType]) {
      hooksByType[hookType] = [];
    }

    hooksByType[hookType].push({
      ...(matcher && { matcher }),
      command,
      ...(description && { description }),
    });
  }

  if (Object.keys(hooksByType).length > 0) {
    settings.hooks = hooksByType;
  }

  return JSON.stringify(settings, null, 2);
}
