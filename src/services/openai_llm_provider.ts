import { ILLMProvider, AppConfig, GitRepository } from "./index.js";
import OpenAI from 'openai';

export default class OpenAILLMProvider implements ILLMProvider {
    private openai: OpenAI;
    private config: AppConfig;
    
    constructor(config: AppConfig) {
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });
        this.config = config;
    }
    
    public async chat(repo: GitRepository, readmeContent: string): Promise<string | Error | null> {
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
            return content;

          } catch (error: any) {
            console.error(`Failed to analyze repository:`, error);
            return error;
          }
    }
   
