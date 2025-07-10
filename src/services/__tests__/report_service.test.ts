import { ReportService } from '../report_service.js';
import { DeletionCandidate, GitRepository } from '../index.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn()
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn()
}));

describe('ReportService', () => {
  let reportService: ReportService;
  let mockWriteFile: jest.MockedFunction<typeof writeFile>;
  let mockJoin: jest.MockedFunction<typeof join>;

  beforeEach(() => {
    mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
    mockJoin = join as jest.MockedFunction<typeof join>;
    
    reportService = new ReportService();
    
    // Mock Date.now() to have predictable timestamps
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-01-01T12:00:00.000Z');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('generateDeletionReport', () => {
    const mockRepos: GitRepository[] = [
      {
        name: 'repo1',
        description: 'Test repo 1',
        html_url: 'https://github.com/testuser/repo1',
        updated_at: '2023-01-01T00:00:00Z',
        created_at: '2022-01-01T00:00:00Z',
        default_branch: 'main'
      },
      {
        name: 'repo2',
        description: 'Test repo 2',
        html_url: 'https://github.com/testuser/repo2',
        updated_at: '2023-02-01T00:00:00Z',
        created_at: '2022-02-01T00:00:00Z',
        default_branch: 'master'
      }
    ];

    const mockCandidates: DeletionCandidate[] = [
      {
        repo: mockRepos[0],
        reason: 'No longer maintained'
      },
      {
        repo: mockRepos[1],
        reason: 'Duplicate functionality'
      }
    ];

    it('should generate and save CSV report with deletion candidates', async () => {
      const expectedCsvContent = `Repository Name,URL,Reason,Last Updated,Created At
"repo1","https://github.com/testuser/repo1","No longer maintained","2023-01-01T00:00:00Z","2022-01-01T00:00:00Z"
"repo2","https://github.com/testuser/repo2","Duplicate functionality","2023-02-01T00:00:00Z","2022-02-01T00:00:00Z"`;

      const expectedPath = '/mocked/path/deletion-report-2023-01-01T12-00-00-000Z.csv';
      
      mockJoin.mockReturnValue(expectedPath);
      mockWriteFile.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reportService.generateDeletionReport(mockCandidates, 'deletion-report');

      expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'deletion-report-2023-01-01T12-00-00-000Z.csv');
      expect(mockWriteFile).toHaveBeenCalledWith(expectedPath, expectedCsvContent, 'utf-8');
      expect(consoleSpy).toHaveBeenCalledWith(`Report saved to: ${expectedPath}`);

      consoleSpy.mockRestore();
    });

    it('should handle empty candidates list', async () => {
      const expectedCsvContent = 'No repositories recommended for deletion.';
      const expectedPath = '/mocked/path/empty-report-2023-01-01T12-00-00-000Z.csv';
      
      mockJoin.mockReturnValue(expectedPath);
      mockWriteFile.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reportService.generateDeletionReport([], 'empty-report');

      expect(mockWriteFile).toHaveBeenCalledWith(expectedPath, expectedCsvContent, 'utf-8');
      expect(consoleSpy).toHaveBeenCalledWith(`Report saved to: ${expectedPath}`);

      consoleSpy.mockRestore();
    });

    it('should handle repositories with null descriptions', async () => {
      const repoWithNullDescription = { ...mockRepos[0], description: null };
      const candidatesWithNullDescription: DeletionCandidate[] = [
        {
          repo: repoWithNullDescription,
          reason: 'No description'
        }
      ];

      const expectedCsvContent = `Repository Name,URL,Reason,Last Updated,Created At
"repo1","https://github.com/testuser/repo1","No description","2023-01-01T00:00:00Z","2022-01-01T00:00:00Z"`;

      const expectedPath = '/mocked/path/null-desc-report-2023-01-01T12-00-00-000Z.csv';
      
      mockJoin.mockReturnValue(expectedPath);
      mockWriteFile.mockResolvedValue(undefined);

      await reportService.generateDeletionReport(candidatesWithNullDescription, 'null-desc-report');

      expect(mockWriteFile).toHaveBeenCalledWith(expectedPath, expectedCsvContent, 'utf-8');
    });

    it('should handle repositories with null timestamps', async () => {
      const repoWithNullTimestamps = { 
        ...mockRepos[0], 
        updated_at: null, 
        created_at: null 
      };
      const candidatesWithNullTimestamps: DeletionCandidate[] = [
        {
          repo: repoWithNullTimestamps,
          reason: 'No timestamps'
        }
      ];

      const expectedCsvContent = `Repository Name,URL,Reason,Last Updated,Created At
"repo1","https://github.com/testuser/repo1","No timestamps","null","null"`;

      const expectedPath = '/mocked/path/null-timestamps-report-2023-01-01T12-00-00-000Z.csv';
      
      mockJoin.mockReturnValue(expectedPath);
      mockWriteFile.mockResolvedValue(undefined);

      await reportService.generateDeletionReport(candidatesWithNullTimestamps, 'null-timestamps-report');

      expect(mockWriteFile).toHaveBeenCalledWith(expectedPath, expectedCsvContent, 'utf-8');
    });

    it('should handle special characters in repository data', async () => {
      const repoWithSpecialChars: GitRepository = {
        name: 'repo "with" quotes',
        description: 'Description with, comma and "quotes"',
        html_url: 'https://github.com/testuser/repo-with-quotes',
        updated_at: '2023-01-01T00:00:00Z',
        created_at: '2022-01-01T00:00:00Z',
        default_branch: 'main'
      };

      const candidatesWithSpecialChars: DeletionCandidate[] = [
        {
          repo: repoWithSpecialChars,
          reason: 'Contains "special" characters, and commas'
        }
      ];

      const expectedCsvContent = `Repository Name,URL,Reason,Last Updated,Created At
"repo "with" quotes","https://github.com/testuser/repo-with-quotes","Contains "special" characters, and commas","2023-01-01T00:00:00Z","2022-01-01T00:00:00Z"`;

      const expectedPath = '/mocked/path/special-chars-report-2023-01-01T12-00-00-000Z.csv';
      
      mockJoin.mockReturnValue(expectedPath);
      mockWriteFile.mockResolvedValue(undefined);

      await reportService.generateDeletionReport(candidatesWithSpecialChars, 'special-chars-report');

      expect(mockWriteFile).toHaveBeenCalledWith(expectedPath, expectedCsvContent, 'utf-8');
    });

    it('should handle file write errors', async () => {
      const mockError = new Error('File write failed');
      mockJoin.mockReturnValue('/mocked/path/error-report-2023-01-01T12-00-00-000Z.csv');
      mockWriteFile.mockRejectedValue(mockError);

      await expect(reportService.generateDeletionReport(mockCandidates, 'error-report')).rejects.toThrow('File write failed');
    });

    it('should generate unique filenames with timestamps', async () => {
      // Mock two different timestamps
      const mockToISOString = jest.spyOn(Date.prototype, 'toISOString');
      mockToISOString
        .mockReturnValueOnce('2023-01-01T12:00:00.000Z')
        .mockReturnValueOnce('2023-01-01T12:05:00.000Z');

      const expectedPath1 = '/mocked/path/report-2023-01-01T12-00-00-000Z.csv';
      const expectedPath2 = '/mocked/path/report-2023-01-01T12-05-00-000Z.csv';
      
      mockJoin
        .mockReturnValueOnce(expectedPath1)
        .mockReturnValueOnce(expectedPath2);
      mockWriteFile.mockResolvedValue(undefined);

      await reportService.generateDeletionReport(mockCandidates, 'report');
      await reportService.generateDeletionReport(mockCandidates, 'report');

      expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'report-2023-01-01T12-00-00-000Z.csv');
      expect(mockJoin).toHaveBeenCalledWith(process.cwd(), 'report-2023-01-01T12-05-00-000Z.csv');
    });
  });
});
