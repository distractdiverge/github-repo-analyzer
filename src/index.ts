import { IConfigService, AppConfig, DotEnvConfigService } from './services/config.js';
import { GitHubService, IGitProvider } from './services/github_service.js';
import { OpenAIService, ILLMProvider } from './services/openai_service.js';
import { GitRepoAnalyzer } from './services/git_repo_analysis.js';
import { ReportService, IReportService } from './services/report_service.js';

/**
 * Main application context that holds all service instances.
 */
export class AppContext {
  public readonly config: AppConfig;
  public readonly gitHubService: IGitProvider;
  public readonly openAIService: ILLMProvider;
  public readonly reportService: IReportService;
  public readonly analyzer: GitRepoAnalyzer;

  constructor(configService: IConfigService = new DotEnvConfigService()) {
    // Load configuration
    configService.load();
    this.config = configService.getConfig();
    
    // Initialize services
    this.gitHubService = new GitHubService(this.config);
    this.openAIService = new OpenAIService(this.config);
    this.reportService = new ReportService();
    this.analyzer = new GitRepoAnalyzer(this.gitHubService, this.openAIService);
    
    console.log(`Using OpenAI model: ${this.config.openaiModel}`);
  }
}

/**
 * Main application entry point.
 */
async function main() {
  try {
    const appContext = new AppContext();
    
    const deletionCandidates = await appContext.analyzer.analyzeUserRepositories();

    if (deletionCandidates.length > 0) {
      console.log('\n=== REPOSITORIES RECOMMENDED FOR DELETION ===');
      await appContext.reportService.generateDeletionReport(deletionCandidates, 'repos-to-delete');
      console.log('\nReview the generated CSV file and manually delete repositories if desired.');
      console.log('Repositories can be deleted at: https://github.com/settings/repositories');
    } else {
      console.log('\nNo repositories were recommended for deletion.');
    }

    console.log('\nAnalysis complete!');
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  } finally {
    console.log('\nProcess completed.');
  }
}

// Execute the main function
main().catch(console.error);
