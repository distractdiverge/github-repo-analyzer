import { GitHubService } from '../github_service.js';
import { Octokit } from '@octokit/rest';
import { AppConfig } from '../index.js';

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn()
}));

describe('GitHubService', () => {
  let gitHubService: GitHubService;
  let mockOctokit: jest.Mocked<Octokit>;
  let mockConfig: AppConfig;

  beforeEach(() => {
    mockConfig = {
      githubUsername: 'testuser',
      githubToken: 'testtoken',
      openaiApiKey: 'testkey',
      openaiModel: 'gpt-3.5-turbo'
    };

    mockOctokit = {
      repos: {
        listForUser: jest.fn(),
        getContent: jest.fn(),
        update: jest.fn()
      }
    } as any;

    (Octokit as jest.Mock).mockImplementation(() => mockOctokit);

    gitHubService = new GitHubService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Octokit instance with correct auth', () => {
      expect(Octokit).toHaveBeenCalledWith({ auth: mockConfig.githubToken });
    });
  });

  describe('getRepositories', () => {
    it('should fetch and transform repositories correctly', async () => {
      const mockRepos = [
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
          description: null,
          html_url: 'https://github.com/testuser/repo2',
          updated_at: '2023-02-01T00:00:00Z',
          created_at: '2022-02-01T00:00:00Z',
          default_branch: 'master'
        }
      ];

      mockOctokit.repos.listForUser.mockResolvedValue({ data: mockRepos });

      const result = await gitHubService.getRepositories();

      expect(mockOctokit.repos.listForUser).toHaveBeenCalledWith({
        username: mockConfig.githubUsername,
        sort: 'updated',
        direction: 'desc'
      });

      expect(result).toEqual([
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
          description: null,
          html_url: 'https://github.com/testuser/repo2',
          updated_at: '2023-02-01T00:00:00Z',
          created_at: '2022-02-01T00:00:00Z',
          default_branch: 'master'
        }
      ]);
    });
  });

  describe('getFileContent', () => {
    it('should return file content when file exists', async () => {
      const mockContent = 'Test README content';
      const mockResponse = {
        data: {
          type: 'file',
          content: Buffer.from(mockContent).toString('base64')
        }
      };

      mockOctokit.repos.getContent.mockResolvedValue(mockResponse);

      const result = await gitHubService.getFileContent('test-repo', 'README.md');

      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: mockConfig.githubUsername,
        repo: 'test-repo',
        path: 'README.md'
      });

      expect(result).toBe(mockContent);
    });

    it('should return null when file does not exist (404 error)', async () => {
      const mockError = new Error('Not Found');
      (mockError as any).status = 404;

      mockOctokit.repos.getContent.mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await gitHubService.getFileContent('test-repo', 'README.md');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('No README.md found for test-repo');

      consoleSpy.mockRestore();
    });

    it('should return null when content is not a file', async () => {
      const mockResponse = {
        data: {
          type: 'dir'
        }
      };

      mockOctokit.repos.getContent.mockResolvedValue(mockResponse);

      const result = await gitHubService.getFileContent('test-repo', 'README.md');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const mockError = new Error('Server Error');
      (mockError as any).status = 500;

      mockOctokit.repos.getContent.mockRejectedValue(mockError);

      await expect(gitHubService.getFileContent('test-repo', 'README.md')).rejects.toThrow('Server Error');
    });
  });

  describe('updateRepoDescription', () => {
    it('should update repository description', async () => {
      const mockResponse = { data: {} };
      mockOctokit.repos.update.mockResolvedValue(mockResponse);

      await gitHubService.updateRepoDescription('test-repo', 'New description');

      expect(mockOctokit.repos.update).toHaveBeenCalledWith({
        owner: mockConfig.githubUsername,
        repo: 'test-repo',
        description: 'New description'
      });
    });

    it('should handle update errors gracefully', async () => {
      const mockError = new Error('Update failed');
      mockOctokit.repos.update.mockRejectedValue(mockError);

      await expect(gitHubService.updateRepoDescription('test-repo', 'New description')).rejects.toThrow('Update failed');
    });
  });
});
