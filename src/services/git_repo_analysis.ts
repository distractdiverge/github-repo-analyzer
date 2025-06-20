import { IGitProvider, GitRepository } from './github_service.js';
import { ILLMProvider } from './openai_service.js';

/**
 * Represents a repository that is a candidate for deletion, including the reason.
 */
export interface DeletionCandidate {
  repo: GitRepository;
  reason: string;
}

/**
 * The main service for analyzing GitHub repositories.
 */
export class GitRepoAnalyzer {
  private readonly gitProvider: IGitProvider;
  private readonly llmProvider: ILLMProvider;

  constructor(gitProvider: IGitProvider, llmProvider: ILLMProvider) {
    this.gitProvider = gitProvider;
    this.llmProvider = llmProvider;
  }

  /**
   * Runs the complete analysis process for all repositories.
   * @returns A list of deletion candidates.
   */
  public async analyzeUserRepositories(): Promise<DeletionCandidate[]> {
    const repos = await this.gitProvider.getRepositories();
    console.log(`Found ${repos.length} repositories`);

    const deletionCandidates: DeletionCandidate[] = [];
    let processedCount = 0;

    for (const repo of repos) {
      processedCount++;
      console.log(`\n[${processedCount}/${repos.length}] Analyzing ${repo.name}...`);

      const readmeContent = await this.gitProvider.getFileContent(repo.name, 'README.md') || '';
      const analysis = await this.llmProvider.analyze(repo, readmeContent);

      console.log(`  Category: ${analysis.category}`);
      console.log(`  Tags: ${analysis.tags.join(', ')}`);
      console.log(`  Recommendation: ${analysis.shouldKeep ? 'KEEP' : 'DELETE'}`);
      console.log(`  Reason: ${analysis.reason}`);

      if (analysis.shouldKeep) {
        const newDescription = `${repo.description || ''} | Category: ${analysis.category} | Tags: ${analysis.tags.join(', ')}`;
        await this.gitProvider.updateRepoDescription(repo.name, newDescription);
      } else {
        deletionCandidates.push({ repo, reason: analysis.reason });
        console.log(`  Added to deletion candidates`);
      }
    }
    return deletionCandidates;
  }
}
