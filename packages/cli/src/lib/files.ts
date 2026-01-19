import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

export interface WriteResult {
  path: string;
  created: boolean;
  updated: boolean;
}

export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function writeFile(filePath: string, content: string): WriteResult {
  const absolutePath = resolve(filePath);
  const existed = existsSync(absolutePath);

  // Check if content is the same (no update needed)
  if (existed) {
    const existingContent = readFileSync(absolutePath, 'utf-8');
    if (existingContent === content) {
      return { path: absolutePath, created: false, updated: false };
    }
  }

  ensureDir(dirname(absolutePath));
  writeFileSync(absolutePath, content);

  return {
    path: absolutePath,
    created: !existed,
    updated: existed,
  };
}

export function writeFiles(
  basePath: string,
  files: Array<{ path: string; content: string }>
): WriteResult[] {
  const results: WriteResult[] = [];

  for (const file of files) {
    const fullPath = join(basePath, file.path);
    const result = writeFile(fullPath, file.content);
    results.push(result);
  }

  return results;
}

export function projectExists(projectPath: string): boolean {
  const claudeDir = join(projectPath, '.claude');
  return existsSync(claudeDir);
}

export function getProjectName(projectPath: string): string {
  const resolved = resolve(projectPath);
  return resolved.split('/').pop() || 'project';
}
