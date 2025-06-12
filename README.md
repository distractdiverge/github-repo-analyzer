# GitHub Repository Analyzer

A command-line tool that analyzes your GitHub repositories using the OpenAI API. It categorizes them, suggests tags, and recommends which repositories could potentially be deleted or archived, generating a CSV report for your review.

## Features

*   **Comprehensive Analysis**: Fetches all repositories for a specified GitHub user and analyzes each one's name, description, and README content.
*   **AI-Powered Insights**: Uses an AI model (OpenAI) to generate a suggested category, tags, and a keep/delete recommendation for each repository.
*   **Automated Updates**: Optionally updates the repository description on GitHub with the analysis results.
*   **Actionable Reports**: Generates a `repos-to-delete.csv` file listing all repositories recommended for deletion, including the reason.

## Setup and Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd github-repo-analyzer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the root of the project and add the following environment variables. You will need a [GitHub Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) with `repo` scope and an [OpenAI API Key](https://platform.openai.com/api-keys).

```env
# .env

# Your GitHub username
GITHUB_USERNAME=your_github_username

# Your GitHub Personal Access Token with 'repo' scope
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Your OpenAI API Key
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# (Optional) Specify the OpenAI model to use. Defaults to gpt-3.5-turbo.
# OPENAI_MODEL=gpt-4-turbo
```

## Usage

There are two primary ways to run the application:

### Development Mode

This command uses `ts-node` to execute the TypeScript source code directly, which is ideal for development and testing.

```bash
npm run dev
```

### Production Mode

First, build the TypeScript code into JavaScript, then run the compiled output.

```bash
# 1. Compile the project
npm run build

# 2. Run the compiled code
npm start
```

The analysis results and any generated reports will be logged to the console, and the CSV report will be saved in the project's root directory.

## Available Scripts

*   `npm run dev`: Runs the application in development mode using `ts-node`.
*   `npm start`: Executes the compiled JavaScript code from the `dist` directory.
*   `npm run build`: Compiles the TypeScript source code to JavaScript.
*   `npm test`: Runs the test suite using Jest.

## Project Roadmap

This project is currently undergoing a refactor to a more modular, service-oriented architecture to improve maintainability and testability. The planned services include:

*   `ConfigService`: For managing environment variables and configuration.
*   `GitHubService`: For all interactions with the GitHub API.
*   `AnalysisService`: For handling the AI-based analysis logic with OpenAI.
*   `ReportService`: For generating and saving reports.
