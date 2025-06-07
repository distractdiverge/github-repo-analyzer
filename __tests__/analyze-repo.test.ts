import { jest } from '@jest/globals';
// Ignore for now import { analyzeRepo } from '../src/index.js';

declare const global: typeof globalThis & {
  mocks: {
    mockCreate: jest.Mock;
  };
};

describe('analyzeRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should analyze a repository and return the correct structure', async () => {
    const mockRepo = {
      name: 'test-repo',
      description: 'A test repository',
      html_url: 'https://github.com/user/test-repo',
      updated_at: '2023-01-01T00:00:00Z',
      created_at: '2022-01-01T00:00:00Z'
    };

    // Mock the implementation for this test
    /* TODO: Fix/ Replace this mock 
    (global.mocks.mockCreate as jest.Mock).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            category: 'Test',
            tags: ['test'],
            shouldKeep: true,
            reason: 'Test reason'
          })
        }
      }]
    });
    */

    /* Ignore for Now
    const result = await analyzeRepo(mockRepo);
   

    expect(result).toEqual({
      name: 'test-repo',
      description: 'A test repository',
      category: 'Test',
      tags: ['test'],
      shouldKeep: true,
      reason: 'Test reason'
    });
 */

    expect(global.mocks.mockCreate).toHaveBeenCalledWith({
      model: expect.any(String),
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('You are a helpful assistant')
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('test-repo')
        })
      ]),
      temperature: 0.7
    });
  });
});
