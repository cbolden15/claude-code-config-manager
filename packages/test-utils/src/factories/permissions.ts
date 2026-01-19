/**
 * Permissions Factory
 *
 * Factory functions for creating test permission data
 */

import type { GlobalPermission, PermissionAction, PermissionCategory } from '@ccm/shared';

let permissionCounter = 0;

/**
 * Creates a global permission with default or custom properties
 */
export function createPermission(overrides?: Partial<GlobalPermission>): GlobalPermission {
  permissionCounter++;

  const now = new Date();

  return {
    id: overrides?.id ?? `permission_${permissionCounter}`,
    permission: overrides?.permission ?? `Bash(test:*${permissionCounter})`,
    action: overrides?.action ?? 'allow',
    description: overrides?.description ?? null,
    enabled: overrides?.enabled ?? true,
    category: overrides?.category ?? null,
    priority: overrides?.priority ?? 0,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    ...overrides,
  };
}

/**
 * Creates multiple permissions
 */
export function createPermissions(count: number, overrides?: Partial<GlobalPermission>): GlobalPermission[] {
  return Array.from({ length: count }, () => createPermission(overrides));
}

/**
 * Creates a bash allow permission
 */
export function createBashAllowPermission(): GlobalPermission {
  return createPermission({
    permission: 'Bash(git:*)',
    action: 'allow',
    description: 'Allow all git commands',
    category: 'git',
    priority: 10,
  });
}

/**
 * Creates a bash deny permission
 */
export function createBashDenyPermission(): GlobalPermission {
  return createPermission({
    permission: 'Bash(rm:-rf)',
    action: 'deny',
    description: 'Deny dangerous rm commands',
    category: 'shell',
    priority: 100,
  });
}

/**
 * Creates a web fetch permission
 */
export function createWebFetchPermission(): GlobalPermission {
  return createPermission({
    permission: 'WebFetch(domain:github.com)',
    action: 'allow',
    description: 'Allow fetching from GitHub',
    category: 'network',
    priority: 5,
  });
}

/**
 * Creates a file operation permission
 */
export function createFilePermission(): GlobalPermission {
  return createPermission({
    permission: 'Write(path:/tmp/*)',
    action: 'allow',
    description: 'Allow writing to tmp directory',
    category: 'file',
    priority: 5,
  });
}

/**
 * Creates a docker permission
 */
export function createDockerPermission(): GlobalPermission {
  return createPermission({
    permission: 'Bash(docker:*)',
    action: 'allow',
    description: 'Allow docker commands',
    category: 'docker',
    priority: 8,
  });
}

/**
 * Creates permissions for all actions
 */
export function createPermissionsByAction(): Record<PermissionAction, GlobalPermission> {
  return {
    allow: createBashAllowPermission(),
    deny: createBashDenyPermission(),
  };
}

/**
 * Creates permissions grouped by category
 */
export function createPermissionsByCategory(): Record<PermissionCategory, GlobalPermission[]> {
  return {
    git: [
      createBashAllowPermission(),
      createPermission({
        permission: 'Bash(git:push)',
        action: 'deny',
        category: 'git',
        description: 'Require approval for git push',
      }),
    ],
    network: [
      createWebFetchPermission(),
      createPermission({
        permission: 'WebFetch(domain:*)',
        action: 'deny',
        category: 'network',
        description: 'Block all other domains',
        priority: 1,
      }),
    ],
    shell: [
      createBashDenyPermission(),
      createPermission({
        permission: 'Bash(sudo:*)',
        action: 'deny',
        category: 'shell',
        description: 'Deny sudo commands',
        priority: 100,
      }),
    ],
    file: [
      createFilePermission(),
      createPermission({
        permission: 'Write(path:/etc/*)',
        action: 'deny',
        category: 'file',
        description: 'Deny writing to system files',
        priority: 100,
      }),
    ],
    docker: [
      createDockerPermission(),
    ],
    cloud: [
      createPermission({
        permission: 'Bash(aws:*)',
        action: 'allow',
        category: 'cloud',
        description: 'Allow AWS CLI commands',
      }),
    ],
  };
}

/**
 * Creates a disabled permission
 */
export function createDisabledPermission(): GlobalPermission {
  return createPermission({
    enabled: false,
    description: 'Disabled test permission',
  });
}

/**
 * Creates a high priority permission
 */
export function createHighPriorityPermission(): GlobalPermission {
  return createPermission({
    permission: 'Bash(critical:*)',
    action: 'deny',
    priority: 1000,
    description: 'Critical security rule',
    category: 'shell',
  });
}

/**
 * Creates a permission set for testing priority ordering
 */
export function createPriorityPermissions(): GlobalPermission[] {
  return [
    createPermission({ priority: 100, description: 'High priority' }),
    createPermission({ priority: 50, description: 'Medium priority' }),
    createPermission({ priority: 10, description: 'Low priority' }),
    createPermission({ priority: 1, description: 'Lowest priority' }),
  ];
}

/**
 * Reset counter (useful for test isolation)
 */
export function resetPermissionCounters(): void {
  permissionCounter = 0;
}
