import { writeFile } from 'fs/promises';
import { join } from 'path';
import { IReportService, DeletionCandidate } from './index.js';


/**
 * Implementation of IReportService that creates CSV reports.
 */
export class ReportService implements IReportService {
  /**
   * Generates a CSV-formatted report from a list of deletion candidates.
   * @param candidates The list of candidates.
   * @returns A string containing the CSV data.
   */
  private generateCsvContent(candidates: DeletionCandidate[]): string {
    if (candidates.length === 0) {
      return 'No repositories recommended for deletion.';
    }

    const header = 'Repository Name,URL,Reason,Last Updated,Created At\n';
    const rows = candidates.map(({ repo, reason }) => 
      `"${repo.name}","${repo.html_url}","${reason}","${repo.updated_at}","${repo.created_at}"`
    );

    return header + rows.join('\n');
  }

  /**
   * Saves the generated report to a file.
   * @param content The content to save.
   * @param filename The base name for the file.
   */
  public async generateDeletionReport(candidates: DeletionCandidate[], filename: string): Promise<void> {
    const content = this.generateCsvContent(candidates);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(process.cwd(), `${filename}-${timestamp}.csv`);
    
    await writeFile(reportPath, content, 'utf-8');
    console.log(`Report saved to: ${reportPath}`);
  }
}
