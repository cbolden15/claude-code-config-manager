/**
 * Config Module Tests
 *
 * Tests for CLI configuration loading and saving
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock fs module before importing
jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock os module
jest.unstable_mockModule('os', () => ({
  homedir: jest.fn(() => '/home/testuser'),
}));

// Import after mocking
const fs = await import('fs');
const { homedir } = await import('os');
const {
  ensureConfigDir,
  loadConfig,
  saveConfig,
  getConfigPath,
  getMachineName,
} = await import('../../src/lib/config.js');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedHomedir = homedir as jest.MockedFunction<typeof homedir>;

describe('Config Module', () => {
  const expectedConfigDir = '/home/testuser/.ccm';
  const expectedConfigFile = '/home/testuser/.ccm/config.json';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.HOSTNAME;
    delete process.env.COMPUTERNAME;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.HOSTNAME;
    delete process.env.COMPUTERNAME;
  });

  describe('getConfigPath', () => {
    it('should return the config file path', () => {
      const path = getConfigPath();

      expect(path).toBe(expectedConfigFile);
    });
  });

  describe('ensureConfigDir', () => {
    it('should create config directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      ensureConfigDir();

      expect(mockedFs.existsSync).toHaveBeenCalledWith(expectedConfigDir);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expectedConfigDir, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      ensureConfigDir();

      expect(mockedFs.existsSync).toHaveBeenCalledWith(expectedConfigDir);
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('loadConfig', () => {
    it('should return default config when config file does not exist', () => {
      // First call for ensureConfigDir, second for loadConfig
      mockedFs.existsSync
        .mockReturnValueOnce(true) // config dir exists
        .mockReturnValueOnce(false); // config file does not exist

      const config = loadConfig();

      expect(config).toEqual({
        serverUrl: 'http://localhost:3000',
        machine: '',
      });
    });

    it('should load and parse existing config file', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          serverUrl: 'http://custom-server:8080',
          machine: 'my-laptop',
        })
      );

      const config = loadConfig();

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(expectedConfigFile, 'utf-8');
      expect(config).toEqual({
        serverUrl: 'http://custom-server:8080',
        machine: 'my-laptop',
      });
    });

    it('should merge partial config with defaults', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          machine: 'work-machine',
        })
      );

      const config = loadConfig();

      expect(config).toEqual({
        serverUrl: 'http://localhost:3000', // default
        machine: 'work-machine', // from file
      });
    });

    it('should return default config on parse error', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid json {{{');

      const config = loadConfig();

      expect(config).toEqual({
        serverUrl: 'http://localhost:3000',
        machine: '',
      });
    });

    it('should return default config on read error', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const config = loadConfig();

      expect(config).toEqual({
        serverUrl: 'http://localhost:3000',
        machine: '',
      });
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      mockedFs.existsSync.mockReturnValue(true);

      const config = {
        serverUrl: 'http://my-server:3000',
        machine: 'my-workstation',
      };

      saveConfig(config);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expectedConfigFile,
        JSON.stringify(config, null, 2)
      );
    });

    it('should create config directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = {
        serverUrl: 'http://localhost:3000',
        machine: 'new-machine',
      };

      saveConfig(config);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expectedConfigDir, { recursive: true });
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('getMachineName', () => {
    it('should return machine name from config if set', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          serverUrl: 'http://localhost:3000',
          machine: 'configured-machine',
        })
      );

      const name = getMachineName();

      expect(name).toBe('configured-machine');
    });

    it('should return HOSTNAME environment variable as fallback', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          serverUrl: 'http://localhost:3000',
          machine: '',
        })
      );
      process.env.HOSTNAME = 'server-hostname';

      const name = getMachineName();

      expect(name).toBe('server-hostname');
    });

    it('should return COMPUTERNAME environment variable as fallback', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          serverUrl: 'http://localhost:3000',
          machine: '',
        })
      );
      process.env.COMPUTERNAME = 'WINDOWS-PC';

      const name = getMachineName();

      expect(name).toBe('WINDOWS-PC');
    });

    it('should prefer HOSTNAME over COMPUTERNAME', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          serverUrl: 'http://localhost:3000',
          machine: '',
        })
      );
      process.env.HOSTNAME = 'unix-host';
      process.env.COMPUTERNAME = 'WINDOWS-PC';

      const name = getMachineName();

      expect(name).toBe('unix-host');
    });

    it('should return "local" as final fallback', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          serverUrl: 'http://localhost:3000',
          machine: '',
        })
      );
      // No HOSTNAME or COMPUTERNAME set

      const name = getMachineName();

      expect(name).toBe('local');
    });

    it('should return "local" when config file does not exist and no env vars', () => {
      mockedFs.existsSync
        .mockReturnValueOnce(true) // config dir exists
        .mockReturnValueOnce(false); // config file does not exist

      const name = getMachineName();

      expect(name).toBe('local');
    });
  });
});
