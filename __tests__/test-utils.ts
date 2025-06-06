import { RepoAnalysis } from '../src/index.js';

type RepoToDelete = {
  name: string;
  url: string;
  reason: string;
  lastUpdated: string;
  createdAt: string;
};

export const mockRepoAnalysis = (overrides: Partial<RepoAnalysis> = {}): RepoAnalysis => ({
  name: 'test-repo',
  description: 'A test repository',
  category: 'Test',
  tags: ['test', 'example'],
  shouldKeep: true,
  reason: 'Test reason',
  ...overrides
});

export const mockRepoToDelete = (overrides: Partial<RepoToDelete> = {}): RepoToDelete => ({
  name: 'test-repo',
  url: 'https://github.com/user/test-repo',
  reason: 'Test reason for deletion',
  lastUpdated: '2023-01-01T00:00:00Z',
  createdAt: '2022-01-01T00:00:00Z',
  ...overrides
});
