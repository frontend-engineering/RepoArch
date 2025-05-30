import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { AIModelType, AIConfig } from '../types/index.js';
import { ARCHITECTURE_ANALYSIS_PROMPT } from '../prompts/architecture.js';

export interface AIResponse {
  content: string;
  reasoning?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIInteractionService {
  private config: AIConfig;
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private aliyunOpenAI?: OpenAI;
  private readonly TIMEOUT = 300000; // 5 minutes timeout
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(config: AIConfig) {
    this.config = config;
    this.initializeClients();
  }

  private initializeClients() {
    switch (this.config.type) {
      case 'gpt':
        this.openai = new OpenAI({ apiKey: this.config.apiKey });
        break;
      case 'claude':
        this.anthropic = new Anthropic({ apiKey: this.config.apiKey });
        break;
      case 'aliyun':
        this.aliyunOpenAI = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        });
        break;
    }
  }

  async analyzeArchitecture(
    repoInfo: {
      name: string;
      description: string;
      language: string;
      stars: number;
      forks: number;
      lastUpdated: string;
      license: string;
    },
    existingDiagram: any,
    additionalContext?: string
  ): Promise<AIResponse> {
    const prompt = this.generateAnalysisPrompt(repoInfo, existingDiagram, additionalContext);
    console.log('[AI Interaction] Starting architecture analysis...');

    try {
      switch (this.config.type) {
        case 'aliyun':
          return await this.analyzeWithAliyun(prompt);
        case 'gpt':
          return await this.analyzeWithGPT(prompt);
        case 'claude':
          return await this.analyzeWithClaude(prompt);
        default:
          throw new Error(`Unsupported AI model type: ${this.config.type}`);
      }
    } catch (error) {
      console.error('[AI Interaction] Analysis failed:', error);
      throw error;
    }
  }

  private generateAnalysisPrompt(
    repoInfo: {
      name: string;
      description: string;
      language: string;
      stars: number;
      forks: number;
      lastUpdated: string;
      license: string;
    },
    existingDiagram: any,
    additionalContext?: string
  ): string {
    return ARCHITECTURE_ANALYSIS_PROMPT
      .replace('{repoName}', repoInfo.name)
      .replace('{repoDescription}', repoInfo.description)
      .replace('{repoLanguage}', repoInfo.language)
      .replace('{repoStars}', repoInfo.stars.toString())
      .replace('{repoForks}', repoInfo.forks.toString())
      .replace('{repoLastUpdated}', repoInfo.lastUpdated)
      .replace('{repoLicense}', repoInfo.license)
      .replace('{existingDiagram}', JSON.stringify(existingDiagram, null, 2))
      .replace('{additionalContext}', additionalContext || '');
  }

  private async analyzeWithAliyun(prompt: string): Promise<AIResponse> {
    if (!this.aliyunOpenAI) {
      throw new Error('Aliyun client not initialized');
    }

    console.log('[AI Interaction] Sending request to Aliyun API...');
    console.log('\n' + '='.repeat(20) + '思考过程' + '='.repeat(20) + '\n');

    let reasoningContent = '';
    let answerContent = '';
    let isAnswering = false;
    let usage: any = null;

    const stream = await this.aliyunOpenAI.chat.completions.create({
      model: 'deepseek-r1',
      messages: [
        {
          role: 'system',
          content: '你是一位经验丰富的软件架构师，擅长从代码结构和类型定义中提取高质量的架构图。请用中文回答。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    });

    for await (const chunk of stream) {
      if (!chunk.choices?.length) {
        usage = chunk.usage;
        continue;
      }

      const delta = chunk.choices[0].delta as { reasoning_content?: string; content?: string };
      
      if (delta.reasoning_content) {
        process.stdout.write(delta.reasoning_content);
        reasoningContent += delta.reasoning_content;
      } else if (delta.content) {
        if (!isAnswering) {
          console.log('\n' + '='.repeat(20) + '完整回复' + '='.repeat(20) + '\n');
          isAnswering = true;
        }
        process.stdout.write(delta.content);
        answerContent += delta.content;
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    if (!answerContent) {
      throw new Error('No response from Aliyun model');
    }

    return {
      content: answerContent,
      reasoning: reasoningContent,
      usage
    };
  }

  private async analyzeWithGPT(prompt: string): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    console.log('[AI Interaction] Sending request to OpenAI API...');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位经验丰富的软件架构师，擅长从代码结构和类型定义中提取高质量的架构图。请用中文回答。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage
    };
  }

  private async analyzeWithClaude(prompt: string): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    console.log('[AI Interaction] Sending request to Anthropic API...');

    const response = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `你是一位经验丰富的软件架构师，擅长从代码结构和类型定义中提取高质量的架构图。请用中文回答。\n\n${prompt}`
        }
      ]
    });

    return {
      content: response.content[0].text,
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      }
    };
  }
} 