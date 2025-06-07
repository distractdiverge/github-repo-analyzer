// Mock the main module to prevent it from running during tests
const mockMain = jest.fn();

// Mock the Octokit client
const mockListForUser = jest.fn().mockResolvedValue({ data: [] });
const mockUpdate = jest.fn().mockResolvedValue({ data: {} });
const mockOctokit = {
  repos: {
    listForUser: mockListForUser,
    update: mockUpdate
  }
};

// Mock the OpenAI client
const mockCreate = jest.fn().mockResolvedValue({
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

const mockOpenAI = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

// Setup mocks before importing the module
jest.mock('../src/index', () => {
  return {
    __esModule: true,
    default: mockMain,
    analyzeRepo: jest.fn(),
    updateRepoDescription: jest.fn(),
    generateDeletionReport: jest.fn(),
    saveReport: jest.fn()
  };
});

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => mockOctokit)
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => mockOpenAI)
}));

// Export mocks for use in tests
export { mockMain, mockListForUser, mockUpdate, mockCreate, mockOctokit, mockOpenAI };
