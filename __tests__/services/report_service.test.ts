import { ReportService } from '../../src/services/report_service.js';
import { DeletionCandidate } from '../../src/services/git_repo_analysis.js';
import { writeFile } from 'fs/promises';

// Mock the fs/promises module
jest.mock('fs/promises');

const mockedWriteFile = writeFile as jest.Mock;

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    mockedWriteFile.mockClear();
    service = new ReportService();
  });

  it('should generate and save a CSV report for deletion candidates', async () => {
    const candidates: DeletionCandidate[] = [
      {
        repo: {
          name: 'repo1',
          description: 'desc1',
          html_url: 'url1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        reason: 'Old and unused',
      },
      {
        repo: {
          name: 'repo2',
          description: 'desc2',
          html_url: 'url2',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-02-01T00:00:00Z',
        },
        reason: 'Duplicate',
      },
    ];

    await service.generateDeletionReport(candidates, 'test-report');

    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    
    const writtenContent = mockedWriteFile.mock.calls[0][1];
    expect(writtenContent).toContain('Repository Name,URL,Reason,Last Updated,Created At');
    expect(writtenContent).toContain('"repo1","url1","Old and unused"');
    expect(writtenContent).toContain('"repo2","url2","Duplicate"');
  });

  it('should handle the case with no deletion candidates', async () => {
    await service.generateDeletionReport([], 'test-report');

    const writtenContent = mockedWriteFile.mock.calls[0][1];
    expect(writtenContent).toBe('No repositories recommended for deletion.');
  });
});
