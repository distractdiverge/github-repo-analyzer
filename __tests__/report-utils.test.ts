import { jest } from '@jest/globals';
// Ignore for now import { generateDeletionReport } from '../src/index.js';
import { mockRepoToDelete } from './test-utils.js';

declare const global: typeof globalThis & {
  mocks: {
    mockCreate: jest.Mock;
    mockListForUser: jest.Mock;
    mockUpdate: jest.Mock;
  };
};

/* Ignore for Now
describe('Report Generation', () => {
  describe('generateDeletionReport', () => {
    it('should generate a CSV report with headers when no repos are provided', () => {
      const result = generateDeletionReport([]);
      expect(result).toBe('Repository Name,URL,Reason,Last Updated,Created At\n');
    });

    it('should generate a CSV report with one repo', () => {
      const repo = mockRepoToDelete();
      const result = generateDeletionReport([repo]);
      
      const expected = [
        'Repository Name,URL,Reason,Last Updated,Created At',
        `"${repo.name}","${repo.url}","${repo.reason}","${repo.lastUpdated}","${repo.createdAt}"`
      ].join('\n') + '\n';
      
      expect(result).toBe(expected);
    });

    it('should escape quotes in repo names and reasons', () => {
      const repo = mockRepoToDelete({
        name: 'Test "Quoted" Repo',
        reason: 'Contains "quotes" and, commas'
      });
      
      const result = generateDeletionReport([repo]);
      expect(result).toContain('"Test \"Quoted\" Repo"');
      expect(result).toContain('"Contains \"quotes\" and, commas"');
    });
  });
});
*/
