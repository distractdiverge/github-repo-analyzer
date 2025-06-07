// This file is run before each test file
import { jest } from '@jest/globals';

// Mock the main module to prevent it from running during tests
const mockMain = jest.fn();

// Mock the Octokit client
const mockListForUser = jest.fn().mockImplementation(() => Promise.resolve({ data: [] }));
const mockUpdate = jest.fn().mockImplementation(() => Promise.resolve({ data: {} }));
const mockOctokit = {
  repos: {
    listForUser: mockListForUser,
    update: mockUpdate
  }
};

// Mock the OpenAI client
const mockCreate = jest.fn().mockImplementation(() => 
  Promise.resolve({
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
);

const mockOpenAI = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

// Setup mocks
jest.mock('../src/index', () => ({
  __esModule: true,
  default: mockMain,
  analyzeRepo: jest.fn().mockImplementation(async () => ({
    name: 'test-repo',
    description: 'A test repository',
    category: 'Test',
    tags: ['test'],
    shouldKeep: true,
    reason: 'Test reason'
  })),
  updateRepoDescription: jest.fn(),
  generateDeletionReport: jest.fn(),
  saveReport: jest.fn()
}));

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => mockOctokit)
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => mockOpenAI)
}));

// Add TypeScript type for global mocks
declare global {
  // eslint-disable-next-line no-var
  var mocks: {
    mockMain: jest.Mock;
    mockListForUser: jest.Mock;
    mockUpdate: jest.Mock;
    mockCreate: jest.Mock;
    mockOctokit: typeof mockOctokit;
    mockOpenAI: typeof mockOpenAI;
  };
}

// Initialize global mocks
global.mocks = {
  mockMain,
  mockListForUser,
  mockUpdate,
  mockCreate,
  mockOctokit,
  mockOpenAI
};
