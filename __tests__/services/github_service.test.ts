import { GitHubService } from '../../src/services/github_service.js';
import { AppConfig } from '../../src/services/config.js';
import { Octokit } from '@octokit/rest';

// Mock the Octokit client
jest.mock('@octokit/rest');

const MockedOctokit = Octokit as jest.MockedClass<typeof Octokit>;

describe('GitHubService', () => {
  let service: GitHubService;
  let mockOctokit: jest.Mocked<InstanceType<typeof Octokit>>;

  const mockConfig: AppConfig = {
    githubUsername: 'test-user',
    githubToken: 'test-token',
    openaiApiKey: 'test-api-key',
    openaiModel: 'gpt-3.5-turbo',
  };

  beforeEach(() => {
    // Reset mocks before each test
    MockedOctokit.mockClear();
    
    // Create a mock instance of the Octokit client
    mockOctokit = new MockedOctokit() as jest.Mocked<InstanceType<typeof Octokit>>;
    mockOctokit.repos = {
      listForUser: jest.fn(),
      getContent: jest.fn(),
      update: jest.fn(),
    } as any;

    // Replace the Octokit constructor to return our mock instance
    MockedOctokit.mockImplementation(() => mockOctokit);

    service = new GitHubService(mockConfig);
  });

  it('should fetch repositories for a user', async () => {
    const mockRepos = [
      { name: 'repo1', description: 'desc1', html_url: 'url1', updated_at: 'date1', created_at: 'date1' },
      { name: 'repo2', description: 'desc2', html_url: 'url2', updated_at: 'date2', created_at: 'date2' },
    ];
    (mockOctokit.repos.listForUser as unknown as jest.Mock).mockResolvedValue({ data: mockRepos });

    const repos = await service.getRepositories();

    expect(repos).toHaveLength(2);
    expect(repos[0].name).toBe('repo1');
    expect(mockOctokit.repos.listForUser).toHaveBeenCalledWith({
      username: 'test-user',
      sort: 'updated',
      direction: 'desc',
    });
  });

  it('should fetch file content from a repository', async () => {
    const mockContent = { type: 'file', content: Buffer.from('hello world').toString('base64') };
    (mockOctokit.repos.getContent as unknown as jest.Mock).mockResolvedValue({ data: mockContent });

    const content = await service.getFileContent('repo1', 'README.md');

    expect(content).toBe('hello world');
    expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
      owner: 'test-user',
      repo: 'repo1',
      path: 'README.md',
    });
  });

  it('should return null if file content is not found', async () => {
    (mockOctokit.repos.getContent as unknown as jest.Mock).mockRejectedValue({ status: 404 });

    const content = await service.getFileContent('repo1', 'README.md');

    expect(content).toBeNull();
  });

  it('should update a repository description', async () => {
    await service.updateRepoDescription('repo1', 'new description');

    expect(mockOctokit.repos.update).toHaveBeenCalledWith({
      owner: 'test-user',
      repo: 'repo1',
      description: 'new description',
    });
  });
});
