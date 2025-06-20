# I. Core Functionality & Setup

## [TODO] Finalize `main` function execution guard

*   In `src/index.ts`, you recently removed the `if (require.main === module)` block. If `src/index.ts` is intended to be run directly as a script, re-implement a robust check. The previous suggestion `if (import.meta.url === \`file://${process.argv[1]}\`)` is a good option for ES modules.
*   If it's only meant to be imported, ensure no top-level execution of `main()` happens automatically.

## [TODO] Complete `src/services/config.ts`

*   The current `load_config` function just calls `dotenv.config()`. This is already done at the top of `src/index.ts`.
*   Decide on the role of this service. It could centralize access to all environment variables and configurations, potentially validating them and providing typed access.
*   **Example:**
    ```typescript
    // src/services/config.ts
    import dotenv from 'dotenv';

    dotenv.config();

    export interface AppConfig {
      githubUsername: string;
      githubToken: string;
      openaiApiKey: string;
      openaiModel: string;
    }

    export function getConfig(): AppConfig {
      const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Added for completeness
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Added for completeness

      if (!GITHUB_USERNAME || !GITHUB_TOKEN || !OPENAI_API_KEY) {
        throw new Error('Missing required environment variables: GITHUB_USERNAME, GITHUB_TOKEN, OPENAI_API_KEY');
      }
      return {
        githubUsername: GITHUB_USERNAME,
        githubToken: GITHUB_TOKEN,
        openaiApiKey: OPENAI_API_KEY,
        openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      };
    }
    ```
*   Update `src/index.ts` to use this service for configuration.

# II. Refactoring for Testability & Maintainability (Your Key Request)

## [TODO] Create `GitHubService` (`src/services/github.ts`)

*   **Define an interface `IGitHubService`:**
    ```typescript
    // src/services/github.ts
    export interface IGitHubRepo {
      name: string;
      description: string | null;
      default_branch?: string;
      html_url?: string; // For deletion report
      updated_at?: string; // For deletion report
      created_at?: string; // For deletion report
      [key: string]: any;
    }

    export interface IGitHubService {
      listUserRepositories(): Promise<IGitHubRepo[]>;
      getRepositoryContent(owner: string, repo: string, path: string): Promise<string | null>; // e.g., for README
      updateRepositoryDescription(owner: string, repo: string, newDescription: string): Promise<void>;
    }
    ```
*   **Implement `GitHubService`:**
    *   Move Octokit initialization and related logic from `src/index.ts` into this service.
    *   The service constructor should take `AppConfig` (or necessary tokens/username).
    *   Implement methods like `listUserRepositories`, `getRepositoryContent` (for README), `updateRepositoryDescription`.
    *   Handle errors specific to GitHub API calls within this service.

## [TODO] Create `AnalysisService` (`src/services/git_repo_analysis.ts`)

*   **Define an interface `IAnalysisService`:**
    ```typescript
    // src/services/git_repo_analysis.ts
    import { RepoAnalysis } from '../index'; // Or move RepoAnalysis here

    export interface IAnalysisService {
      analyzeRepository(repoName: string, repoDescription: string, readmeContent: string | null): Promise<Omit<RepoAnalysis, 'name' | 'description'>>;
    }
    ```
*   **Implement `AnalysisService`:**
    *   Move OpenAI client initialization and the core analysis logic (prompting, parsing response) from `analyzeRepo` in `src/index.ts` into this service.
    *   The service constructor should take `AppConfig` (or API key/model).

## [TODO] Create `ReportService` (new file, e.g., `src/services/report.ts`)

*   **Define an interface `IReportService`:**
    ```typescript
    import { RepoToDelete } from '../index'; // Or move RepoToDelete here

    export interface IReportService {
      generateDeletionReport(repos: RepoToDelete[]): Promise<string>; // CSV content
      saveReportToFile(content: string, baseFilename: string): Promise<string>; // Returns path
    }
    ```
*   **Implement `ReportService`:**
    *   Move `generateDeletionReport` and `saveReport` logic from `src/index.ts` here.

## [TODO] Refactor `src/index.ts`

*   Remove direct client initializations (Octokit, OpenAI) and use the new services.
*   The `main` function should orchestrate calls to these services.
*   Inject service instances into functions or classes that need them (Dependency Injection).
*   **Example structure for `main`:**
    ```typescript
    // src/index.ts
    // ... imports for services and config
    // import { getConfig } from './services/config';
    // import { GitHubService } from './services/github';
    // ...

    async function main() {
      // const config = getConfig();
      // const githubService = new GitHubService(config);
      // const analysisService = new AnalysisService(config);
      // const reportService = new ReportService();

      // ... use services to achieve the original logic ...
    }
    ```
*   Move type definitions like `RepoAnalysis`, `RepoToDelete` to either their relevant service files or a dedicated `src/types.ts` file.

# III. Error Handling & Robustness

## [TODO] Centralize and improve error handling

*   Each service should handle its specific errors (e.g., API errors, parsing errors) and either log them, throw custom errors, or return error-indicating results.
*   The `main` function in `src/index.ts` should have a top-level try-catch to handle errors from services.
*   Consider using a more structured logging approach instead of just `console.log` and `console.error` everywhere, especially if this tool grows.

## [TODO] Improve input validation

*   Validate the structure of the OpenAI API response more robustly in `AnalysisService` before parsing.
*   Add checks for `repo.name` before using it in API calls (e.g., in `GitHubService`).

# IV. Code Quality & Best Practices

## [TODO] Reduce usage of `any` type

*   In `Repository` type in `src/index.ts` (or its new location), try to define known properties from the Octokit response more specifically instead of `[key: string]: any;`.
*   Type error objects in catch blocks (e.g., `catch (error: any)` can be `catch (error: unknown)` and then type-checked).

## [TODO] Consistent Naming

*   Ensure consistent naming conventions for variables, functions, and interfaces.

## [TODO] README Update

*   Document the setup ( `.env` file requirements).
*   Explain how to run the script and build it.
*   Briefly describe the new service-based architecture once refactored.

# V. Testing

## [TODO] Fix Jest Configuration

*   The test suite is currently failing with a `SyntaxError: Unexpected token 'export'`.
*   This is caused by an issue with Jest's transformation of ES Modules, particularly in the `__tests__/jest.setup.ts` file.
*   Investigate the `jest.config.js` (in `package.json`) and `tsconfig.json` to ensure `ts-jest` is correctly configured to handle ESM syntax across all test-related files, including setup files.

## [TODO] Write Unit Tests

*   For `ConfigService`: Test loading and validation of environment variables (mock `process.env`).
*   For `AnalysisService`: Mock the OpenAI client. Test the prompt generation and response parsing logic. Test different OpenAI response scenarios (valid, invalid, error).
*   For `GitHubService`: Mock the Octokit client. Test methods like `listUserRepositories`, `getRepositoryContent`, `updateRepositoryDescription` with mock API responses.
*   For `ReportService`: Test CSV generation and file saving logic (mock `fs/promises`).

## [TODO] Write Integration Tests (Optional but Recommended)

*   Test the interaction between services. For example, a test that uses a mock `GitHubService` and a mock `AnalysisService` to verify the main loop in `src/index.ts`.
*   You might need a separate test `.env` file or mock environment variables for these.