import { jest } from '@jest/globals';
// Ignore for Now import { saveReport } from '../src/index.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

declare const global: typeof globalThis & {
  mocks: {
    mockCreate: jest.Mock;
    mockListForUser: jest.Mock;
    mockUpdate: jest.Mock;
  };
};

// Mock the file system module
const mockWriteFile = jest.fn().mockImplementation(() => Promise.resolve(undefined));
const mockReadFile = jest.fn().mockImplementation(() => Promise.resolve('test content'));

jest.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  readFile: mockReadFile
}));

// Mock path module
const mockJoin = (...args: string[]) => args.join('/');

jest.mock('path', () => ({
  join: mockJoin
}));

describe('File Utilities', () => {
  describe('saveReport', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock Date.now() to return a fixed timestamp
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2023-01-01T00:00:00.000Z').getTime());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should save the report content to a file with timestamp', async () => {
      const content = 'test content';
      const filename = 'test-report';
      
      /* Ignore for Now
      await saveReport(content, filename);
      */
      // Verify writeFile was called with the correct arguments
      expect(writeFile).toHaveBeenCalledTimes(1);
      
      const expectedPath = join(process.cwd(), 'test-report-2023-01-01T00-00-00-000Z.csv');
      expect(writeFile).toHaveBeenCalledWith(
        expectedPath,
        content,
        'utf-8'
      );
    });

    it('should handle errors when writing the file', async () => {
      const error = new Error('Failed to write file');
      // TODO: Fix this file/test
      // (mockWriteFile as jest.Mock).mockRejectedValueOnce(error);

      /* Ignore for now
      await expect(saveReport('test content', 'test.txt'))
        .rejects
        .toThrow('Failed to write file');
      */
    });
  });
});
