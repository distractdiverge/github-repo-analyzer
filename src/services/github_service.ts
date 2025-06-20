import { Octokit } from '@octokit/rest';
import { AppConfig } from './config.js';

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
 * Implementation of IGitProvider using the GitHub API.
 */
export class GitHubService implements IGitProvider {
  private readonly octokit: Octokit;
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.githubToken });
  }

  async getRepositories(): Promise<GitRepository[]> {
    const { data } = await this.octokit.repos.listForUser({
      username: this.config.githubUsername,
      sort: 'updated',
      direction: 'desc',
    });
    return data.map(repo => ({
      name: repo.name,
      description: repo.description,
      html_url: repo.html_url,
      updated_at: repo.updated_at ?? null,
      created_at: repo.created_at ?? null,
      default_branch: repo.default_branch,
    }));
  }

  async getFileContent(repoName: string, path: string): Promise<string | null> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.config.githubUsername,
        repo: repoName,
        path,
      });

      // Type assertion to handle the response data structure
      const data = response.data as { content?: string; type?: string };

      if (data.type === 'file' && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf8');
      }
      return null;
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`No ${path} found for ${repoName}`);
        return null;
      }
      console.error(`Error fetching ${path} for ${repoName}:`, error);
      throw error;
    }
  }

  async updateRepoDescription(repoName: string, newDescription: string): Promise<void> {
    try {
      await this.octokit.repos.update({
        owner: this.config.githubUsername,
        repo: repoName,
        description: newDescription,
      });
    } catch (error: any) {
      console.error(`Failed to update repository ${repoName}:`, error);
      throw error;
    }
  }
}
