import { GitRepoAnalyzer } from '../git_repo_analysis.js';
import { IGitProvider, IGitRepoAnalyzer, GitRepository, GitRepoAnalysisResponse, DeletionCandidate } from '../index.js';

describe('GitRepoAnalyzer', () => {
  let gitRepoAnalyzer: GitRepoAnalyzer;
  let mockGitProvider: jest.Mocked<IGitProvider>;
  let mockLLMProvider: jest.Mocked<IGitRepoAnalyzer>;

  beforeEach(() => {
    mockGitProvider = {
      getRepositories: jest.fn(),
      getFileContent: jest.fn(),
      updateRepoDescription: jest.fn()
    };

    mockLLMProvider = {
      analyze: jest.fn()
    };

    gitRepoAnalyzer = new GitRepoAnalyzer(mockGitProvider, mockLLMProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeUserRepositories', () => {
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

    it('should analyze all repositories and return deletion candidates', async () => {
      const mockReadmeContent = '# Test README';
      const mockAnalysisResults: GitRepoAnalysisResponse[] = [
        {
          category: 'Development Tool',
          tags: ['javascript', 'testing'],
          shouldKeep: true,
          reason: 'Active development project'
        },
        {
          category: 'Archive',
          tags: ['old', 'deprecated'],
          shouldKeep: false,
          reason: 'No longer maintained'
        }
      ];

      mockGitProvider.getRepositories.mockResolvedValue(mockRepos);
      mockGitProvider.getFileContent.mockResolvedValue(mockReadmeContent);
      mockLLMProvider.analyze
        .mockResolvedValueOnce(mockAnalysisResults[0])
        .mockResolvedValueOnce(mockAnalysisResults[1]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await gitRepoAnalyzer.analyzeUserRepositories();

      expect(mockGitProvider.getRepositories).toHaveBeenCalledTimes(1);
      expect(mockGitProvider.getFileContent).toHaveBeenCalledTimes(2);
      expect(mockGitProvider.getFileContent).toHaveBeenCalledWith('repo1', 'README.md');
      expect(mockGitProvider.getFileContent).toHaveBeenCalledWith('repo2', 'README.md');
      
      expect(mockLLMProvider.analyze).toHaveBeenCalledTimes(2);
      expect(mockLLMProvider.analyze).toHaveBeenCalledWith(mockRepos[0], mockReadmeContent);
      expect(mockLLMProvider.analyze).toHaveBeenCalledWith(mockRepos[1], mockReadmeContent);

      expect(mockGitProvider.updateRepoDescription).toHaveBeenCalledTimes(1);
      expect(mockGitProvider.updateRepoDescription).toHaveBeenCalledWith(
        'repo1',
        'Test repo 1 | Category: Development Tool | Tags: javascript, testing'
      );

      expect(result).toEqual([
        {
          repo: mockRepos[1],
          reason: 'No longer maintained'
        }
      ]);

      expect(consoleSpy).toHaveBeenCalledWith('Found 2 repositories');
      expect(consoleSpy).toHaveBeenCalledWith('\n[1/2] Analyzing repo1...');
      expect(consoleSpy).toHaveBeenCalledWith('  Category: Development Tool');
      expect(consoleSpy).toHaveBeenCalledWith('  Tags: javascript, testing');
      expect(consoleSpy).toHaveBeenCalledWith('  Recommendation: KEEP');
      expect(consoleSpy).toHaveBeenCalledWith('  Reason: Active development project');
      expect(consoleSpy).toHaveBeenCalledWith('\n[2/2] Analyzing repo2...');
      expect(consoleSpy).toHaveBeenCalledWith('  Category: Archive');
      expect(consoleSpy).toHaveBeenCalledWith('  Tags: old, deprecated');
      expect(consoleSpy).toHaveBeenCalledWith('  Recommendation: DELETE');
      expect(consoleSpy).toHaveBeenCalledWith('  Reason: No longer maintained');
      expect(consoleSpy).toHaveBeenCalledWith('  Added to deletion candidates');

      consoleSpy.mockRestore();
    });

    it('should handle repositories with no README', async () => {
      const mockAnalysisResult: GitRepoAnalysisResponse = {
        category: 'Unknown',
        tags: ['untagged'],
        shouldKeep: true,
        reason: 'No README available'
      };

      mockGitProvider.getRepositories.mockResolvedValue([mockRepos[0]]);
      mockGitProvider.getFileContent.mockResolvedValue(null);
      mockLLMProvider.analyze.mockResolvedValue(mockAnalysisResult);

      const result = await gitRepoAnalyzer.analyzeUserRepositories();

      expect(mockLLMProvider.analyze).toHaveBeenCalledWith(mockRepos[0], '');
      expect(result).toEqual([]);
    });

    it('should handle repositories with empty description', async () => {
      const repoWithoutDescription = { ...mockRepos[0], description: null };
      const mockAnalysisResult: GitRepoAnalysisResponse = {
        category: 'Development Tool',
        tags: ['javascript'],
        shouldKeep: true,
        reason: 'Active project'
      };

      mockGitProvider.getRepositories.mockResolvedValue([repoWithoutDescription]);
      mockGitProvider.getFileContent.mockResolvedValue('# Test README');
      mockLLMProvider.analyze.mockResolvedValue(mockAnalysisResult);

      await gitRepoAnalyzer.analyzeUserRepositories();

      expect(mockGitProvider.updateRepoDescription).toHaveBeenCalledWith(
        'repo1',
        ' | Category: Development Tool | Tags: javascript'
      );
    });

    it('should handle empty repository list', async () => {
      mockGitProvider.getRepositories.mockResolvedValue([]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await gitRepoAnalyzer.analyzeUserRepositories();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Found 0 repositories');
      expect(mockGitProvider.getFileContent).not.toHaveBeenCalled();
      expect(mockLLMProvider.analyze).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle analysis errors gracefully', async () => {
      const mockError = new Error('Analysis failed');
      
      mockGitProvider.getRepositories.mockResolvedValue([mockRepos[0]]);
      mockGitProvider.getFileContent.mockResolvedValue('# Test README');
      mockLLMProvider.analyze.mockRejectedValue(mockError);

      await expect(gitRepoAnalyzer.analyzeUserRepositories()).rejects.toThrow('Analysis failed');
    });

    it('should handle git provider errors', async () => {
      const mockError = new Error('Git provider error');
      
      mockGitProvider.getRepositories.mockRejectedValue(mockError);

      await expect(gitRepoAnalyzer.analyzeUserRepositories()).rejects.toThrow('Git provider error');
    });

    it('should handle update description errors gracefully', async () => {
      const mockAnalysisResult: GitRepoAnalysisResponse = {
        category: 'Development Tool',
        tags: ['javascript'],
        shouldKeep: true,
        reason: 'Active project'
      };

      mockGitProvider.getRepositories.mockResolvedValue([mockRepos[0]]);
      mockGitProvider.getFileContent.mockResolvedValue('# Test README');
      mockLLMProvider.analyze.mockResolvedValue(mockAnalysisResult);
      mockGitProvider.updateRepoDescription.mockRejectedValue(new Error('Update failed'));

      await expect(gitRepoAnalyzer.analyzeUserRepositories()).rejects.toThrow('Update failed');
    });

    it('should return all repositories that should be deleted', async () => {
      const mockAnalysisResults: GitRepoAnalysisResponse[] = [
        {
          category: 'Archive',
          tags: ['old'],
          shouldKeep: false,
          reason: 'Reason 1'
        },
        {
          category: 'Archive',
          tags: ['deprecated'],
          shouldKeep: false,
          reason: 'Reason 2'
        }
      ];

      mockGitProvider.getRepositories.mockResolvedValue(mockRepos);
      mockGitProvider.getFileContent.mockResolvedValue('# README');
      mockLLMProvider.analyze
        .mockResolvedValueOnce(mockAnalysisResults[0])
        .mockResolvedValueOnce(mockAnalysisResults[1]);

      const result = await gitRepoAnalyzer.analyzeUserRepositories();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ repo: mockRepos[0], reason: 'Reason 1' });
      expect(result[1]).toEqual({ repo: mockRepos[1], reason: 'Reason 2' });
      expect(mockGitProvider.updateRepoDescription).not.toHaveBeenCalled();
    });
  });
});
