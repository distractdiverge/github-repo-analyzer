import { saveReport } from '../src/index.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Mock the file system module
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined)
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
      
      await saveReport(content, filename);
      
      // Verify writeFile was called with the correct arguments
      expect(writeFile).toHaveBeenCalledTimes(1);
      
      const expectedPath = join(process.cwd(), 'test-report-2023-01-01T00-00-00-000Z.csv');
      expect(writeFile).toHaveBeenCalledWith(
        expectedPath,
        content,
        'utf-8'
      );
    });

    it('should handle errors when saving the file', async () => {
      const error = new Error('Failed to write file');
      (writeFile as jest.Mock).mockRejectedValueOnce(error);
      
      const consoleSpy = jest.spyOn(console, 'log');
      
      await saveReport('content', 'test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-2023-01-01T00-00-00-000Z.csv')
      );
    });
  });
});
