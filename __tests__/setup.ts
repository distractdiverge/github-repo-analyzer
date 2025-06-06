// Mock the main module to prevent it from running during tests
jest.mock('../src/index', () => {
  const originalModule = jest.requireActual('../src/index');
  return {
    ...originalModule,
    // Mock any functions that make external API calls
  };
});

// Mock the Octokit client
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: {
      listForUser: jest.fn().mockResolvedValue({ data: [] }),
      update: jest.fn().mockResolvedValue({ data: {} })
    }
  }))
}));

// Mock the OpenAI client
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
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
        })
      }
    }
  }))
}));
