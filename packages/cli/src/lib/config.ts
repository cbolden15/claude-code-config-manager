import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface CliConfig {
  serverUrl: string;
  machine: string;
}

const CONFIG_DIR = join(homedir(), '.ccm');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: CliConfig = {
  serverUrl: 'http://localhost:3000',
  machine: '',
};

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): CliConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content) as Partial<CliConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...config,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: CliConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getMachineName(): string {
  const config = loadConfig();
  if (config.machine) {
    return config.machine;
  }

  // Try to get hostname as fallback
  const hostname = process.env.HOSTNAME || process.env.COMPUTERNAME;
  if (hostname) {
    return hostname;
  }

  // Use a generic name
  return 'local';
}
