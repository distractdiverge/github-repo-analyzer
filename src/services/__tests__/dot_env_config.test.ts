import { DotEnvConfigService } from '../dot_env_config.js';
import dotenv from 'dotenv';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('DotEnvConfigService', () => {
  let configService: DotEnvConfigService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
    
    // Clear the mocks
    jest.clearAllMocks();
    
    // Create a new instance for each test
    configService = new DotEnvConfigService();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('load', () => {
    it('should load environment variables from .env file', () => {
      configService.load();
      
      expect(dotenv.config).toHaveBeenCalled();
    });

    it('should prevent multiple loads', () => {
      configService.load();
      configService.load();
      
      expect(dotenv.config).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConfig', () => {
    it('should throw error when configuration is not loaded', () => {
      expect(() => configService.getConfig()).toThrow('Configuration has not been loaded. Call load() first.');
    });

    it('should return valid configuration when all environment variables are set', () => {
      // Set up environment variables
      process.env.GITHUB_USERNAME = 'testuser';
      process.env.GITHUB_TOKEN = 'testtoken';
      process.env.OPENAI_API_KEY = 'testkey';
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
      
      configService.load();
      const config = configService.getConfig();
      
      expect(config).toEqual({
        githubUsername: 'testuser',
        githubToken: 'testtoken',
        openaiApiKey: 'testkey',
        openaiModel: 'gpt-3.5-turbo'
      });
    });

    it('should use default OpenAI model when not specified', () => {
      // Set up required environment variables
      process.env.GITHUB_USERNAME = 'testuser';
      process.env.GITHUB_TOKEN = 'testtoken';
      process.env.OPENAI_API_KEY = 'testkey';
      delete process.env.OPENAI_MODEL;
      
      configService.load();
      const config = configService.getConfig();
      
      expect(config.openaiModel).toBe('gpt-3.5-turbo');
    });

    it('should throw error when GITHUB_USERNAME is missing', () => {
      process.env.GITHUB_TOKEN = 'testtoken';
      process.env.OPENAI_API_KEY = 'testkey';
      delete process.env.GITHUB_USERNAME;
      
      configService.load();
      
      expect(() => configService.getConfig()).toThrow('Missing required environment variables');
    });

    it('should throw error when GITHUB_TOKEN is missing', () => {
      process.env.GITHUB_USERNAME = 'testuser';
      process.env.OPENAI_API_KEY = 'testkey';
      delete process.env.GITHUB_TOKEN;
      
      configService.load();
      
      expect(() => configService.getConfig()).toThrow('Missing required environment variables');
    });

    it('should throw error when OPENAI_API_KEY is missing', () => {
      process.env.GITHUB_USERNAME = 'testuser';
      process.env.GITHUB_TOKEN = 'testtoken';
      delete process.env.OPENAI_API_KEY;
      
      configService.load();
      
      expect(() => configService.getConfig()).toThrow('Missing required environment variables');
    });

    it('should return cached configuration on subsequent calls', () => {
      process.env.GITHUB_USERNAME = 'testuser';
      process.env.GITHUB_TOKEN = 'testtoken';
      process.env.OPENAI_API_KEY = 'testkey';
      
      configService.load();
      const config1 = configService.getConfig();
      const config2 = configService.getConfig();
      
      expect(config1).toBe(config2); // Should be the same reference
    });
  });
});
