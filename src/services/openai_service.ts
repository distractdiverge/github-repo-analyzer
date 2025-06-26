import OpenAI from 'openai';
import { IGitRepoAnalyzer, AppConfig, GitRepository, GitRepoAnalysisResponse } from './index.js';

/**
 * Implementation of ILLMProvider using the OpenAI API.
 */
export class OpenAIRepoAnalyzer implements IGitRepoAnalyzer {
  private readonly openai: OpenAI;
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async analyze(repo: GitRepository, readmeContent: string): Promise<GitRepoAnalysisResponse> {
    try {
      // TODO: Actually create an interfacce around the openai interaction here, not the way it is now
      const response = await this.openai.chat.completions.create({
        model: this.config.openaiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a GitHub repository analyzer. Analyze repositories and provide categorization and recommendations.'
          },
          {
            role: 'user',
            content: `Analyze this GitHub repository:
            Name: ${repo.name}
            Description: ${repo.description || ''}
            README: ${readmeContent}
            
            Please categorize this repository and suggest appropriate tags.
            Also determine if this repository should be kept or can be deleted.
            
            Return the analysis in this JSON format:
            {
              "category": "[category]",
              "tags": ["tag1", "tag2"],
              "shouldKeep": true/false,
              "reason": "[reason for keeping/deleting]"
            }`
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      
      const parsed = JSON.parse(content);
      return {
        category: typeof parsed.category === 'string' ? parsed.category : 'Uncategorized',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['needs-review'],
        shouldKeep: parsed.shouldKeep !== false,
        reason: typeof parsed.reason === 'string' ? parsed.reason : 'No reason provided'
      };
    } catch (error: any) {
      console.error(`Failed to analyze repository ${repo.name}:`, error);
      return {
        category: 'Uncategorized',
        tags: ['needs-review'],
        shouldKeep: true,
        reason: 'Analysis failed'
      };
    }
  }
}
