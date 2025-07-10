import { OpenAIRepoAnalyzer } from '../openai_service.js';
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

describe('OpenAIRepoAnalyzer', () => {
  let openaiRepoAnalyzer: OpenAIRepoAnalyzer;
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

    openaiRepoAnalyzer = new OpenAIRepoAnalyzer(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create OpenAI instance with correct API key', () => {
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: mockConfig.openaiApiKey });
    });
  });

  describe('analyze', () => {
    const mockRepo: GitRepository = {
      name: 'test-repo',
      description: 'A test repository',
      html_url: 'https://github.com/testuser/test-repo',
      updated_at: '2023-01-01T00:00:00Z',
      created_at: '2022-01-01T00:00:00Z',
      default_branch: 'main'
    };

    const mockReadmeContent = '# Test Repo\nThis is a test repository';

    it('should return parsed analysis response', async () => {
      const mockAnalysisResponse = {
        category: 'Development Tool',
        tags: ['javascript', 'testing'],
        shouldKeep: true,
        reason: 'Active development project'
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysisResponse)
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await openaiRepoAnalyzer.analyze(mockRepo, mockReadmeContent);

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

      expect(result).toEqual(mockAnalysisResponse);
    });

    it('should handle empty repository description', async () => {
      const repoWithoutDescription = { ...mockRepo, description: null };
      const mockAnalysisResponse = {
        category: 'Unknown',
        tags: ['untagged'],
        shouldKeep: false,
        reason: 'No description available'
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysisResponse)
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await openaiRepoAnalyzer.analyze(repoWithoutDescription, mockReadmeContent);

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

      expect(result).toEqual(mockAnalysisResponse);
    });

    it('should throw error when OpenAI response has no content', async () => {
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

      await expect(openaiRepoAnalyzer.analyze(mockRepo, mockReadmeContent)).rejects.toThrow('No content in OpenAI response');
    });

    it('should throw error when OpenAI response has no choices', async () => {
      const mockResponse = {
        choices: []
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(openaiRepoAnalyzer.analyze(mockRepo, mockReadmeContent)).rejects.toThrow('No content in OpenAI response');
    });

    it('should throw error when response content is not valid JSON', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'invalid json content'
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(openaiRepoAnalyzer.analyze(mockRepo, mockReadmeContent)).rejects.toThrow('Failed to parse OpenAI response');
    });

    it('should throw error when OpenAI API call fails', async () => {
      const mockError = new Error('API Error');
      mockOpenAI.chat.completions.create.mockRejectedValue(mockError);

      await expect(openaiRepoAnalyzer.analyze(mockRepo, mockReadmeContent)).rejects.toThrow('API Error');
    });

    it('should handle malformed JSON response gracefully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"category": "Test", "tags": ["test"]' // Missing closing brace
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(openaiRepoAnalyzer.analyze(mockRepo, mockReadmeContent)).rejects.toThrow('Failed to parse OpenAI response');
    });

    it('should handle JSON response with missing required fields', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'Test',
                // Missing tags, shouldKeep, reason
              })
            }
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await openaiRepoAnalyzer.analyze(mockRepo, mockReadmeContent);

      expect(result).toEqual({
        category: 'Test'
      });
    });
  });
});
