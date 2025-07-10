import OpenAILLMProvider from '../openai_llm_provider.js';
import OpenAI from 'openai';
import { AppConfig, GitRepository } from '../index.js';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

describe('OpenAILLMProvider', () => {
  let openaiLLMProvider: OpenAILLMProvider;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockConfig: AppConfig;

  beforeEach(() => {
    mockConfig = {
      githubUsername: 'testuser',
      githubToken: 'testtoken',
      openaiApiKey: 'testkey',
      openaiModel: 'gpt-3.5-turbo'
    };

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

    openaiLLMProvider = new OpenAILLMProvider(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create OpenAI instance with correct API key', () => {
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: mockConfig.openaiApiKey });
    });
  });

  describe('chat', () => {
    const mockRepo: GitRepository = {
      name: 'test-repo',
      description: 'A test repository',
      html_url: 'https://github.com/testuser/test-repo',
      updated_at: '2023-01-01T00:00:00Z',
      created_at: '2022-01-01T00:00:00Z',
      default_branch: 'main'
    };

    const mockReadmeContent = '# Test Repo\nThis is a test repository';

    it('should return chat completion response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'Development Tool',
                tags: ['javascript', 'testing'],
                shouldKeep: true,
                reason: 'Active development project'
              })
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await openaiLLMProvider.chat(mockRepo, mockReadmeContent);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: mockConfig.openaiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a GitHub repository analyzer. Analyze repositories and provide categorization and recommendations.'
          },
          {
            role: 'user',
            content: `Analyze this GitHub repository:
                  Name: ${mockRepo.name}
                  Description: ${mockRepo.description || ''}
                  README: ${mockReadmeContent}
                  
                  Please categorize this repository and suggest appropriate tags.
                  Also determine if this repository should be kept or can be deleted.
                  
                  Return the analysis in this JSON format:
                  {
                    "category": "[category]",
                    "tags": ["tag1", "tag2"],
                    "shouldKeep": true/false,
                    "reason": "[reason for keeping/deleting]"
                  }`
          }
        ]
      });

      expect(result).toBe(mockResponse.choices[0].message.content);
    });

    it('should handle empty repository description', async () => {
      const repoWithoutDescription = { ...mockRepo, description: null };
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Analysis result'
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await openaiLLMProvider.chat(repoWithoutDescription, mockReadmeContent);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Description: ')
            })
          ])
        })
      );
    });

    it('should return error when OpenAI API call fails', async () => {
      const mockError = new Error('API Error');
      mockOpenAI.chat.completions.create.mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await openaiLLMProvider.chat(mockRepo, mockReadmeContent);

      expect(result).toBe(mockError);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to analyze repository:', mockError);

      consoleSpy.mockRestore();
    });

    it('should handle missing response content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await openaiLLMProvider.chat(mockRepo, mockReadmeContent);

      expect(result).toBeNull();
    });

    it('should handle missing choices in response', async () => {
      const mockResponse = {
        choices: []
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await openaiLLMProvider.chat(mockRepo, mockReadmeContent);

      expect(result).toBeUndefined();
    });
  });
});
