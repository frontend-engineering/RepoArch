#!/usr/bin/env node

import { Command } from 'commander';
import { ArchitectureGenerator } from './ArchitectureGenerator.js';
import { GeneratorOptions } from './types/index.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env file');
} else {
  dotenv.config();
  console.log('No .env file found, using system environment variables');
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const program = new Command();

program
  .name('github-architecture-generator')
  .description('Generate architecture diagrams from GitHub repositories or local code')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate architecture diagram')
  .requiredOption('-r, --repository <path>', 'GitHub repository URL or local path')
  .option('-t, --type <type>', 'Diagram type (functional or deployment)', 'functional')
  .option('-f, --format <format>', 'Output format (mermaid, json, svg, png, excalidraw)', 'excalidraw')
  .option('-o, --output <path>', 'Output file path')
  .option('--enable-ai', 'Enable AI enhancement')
  .option('--ai-type <type>', 'AI model type (aliyun, baidu, gpt, claude)', process.env.AI_TYPE)
  .option('--ai-api-key <key>', 'AI API key', process.env.AI_API_KEY)
  .option('--ai-api-secret <secret>', 'AI API secret (for Baidu)', process.env.AI_API_SECRET)
  .option('--include-tests', 'Include test files')
  .option('--include-node-modules', 'Include node_modules')
  .option('--max-depth <number>', 'Maximum directory depth', '3')
  .action(async (options) => {
    try {
      const generatorOptions: GeneratorOptions = {
        type: options.type,
        token: process.env.GITHUB_TOKEN,
        enableAI: options.enableAi,
        aiConfig: options.enableAi ? {
          type: options.aiType,
          apiKey: options.aiApiKey,
          apiSecret: options.aiApiSecret
        } : undefined,
        includeTests: options.includeTests,
        includeNodeModules: options.includeNodeModules,
        maxDepth: parseInt(options.maxDepth, 10)
      };

      // Validate AI configuration
      if (generatorOptions.enableAI) {
        console.log(`AI Model Type: ${generatorOptions.aiConfig?.type}`);
        if (!generatorOptions.aiConfig?.apiKey) {
          console.warn('Warning: AI API key is not provided. AI enhancement will be disabled.');
          generatorOptions.enableAI = false;
        }
      }

      const generator = new ArchitectureGenerator(generatorOptions);
      const diagram = await generator.generate(options.repository);
      
      // Handle output
      if (options.output) {
        await generator.exportDiagram(diagram, {
          format: options.format,
          outputPath: options.output
        });
        console.log(`Diagram exported to ${options.output}`);
      } else {
        console.log(JSON.stringify(diagram, null, 2));
      }
    } catch (error) {
      console.error('Error generating diagram:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize configuration file')
  .action(() => {
    try {
      const configPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(configPath)) {
        console.log('Configuration file already exists');
        return;
      }

      const config = `# GitHub Configuration
GITHUB_TOKEN=your_github_token_here

# AI Configuration
AI_TYPE=aliyun
AI_API_KEY=your_aliyun_api_key_here

# Application Configuration
NODE_ENV=development
`;

      fs.writeFileSync(configPath, config);
      console.log('Configuration file created at .env');
    } catch (error) {
      console.error('Error creating configuration file:', error);
      process.exit(1);
    }
  });

program.parse(); 