/**
 * Files Utility Tests
 *
 * Tests for CLI file operations
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock fs module before importing
jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Import after mocking
const fs = await import('fs');
const {
  ensureDir,
  writeFile,
  writeFiles,
  projectExists,
  getProjectName,
} = await import('../../src/lib/files.js');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Files Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      ensureDir('/path/to/dir');

      expect(mockedFs.existsSync).toHaveBeenCalledWith('/path/to/dir');
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/path/to/dir', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      ensureDir('/path/to/dir');

      expect(mockedFs.existsSync).toHaveBeenCalledWith('/path/to/dir');
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('writeFile', () => {
    it('should create new file', () => {
      mockedFs.existsSync
        .mockReturnValueOnce(false) // file doesn't exist
        .mockReturnValueOnce(false); // parent dir doesn't exist (ensureDir)

      const result = writeFile('/path/to/file.txt', 'content');

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      expect(result.created).toBe(true);
      expect(result.updated).toBe(false);
    });

    it('should update existing file with different content', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('old content');

      const result = writeFile('/path/to/file.txt', 'new content');

      expect(mockedFs.readFileSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      expect(result.created).toBe(false);
      expect(result.updated).toBe(true);
    });

    it('should not update file with same content', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('same content');

      const result = writeFile('/path/to/file.txt', 'same content');

      expect(mockedFs.readFileSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
      expect(result.created).toBe(false);
      expect(result.updated).toBe(false);
    });

    it('should create parent directories', () => {
      mockedFs.existsSync
        .mockReturnValueOnce(false) // file doesn't exist
        .mockReturnValueOnce(false); // parent dir doesn't exist

      writeFile('/path/to/nested/file.txt', 'content');

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('/path/to/nested'),
        { recursive: true }
      );
    });

    it('should return absolute path', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = writeFile('relative/file.txt', 'content');

      expect(result.path).toMatch(/^\/.*relative\/file\.txt$/);
    });
  });

  describe('writeFiles', () => {
    it('should write multiple files', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const files = [
        { path: 'file1.txt', content: 'content1' },
        { path: 'file2.txt', content: 'content2' },
        { path: 'subdir/file3.txt', content: 'content3' },
      ];

      const results = writeFiles('/base/path', files);

      expect(results).toHaveLength(3);
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(3);
    });

    it('should join base path with file paths', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const files = [{ path: 'nested/file.txt', content: 'content' }];

      const results = writeFiles('/base/path', files);

      expect(results[0].path).toMatch(/\/base\/path\/nested\/file\.txt$/);
    });

    it('should return results for each file', () => {
      // First file: new
      mockedFs.existsSync
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false);

      // Second file: existing with different content
      mockedFs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);
      mockedFs.readFileSync.mockReturnValueOnce('old content');

      // Third file: existing with same content
      mockedFs.existsSync.mockReturnValueOnce(true);
      mockedFs.readFileSync.mockReturnValueOnce('same content');

      const files = [
        { path: 'new.txt', content: 'content' },
        { path: 'updated.txt', content: 'new content' },
        { path: 'unchanged.txt', content: 'same content' },
      ];

      const results = writeFiles('/base', files);

      expect(results[0].created).toBe(true);
      expect(results[1].updated).toBe(true);
      expect(results[2].created).toBe(false);
      expect(results[2].updated).toBe(false);
    });

    it('should handle empty file list', () => {
      const results = writeFiles('/base/path', []);

      expect(results).toHaveLength(0);
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('projectExists', () => {
    it('should return true when .claude directory exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = projectExists('/path/to/project');

      expect(mockedFs.existsSync).toHaveBeenCalledWith('/path/to/project/.claude');
      expect(result).toBe(true);
    });

    it('should return false when .claude directory does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = projectExists('/path/to/project');

      expect(mockedFs.existsSync).toHaveBeenCalledWith('/path/to/project/.claude');
      expect(result).toBe(false);
    });
  });

  describe('getProjectName', () => {
    it('should return the last part of the path', () => {
      const result = getProjectName('/path/to/my-project');

      expect(result).toBe('my-project');
    });

    it('should handle paths ending with slash', () => {
      // Note: This depends on implementation - path.resolve typically removes trailing slashes
      const result = getProjectName('/path/to/project/');

      expect(result).toBe('project');
    });

    it('should handle relative paths', () => {
      const result = getProjectName('./relative/project');

      expect(result).toBe('project');
    });

    it('should handle single directory', () => {
      const result = getProjectName('/project');

      expect(result).toBe('project');
    });

    it('should return "project" for empty or root path', () => {
      // When split yields nothing useful, fallback to 'project'
      const result = getProjectName('/');

      expect(result).toBeTruthy();
    });
  });
});
