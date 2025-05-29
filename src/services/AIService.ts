import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { Diagram, Node, Edge } from '../types/index.js';

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private model: string;
  private apiKey: string;

  constructor(model: string, apiKey: string) {
    this.model = model;
    this.apiKey = apiKey;

    if (model.startsWith('gpt')) {
      this.openai = new OpenAI({ apiKey });
    } else if (model.startsWith('claude')) {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      throw new Error(`Unsupported AI model: ${model}`);
    }
  }

  async enhanceDiagram(diagram: Diagram, type: 'functional' | 'deployment'): Promise<Diagram> {
    const prompt = this.generatePrompt(diagram, type);
    let enhancedDiagram: Diagram;

    try {
      if (this.model.startsWith('gpt')) {
        enhancedDiagram = await this.enhanceWithGPT(prompt);
      } else if (this.model.startsWith('claude')) {
        enhancedDiagram = await this.enhanceWithClaude(prompt);
      } else {
        throw new Error(`Unsupported AI model: ${this.model}`);
      }

      // Merge the enhanced diagram with the original
      return this.mergeDiagrams(diagram, enhancedDiagram);
    } catch (error) {
      console.error('Error enhancing diagram with AI:', error);
      return diagram; // Return original diagram if enhancement fails
    }
  }

  private generatePrompt(diagram: Diagram, type: 'functional' | 'deployment'): string {
    const diagramJson = JSON.stringify(diagram, null, 2);
    return `You are an expert software architect. Analyze the following ${type} architecture diagram and enhance it by:
1. Identifying missing components and relationships
2. Suggesting better component organization
3. Adding descriptive labels and documentation
4. Optimizing the visual layout
5. Identifying potential architectural improvements

Current diagram:
${diagramJson}

Please provide an enhanced version of this diagram in the same JSON format, with the following improvements:
1. Add missing components that should logically exist
2. Add missing relationships between components
3. Improve component names and descriptions
4. Add metadata about component responsibilities
5. Suggest architectural patterns and best practices

Return only the enhanced JSON diagram, maintaining the same structure but with improved content.`;
  }

  private async enhanceWithGPT(prompt: string): Promise<Diagram> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an expert software architect.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT model');
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing GPT response:', error);
      throw new Error('Invalid response format from GPT model');
    }
  }

  private async enhanceWithClaude(prompt: string): Promise<Diagram> {
    if (!this.anthropic) throw new Error('Anthropic not initialized');
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Claude v3 SDK returns content as array of ContentBlock, which may be text or tool_use
    const contentBlock = response.content.find((block: any) => typeof (block as any).text === 'string');
    const content = (contentBlock as any)?.text;
    if (!content) {
      throw new Error('No response from Claude model');
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      throw new Error('Invalid response format from Claude model');
    }
  }

  private mergeDiagrams(original: Diagram, enhanced: Diagram): Diagram {
    // Create a map of existing nodes by ID
    const nodeMap = new Map(original.nodes.map(node => [node.id, node]));
    const edgeMap = new Map(original.edges.map(edge => [edge.id, edge]));

    // Add new nodes from enhanced diagram
    enhanced.nodes.forEach(node => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      } else {
        // Merge metadata if node exists
        const existingNode = nodeMap.get(node.id)!;
        nodeMap.set(node.id, {
          ...existingNode,
          description: (node as any).description || (existingNode as any).description,
          metadata: { ...((existingNode as any).metadata || {}), ...((node as any).metadata || {}) }
        });
      }
    });

    // Add new edges from enhanced diagram
    enhanced.edges.forEach(edge => {
      if (!edgeMap.has(edge.id)) {
        edgeMap.set(edge.id, edge);
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
      metadata: {
        ...original.metadata,
        enhanced: true,
        enhancedAt: new Date().toISOString(),
        aiModel: this.model
      }
    };
  }
} 