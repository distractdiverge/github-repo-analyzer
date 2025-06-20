import { GitRepoAnalyzer } from '../../src/services/git_repo_analysis.js';
import { IGitProvider, GitRepository } from '../../src/services/github_service.js';
import { ILLMProvider, RepoAnalysis } from '../../src/services/openai_service.js';

describe('GitRepoAnalyzer', () => {
  let analyzer: GitRepoAnalyzer;
  let mockGitProvider: jest.Mocked<IGitProvider>;
  let mockLlmProvider: jest.Mocked<ILLMProvider>;

  const mockRepos: GitRepository[] = [
    { name: 'repo-to-keep', description: 'A repo to keep', html_url: 'url1', created_at: 'date1', updated_at: 'date1' },
    { name: 'repo-to-delete', description: 'A repo to delete', html_url: 'url2', created_at: 'date2', updated_at: 'date2' },
  ];

  beforeEach(() => {
    mockGitProvider = {
      getRepositories: jest.fn(),
      getFileContent: jest.fn(),
      updateRepoDescription: jest.fn(),
    };

    mockLlmProvider = {
      analyze: jest.fn(),
    };

    analyzer = new GitRepoAnalyzer(mockGitProvider, mockLlmProvider);
  });

  it('should analyze repositories and separate them correctly', async () => {
    // Setup mocks
    mockGitProvider.getRepositories.mockResolvedValue(mockRepos);
    mockGitProvider.getFileContent.mockResolvedValue(''); // Mock README content

    const keepAnalysis: RepoAnalysis = { category: 'Good', tags: ['good'], shouldKeep: true, reason: 'It is good' };
    const deleteAnalysis: RepoAnalysis = { category: 'Bad', tags: ['bad'], shouldKeep: false, reason: 'It is bad' };

    mockLlmProvider.analyze.mockImplementation(async (repo) => {
      if (repo.name === 'repo-to-keep') {
        return keepAnalysis;
      }
      return deleteAnalysis;
    });

    // Run the analyzer
    const deletionCandidates = await analyzer.analyzeUserRepositories();

    // Assertions
    expect(mockGitProvider.getRepositories).toHaveBeenCalledTimes(1);
    expect(mockLlmProvider.analyze).toHaveBeenCalledTimes(2);
    
    // Check that the description was updated for the repo to keep
    expect(mockGitProvider.updateRepoDescription).toHaveBeenCalledWith(
      'repo-to-keep',
      expect.stringContaining('Category: Good')
    );

    // Check that the correct repo was marked for deletion
    expect(deletionCandidates).toHaveLength(1);
    expect(deletionCandidates[0].repo.name).toBe('repo-to-delete');
    expect(deletionCandidates[0].reason).toBe('It is bad');
  });
});
