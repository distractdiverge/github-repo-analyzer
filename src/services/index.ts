/**
 * Defines the structure for the application's configuration, 
 * holding all necessary environment variables and settings.
 */
export interface AppConfig {
    githubUsername: string;
    githubToken: string;
    openaiApiKey: string;
    openaiModel: string;
}

/**
 * Interface defining the contract for configuration services.
 * This allows for different implementations (e.g., environment variables, JSON files, etc.)
 * to be used interchangeably.
 */
export interface IConfigService {
    /**
     * Loads configuration from the source.
     * This method should be called before any other methods.
     */
    load(): void;
    
    /**
     * Retrieves the application configuration.
     * @returns {AppConfig} The application configuration.
     * @throws {Error} If required configuration values are missing or invalid.
     */
    getConfig(): AppConfig;
}

/**
 * Represents a repository returned from the Git provider.
 */
export interface GitRepository {
    name: string;
    description: string | null;
    html_url: string;
    updated_at: string | null;
    created_at: string | null;
    default_branch?: string;
}

/**
 * Interface for a Git provider service.
 */
export interface IGitProvider {
    /**
     * Fetches all repositories for the configured user.
     */
    getRepositories(): Promise<GitRepository[]>;

    /**
     * Fetches the content of a file from a repository.
     * @param repoName The name of the repository.
     * @param path The path to the file.
     * @returns The file content as a string, or null if not found.
     */
    getFileContent(repoName: string, path: string): Promise<string | null>;

    /**
     * Updates the description of a repository.
     * @param repoName The name of the repository.
     * @param newDescription The new description.
     */
    updateRepoDescription(repoName: string, newDescription: string): Promise<void>;
  }

  /**
 * Represents a repository that is a candidate for deletion, including the reason.
 */
export interface DeletionCandidate {
    repo: GitRepository;
    reason: string;
  }
  
  /**
   * Interface for an analysis service.
   */
  export interface RepoAnalysis {
    analyzeUserRepositories(): Promise<DeletionCandidate[]>;
  }

  /**
 * Represents the analysis result for a single repository.
 */
export interface GitRepoAnalysisResponse {
    category: string;
    tags: string[];
    shouldKeep: boolean;
    reason: string;
  }
  
  /**
   * Interface for a Component that performs analysis of a git repository.
   */
  export interface IGitRepoAnalyzer {
    /**
     * Analyzes a repository and returns an analysis.
     * @param repo The repository to analyze.
     * @param readmeContent The content of the repository's README file.
     * @returns A RepoAnalysis object.
     */
    analyze(repo: GitRepository, readmeContent: string): Promise<GitRepoAnalysisResponse>;
  }

  /**
 * Interface for a reporting service.
 */
export interface IReportService {
    /**
     * Generates and saves a report of deletion candidates.
     * @param candidates The list of candidates to include in the report.
     * @param filename The base name for the report file.
     */
    generateDeletionReport(candidates: DeletionCandidate[], filename: string): Promise<void>;
  }
  
export interface ILLMProvider {
  chat(repo: GitRepository, readmeContent: string): Promise<string | Error | null>;
}