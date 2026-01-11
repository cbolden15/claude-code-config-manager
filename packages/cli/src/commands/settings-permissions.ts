/**
 * Permissions CLI Commands
 *
 * ccm settings permissions list
 * ccm settings permissions add <permission> <action>
 * ccm settings permissions delete <id>
 * ccm settings permissions import <file>
 * ccm settings permissions export [file]
 */

import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
import { permissionsApi } from '../lib/api-permissions.js';
import type {
  GlobalPermission,
  PermissionAction,
  PermissionCategory,
} from '@ccm/shared';

const CATEGORY_COLORS: Record<string, (text: string) => string> = {
  git: chalk.blue,
  network: chalk.cyan,
  shell: chalk.yellow,
  file: chalk.green,
  docker: chalk.magenta,
  cloud: chalk.blueBright,
  database: chalk.red,
  other: chalk.gray,
};

/**
 * List all permissions
 */
export async function listPermissions(options: {
  action?: string;
  category?: string;
  verbose?: boolean;
}): Promise<void> {
  const result = await permissionsApi.list();

  if (result.error) {
    console.log(chalk.red(`Error: ${result.error}`));
    return;
  }

  const data = result.data!;

  // Apply filters
  let permissions = data.permissions;

  if (options.action) {
    permissions = permissions.filter((p) => p.action === options.action);
  }

  if (options.category) {
    permissions = permissions.filter((p) => p.category === options.category);
  }

  if (permissions.length === 0) {
    console.log(chalk.gray('No permissions found.'));
    return;
  }

  // Display statistics
  console.log(chalk.bold(`Permissions (${permissions.length} total)`));
  console.log();

  console.log(chalk.gray('Statistics:'));
  console.log(
    `  Total: ${data.stats.total} | Enabled: ${data.stats.enabled}`
  );
  console.log(
    `  Allow: ${chalk.green(String(data.stats.byAction.allow))} | Deny: ${chalk.red(String(data.stats.byAction.deny))}`
  );
  console.log();

  // Group by action if not filtered
  if (!options.action) {
    console.log(chalk.bold.green('Allow Permissions:'));
    displayPermissions(data.grouped.allow, options.verbose);
    console.log();

    console.log(chalk.bold.red('Deny Permissions:'));
    displayPermissions(data.grouped.deny, options.verbose);
  } else {
    displayPermissions(permissions, options.verbose);
  }
}

/**
 * Display permissions list
 */
function displayPermissions(
  permissions: GlobalPermission[],
  verbose = false
): void {
  if (permissions.length === 0) {
    console.log(chalk.gray('  None'));
    return;
  }

  for (const perm of permissions) {
    const statusIcon = perm.enabled ? chalk.green('✓') : chalk.gray('○');
    const category = perm.category || 'other';
    const categoryColor = CATEGORY_COLORS[category] || chalk.gray;
    const categoryBadge = categoryColor(`[${category}]`);

    console.log(
      `  ${statusIcon} ${categoryBadge} ${chalk.white(perm.permission)}`
    );

    if (verbose) {
      if (perm.description) {
        console.log(`     ${chalk.gray(perm.description)}`);
      }
      console.log(
        `     ${chalk.dim(`ID: ${perm.id} | Priority: ${perm.priority}`)}`
      );
    }
  }
}

/**
 * Add a new permission
 */
export async function addPermission(
  permission: string,
  action: string,
  options: {
    description?: string;
    category?: string;
    priority?: string;
    disabled?: boolean;
  }
): Promise<void> {
  // Validate action
  if (action !== 'allow' && action !== 'deny') {
    console.log(
      chalk.red(`Invalid action "${action}". Must be "allow" or "deny".`)
    );
    return;
  }

  const result = await permissionsApi.create({
    permission,
    action: action as PermissionAction,
    description: options.description,
    category: options.category as PermissionCategory | undefined,
    priority: options.priority ? parseInt(options.priority, 10) : undefined,
    enabled: !options.disabled,
  });

  if (result.error) {
    console.log(chalk.red(`Error: ${result.error}`));
    return;
  }

  const perm = result.data!;
  console.log(chalk.green('✓ Permission created successfully'));
  console.log();
  console.log(`  ID: ${perm.id}`);
  console.log(`  Permission: ${perm.permission}`);
  console.log(`  Action: ${perm.action}`);
  console.log(`  Category: ${perm.category || 'auto-detected'}`);
  console.log(`  Enabled: ${perm.enabled}`);
}

/**
 * Delete a permission
 */
export async function deletePermission(id: string): Promise<void> {
  const result = await permissionsApi.delete(id);

  if (result.error) {
    console.log(chalk.red(`Error: ${result.error}`));
    return;
  }

  console.log(chalk.green('✓ Permission deleted successfully'));
}

/**
 * Import permissions from a file
 */
export async function importPermissions(filePath: string): Promise<void> {
  try {
    // Read and parse file
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Extract permissions object
    let permissions = data;

    // Handle settings.local.json format (has permissions key)
    if (data.permissions) {
      permissions = data.permissions;
    }

    // Validate format
    if (!permissions.allow && !permissions.deny) {
      console.log(
        chalk.red('Error: File must contain "allow" and/or "deny" arrays')
      );
      return;
    }

    console.log(chalk.blue('Importing permissions...'));
    console.log();

    const result = await permissionsApi.import(permissions);

    if (result.error) {
      console.log(chalk.red(`Error: ${result.error}`));
      return;
    }

    const importResult = result.data!;

    console.log(chalk.green('✓ Import completed'));
    console.log();
    console.log(`  Imported: ${chalk.green(String(importResult.imported))}`);
    console.log(
      `  Skipped (duplicates): ${chalk.yellow(String(importResult.skipped))}`
    );

    if (importResult.errors.length > 0) {
      console.log(`  Errors: ${chalk.red(String(importResult.errors.length))}`);
      console.log();
      console.log(chalk.red('Errors:'));
      for (const error of importResult.errors) {
        console.log(`  ${chalk.red('✗')} ${error}`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`Error reading file: ${error.message}`));
    } else {
      console.log(chalk.red('Unknown error occurred'));
    }
  }
}

/**
 * Export permissions to a file
 */
export async function exportPermissions(
  filePath?: string,
  options: {
    enabled?: boolean;
    category?: string;
  } = {}
): Promise<void> {
  const result = await permissionsApi.export({
    enabled: options.enabled,
    category: options.category,
  });

  if (result.error) {
    console.log(chalk.red(`Error: ${result.error}`));
    return;
  }

  const permissions = result.data!;

  const output = JSON.stringify(
    {
      permissions,
    },
    null,
    2
  );

  if (filePath) {
    try {
      writeFileSync(filePath, output, 'utf-8');
      console.log(chalk.green(`✓ Permissions exported to ${filePath}`));
    } catch (error) {
      if (error instanceof Error) {
        console.log(chalk.red(`Error writing file: ${error.message}`));
      }
    }
  } else {
    // Output to stdout
    console.log(output);
  }

  // Show summary
  const totalCount =
    (permissions.allow?.length || 0) + (permissions.deny?.length || 0);
  console.log();
  console.log(
    chalk.gray(
      `Exported ${totalCount} permissions (${permissions.allow?.length || 0} allow, ${permissions.deny?.length || 0} deny)`
    )
  );
}
