/**
 * Path Utilities
 *
 * Helper functions for resolving paths to Claude Desktop and Claude Code configurations
 */

import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * Platform type
 */
export type Platform = 'darwin' | 'linux' | 'win32';

/**
 * Claude Desktop configuration paths by platform
 */
const CLAUDE_DESKTOP_CONFIG_PATHS: Record<Platform, string> = {
  darwin: path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'Claude',
    'claude_desktop_config.json'
  ),
  linux: path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json'),
  win32: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
};

/**
 * Claude Code base directory
 */
const CLAUDE_CODE_DIR = path.join(os.homedir(), '.claude');

/**
 * Get the path to claude_desktop_config.json for the current platform
 *
 * @param platform - Optional platform override (defaults to current platform)
 * @returns Path to claude_desktop_config.json
 * @throws Error if platform is not supported
 */
export function getClaudeDesktopConfigPath(platform?: Platform): string {
  const currentPlatform = (platform || os.platform()) as Platform;

  if (!CLAUDE_DESKTOP_CONFIG_PATHS[currentPlatform]) {
    throw new Error(`Unsupported platform: ${currentPlatform}`);
  }

  return CLAUDE_DESKTOP_CONFIG_PATHS[currentPlatform];
}

/**
 * Get the directory containing claude_desktop_config.json
 *
 * @param platform - Optional platform override
 * @returns Path to Claude Desktop config directory
 */
export function getClaudeDesktopConfigDir(platform?: Platform): string {
  return path.dirname(getClaudeDesktopConfigPath(platform));
}

/**
 * Claude Code paths
 */
export interface ClaudeCodePaths {
  /** Base .claude directory */
  baseDir: string;
  /** Settings file: ~/.claude/settings.local.json */
  settings: string;
  /** Agents directory: ~/.claude/agents/ */
  agentsDir: string;
  /** Skills directory: ~/.claude/skills/ */
  skillsDir: string;
  /** Commands directory: ~/.claude/commands/ */
  commandsDir: string;
}

/**
 * Get all Claude Code configuration paths
 *
 * @param homeDir - Optional home directory override (defaults to os.homedir())
 * @returns Object with all Claude Code paths
 */
export function getClaudeCodePaths(homeDir?: string): ClaudeCodePaths {
  const base = homeDir ? path.join(homeDir, '.claude') : CLAUDE_CODE_DIR;

  return {
    baseDir: base,
    settings: path.join(base, 'settings.local.json'),
    agentsDir: path.join(base, 'agents'),
    skillsDir: path.join(base, 'skills'),
    commandsDir: path.join(base, 'commands'),
  };
}

/**
 * Machine information
 */
export interface MachineInfo {
  /** Machine hostname */
  hostname: string;
  /** Operating system platform (darwin, linux, win32) */
  platform: Platform;
  /** CPU architecture (arm64, x64, etc.) */
  arch: string;
  /** User home directory */
  homeDir: string;
  /** Number of CPUs */
  cpus: number;
  /** Total memory in GB */
  totalMemory: number;
  /** Operating system type */
  osType: string;
  /** Operating system release version */
  osRelease: string;
}

/**
 * Get current machine information
 *
 * @returns Machine information object
 */
export function getMachineInfo(): MachineInfo {
  return {
    hostname: os.hostname(),
    platform: os.platform() as Platform,
    arch: os.arch(),
    homeDir: os.homedir(),
    cpus: os.cpus().length,
    totalMemory: parseFloat((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)), // Convert to GB
    osType: os.type(),
    osRelease: os.release(),
  };
}

/**
 * Check if a path exists
 *
 * @param filePath - Path to check
 * @returns True if path exists, false otherwise
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 *
 * @param dirPath - Directory path to ensure
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Get the parent directory of a path
 *
 * @param filePath - File path
 * @returns Parent directory path
 */
export function getParentDir(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Normalize a path (resolve relative paths, remove redundant separators)
 *
 * @param filePath - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Join path segments
 *
 * @param segments - Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Check if a path is absolute
 *
 * @param filePath - Path to check
 * @returns True if path is absolute, false otherwise
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Resolve a path to an absolute path
 *
 * @param filePath - Path to resolve
 * @returns Absolute path
 */
export function resolvePath(filePath: string): string {
  return path.resolve(filePath);
}
