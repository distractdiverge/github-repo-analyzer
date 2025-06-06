import dotenv from 'dotenv';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Load environment variables from .env file
dotenv.config();

// Initialize clients
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Default to gpt-3.5-turbo if not specified
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

if (!GITHUB_USERNAME || !GITHUB_TOKEN || !OPENAI_API_KEY) {
  throw new Error('GitHub username, GitHub token, and OpenAI API key must be set in .env file');
}

console.log(`Using OpenAI model: ${OPENAI_MODEL}`);

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY as string
});

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Export types for testing
export interface RepoAnalysis {
  name: string;
  description: string;
  category: string;
  tags: string[];
  shouldKeep: boolean;
  reason: string;
}

interface GitHubFileContent {
  type: 'file';
  content: string;
}

// Model is now configured via OPENAI_MODEL environment variable

// Define a more specific type for the repository parameter
type Repository = {
  name: string;
  description: string | null;
  default_branch?: string;
  [key: string]: any; // Allow other properties
};

async function analyzeRepo(repo: Repository): Promise<RepoAnalysis> {
  const name = repo.name || 'unknown';
  const description = repo.description || '';
  
  if (name === 'unknown') {
    console.warn('Repository has no name, using fallback');
  }
  
  // Get the README content
  let readmeContent = '';
  try {
    const response = await octokit.repos.getContent({
      owner: GITHUB_USERNAME as string,
      repo: name,
      path: 'README.md'
    });

    const content = response.data as GitHubFileContent;
    if (content.type === 'file' && content.content) {
      readmeContent = Buffer.from(content.content, 'base64').toString('utf8');
    }
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`No README found for ${name}`);
    } else {
      console.error(`Error fetching README for ${name}:`, error);
    }
  }

  // Analyze the repository
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a GitHub repository analyzer. Analyze repositories and provide categorization and recommendations.'
        },
        {
          role: 'user',
          content: `Analyze this GitHub repository:
          Name: ${name}
          Description: ${description}
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
    const analysis = {
      category: typeof parsed.category === 'string' ? parsed.category : 'Uncategorized',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['needs-review'],
      shouldKeep: parsed.shouldKeep !== false,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'No reason provided'
    };
    
    return {
      name,
      description,
      ...analysis
    };
  } catch (error: any) {
    console.error(`Failed to analyze repository ${name}:`, error);
    return {
      name,
      description,
      category: 'Uncategorized',
      tags: ['needs-review'],
      shouldKeep: true,
      reason: 'Analysis failed'
    };
  }
}

async function updateRepoDescription(repo: { name: string; description: string; category: string; tags: string[] }) {
  try {
    // Update repository description with category and tags
    await octokit.repos.update({
      owner: GITHUB_USERNAME as string,
      repo: repo.name || 'unknown',
      description: `${repo.description} | Category: ${repo.category} | Tags: ${repo.tags.join(', ')}`
    });
  } catch (error: any) {
    console.error(`Failed to update repository ${repo.name}:`, error);
  }
}
export interface RepoToDelete {
  name: string;
  url: string;
  reason: string;
  lastUpdated: string;
  createdAt: string;
}

export async function generateDeletionReport(repos: RepoToDelete[]): Promise<string> {
  if (repos.length === 0) {
    return 'No repositories recommended for deletion.';
  }

  // CSV header
  let csv = 'Repository Name,URL,Reason,Last Updated,Created At\n';
  
  // Add each repo as a row
  for (const repo of repos) {
    csv += `"${repo.name}","${repo.url}","${repo.reason}","${repo.lastUpdated}","${repo.createdAt}"\n`;
  }
  
  return csv;
}

export async function saveReport(content: string, filename: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = join(process.cwd(), `${filename}-${timestamp}.csv`);
  await writeFile(reportPath, content, 'utf-8');
  console.log(`Report saved to: ${reportPath}`);
}

async function main() {
  try {
    // Get all repositories
    const { data: repos } = await octokit.repos.listForUser({
      username: GITHUB_USERNAME as string,
      sort: 'updated',
      direction: 'desc'
    });

    console.log(`Found ${repos.length} repositories`);
    const reposToDelete: RepoToDelete[] = [];
    let processedCount = 0;

    // Process each repository
    for (const repo of repos) {
      processedCount++;
      console.log(`\n[${processedCount}/${repos.length}] Analyzing ${repo.name}...`);
      
      const analysis = await analyzeRepo(repo);
      console.log(`  Category: ${analysis.category}`);
      console.log(`  Tags: ${analysis.tags.join(', ')}`);
      console.log(`  Recommendation: ${analysis.shouldKeep ? 'KEEP' : 'DELETE'}`);
      console.log(`  Reason: ${analysis.reason}`);

      if (analysis.shouldKeep) {
        // Update repository description with analysis results
        await updateRepoDescription({
          name: analysis.name,
          description: analysis.description,
          category: analysis.category,
          tags: analysis.tags
        });
      } else {
        // Add to deletion candidates
        reposToDelete.push({
          name: repo.name,
          url: repo.html_url || `https://github.com/${GITHUB_USERNAME}/${repo.name}`,
          reason: analysis.reason,
          lastUpdated: repo.updated_at || 'unknown',
          createdAt: repo.created_at || 'unknown'
        });
        console.log(`  Added to deletion candidates`);
      }
    }

    // Generate and save deletion report
    if (reposToDelete.length > 0) {
      console.log('\n=== REPOSITORIES RECOMMENDED FOR DELETION ===');
      const report = await generateDeletionReport(reposToDelete);
      await saveReport(report, 'repos-to-delete');
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

main();