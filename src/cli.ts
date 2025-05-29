#!/usr/bin/env node

import { Command } from 'commander';
import { ArchitectureGenerator } from './ArchitectureGenerator.js';
import { GeneratorOptions, ExportOptions } from './types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const program = new Command();

program
  .name('github-arch')
  .description('Generate architecture diagrams for GitHub repositories or local projects')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate architecture diagrams for a repository')
  .requiredOption('-r, --repo <repo>', 'GitHub repository (owner/repo) or local path')
  .option('-t, --type <type>', 'Diagram type (functional or deployment)', 'functional')
  .option('-o, --output <format>', 'Output format (json, mermaid, svg, png)', 'mermaid')
  .option('-f, --file <path>', 'Output file path')
  .option('--token <token>', 'GitHub API token')
  .option('--exclude <patterns...>', 'Patterns to exclude')
  .option('--ai-model <model>', 'AI model to use for enhancement (e.g., gpt-4, claude)', 'gpt-4')
  .option('--ai-api-key <key>', 'API key for the AI model')
  .option('--no-ai', 'Disable AI enhancement')
  .action(async (options) => {
    try {
      console.log('Starting architecture diagram generation...');
      console.log(`Repository: ${options.repo}`);
      console.log(`Type: ${options.type}`);
      console.log(`Output format: ${options.output}`);

      const generatorOptions: GeneratorOptions = {
        token: options.token || process.env.GITHUB_TOKEN,
        excludePatterns: options.exclude,
        aiModel: options.aiModel,
        aiApiKey: options.aiApiKey || process.env.AI_API_KEY,
        enableAI: options.ai !== false
      };

      if (generatorOptions.enableAI) {
        console.log(`AI Model: ${generatorOptions.aiModel}`);
        if (!generatorOptions.aiApiKey) {
          console.warn('Warning: No AI API key provided. AI enhancement will be disabled.');
          generatorOptions.enableAI = false;
        }
      }

      const generator = new ArchitectureGenerator(generatorOptions);

      console.log('Generating diagram...');
      const diagram = options.type === 'functional'
        ? await generator.generateFunctionalArchitecture(options.repo)
        : await generator.generateDeploymentArchitecture(options.repo);

      console.log('Diagram generated successfully.');
      console.log(`Nodes: ${diagram.nodes.length}`);
      console.log(`Edges: ${diagram.edges.length}`);

      console.log('Exporting diagram...');
      const exportOptions: ExportOptions = {
        format: options.output
      };

      const output = await generator.exportDiagram(diagram, exportOptions);

      if (options.file) {
        console.log(`Writing diagram to ${options.file}...`);
        fs.writeFileSync(options.file, output);
        console.log(`Diagram written to ${options.file}`);
      } else {
        console.log('\nDiagram:');
        console.log(output);
      }
    } catch (error: unknown) {
      console.error('\nError generating architecture diagram:');
      if (error instanceof Error) {
        console.error(error.message);
        if (error.stack) {
          console.error('\nStack trace:');
          console.error(error.stack);
        }
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize configuration file')
  .action(() => {
    try {
      console.log('Initializing configuration...');
      const config = {
        githubToken: process.env.GITHUB_TOKEN || '',
        aiModel: 'gpt-4',
        aiApiKey: process.env.AI_API_KEY || '',
        enableAI: true,
        diagramTypes: ['functional', 'deployment'],
        outputFormats: ['json', 'mermaid', 'svg', 'png'],
        excludePatterns: ['node_modules', 'dist', '.git'],
        customStyles: {
          nodeColor: '#4CAF50',
          edgeColor: '#2196F3',
          backgroundColor: '#FFFFFF'
        }
      };

      const configPath = path.join(process.cwd(), '.github-arch-config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`Configuration file created at ${configPath}`);
    } catch (error: unknown) {
      console.error('\nError initializing configuration:');
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

program.parse(); 