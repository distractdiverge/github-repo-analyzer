import { Octokit } from '@octokit/rest';
import { IGitProvider, AppConfig, GitRepository } from './index.js';

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
