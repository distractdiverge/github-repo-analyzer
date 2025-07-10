import dotenv from 'dotenv';
import { IConfigService, AppConfig } from './index.js';

/**
 * Implementation of IConfigService that loads configuration from environment variables
 * using dotenv for .env file support.
 */
export class DotEnvConfigService implements IConfigService {
    private config: AppConfig | null = null;
    private isLoaded: boolean = false;

    /**
     * Creates a new instance of DotEnvConfigService.
     */
    constructor() {}

    /**
     * Loads environment variables from a .env file into process.env.
     * This method should be called as early as possible in the application's lifecycle.
     */
    public load(): void {
        if (this.isLoaded) {
            return; // Prevent multiple loads
        }
        
        dotenv.config();
        this.isLoaded = true;
    }

    /**
     * Retrieves the application configuration from environment variables.
     * @returns {AppConfig} The application configuration.
     * @throws {Error} If required environment variables are missing.
     */
    public getConfig(): AppConfig {
        if (!this.isLoaded) {
            throw new Error('Configuration has not been loaded. Call load() first.');
        }

        // Return cached config if available
        if (this.config) {
            return this.config;
        }

        const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!GITHUB_USERNAME || !GITHUB_TOKEN || !OPENAI_API_KEY) {
            throw new Error('Missing required environment variables: GITHUB_USERNAME, GITHUB_TOKEN, OPENAI_API_KEY');
        }
        
        this.config = {
            githubUsername: GITHUB_USERNAME,
            githubToken: GITHUB_TOKEN,
            openaiApiKey: OPENAI_API_KEY,
            openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        };

        return this.config;
    }
}

// Default export for the configuration service
export default DotEnvConfigService;