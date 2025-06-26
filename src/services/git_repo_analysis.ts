import { DeletionCandidate, IGitProvider, IGitRepoAnalyzer } from './index.js';

export interface IAnalysisOrchestrator {
    analyzeUserRepositories(): Promise<DeletionCandidate[]>;
}

/**
 * The main service for analyzing GitHub repositories.
 */
export class GitRepoAnalyzer implements IAnalysisOrchestrator {
  private readonly gitProvider: IGitProvider;
  private readonly llmProvider: IGitRepoAnalyzer;

  constructor(gitProvider: IGitProvider, llmProvider: IGitRepoAnalyzer) {
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
