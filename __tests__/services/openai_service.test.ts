import { OpenAIService } from '../../src/services/openai_service.js';
import { AppConfig } from '../../src/services/config.js';
import { GitRepository } from '../../src/services/github_service.js';
import OpenAI from 'openai';

// Mock the OpenAI client
jest.mock('openai');

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockOpenAI: jest.Mocked<InstanceType<typeof OpenAI>>;

  const mockConfig: AppConfig = {
    githubUsername: 'test-user',
    githubToken: 'test-token',
    openaiApiKey: 'test-api-key',
    openaiModel: 'gpt-3.5-turbo',
  };

  const mockRepo: GitRepository = {
    name: 'test-repo',
    description: 'A test repository',
    html_url: 'http://example.com/test-repo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    MockedOpenAI.mockClear();
    
    mockOpenAI = new MockedOpenAI() as jest.Mocked<InstanceType<typeof OpenAI>>;
    mockOpenAI.chat = {
      completions: {
        create: jest.fn(),
      },
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);

    service = new OpenAIService(mockConfig);
  });

  it('should return a valid analysis for a repository', async () => {
    const mockAnalysis = {
      category: 'Test',
      tags: ['testing', 'jest'],
      shouldKeep: true,
      reason: 'This is a test.',
    };
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
    } as any);

    const analysis = await service.analyze(mockRepo, 'README content');

    expect(analysis).toEqual(mockAnalysis);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
  });

  it('should return a default analysis on API failure', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

    const analysis = await service.analyze(mockRepo, 'README content');

    expect(analysis).toEqual({
      category: 'Uncategorized',
      tags: ['needs-review'],
      shouldKeep: true,
      reason: 'Analysis failed',
    });
  });

  it('should handle malformed JSON from the API', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'this is not json' } }],
    } as any);

    const analysis = await service.analyze(mockRepo, 'README content');

    expect(analysis).toEqual({
      category: 'Uncategorized',
      tags: ['needs-review'],
      shouldKeep: true,
      reason: 'Analysis failed',
    });
  });
});
