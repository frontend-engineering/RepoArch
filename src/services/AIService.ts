import { Diagram, DiagramMetadata, Node, NodeMetadata, Edge, AIModelType, AIConfig } from '../types/index.js';
import { AIInteractionService } from './AIInteractionService.js';

export class AIService {
  private config: AIConfig;
  private aiInteraction: AIInteractionService;

  constructor(config: AIConfig) {
    this.config = config;
    this.aiInteraction = new AIInteractionService(config);
  }

  async enhanceDiagram(diagram: Diagram, type: 'functional' | 'deployment'): Promise<Diagram> {
    console.log(`[AI Service] Starting diagram enhancement with ${this.config.type} model...`);
    console.log(`[AI Service] Diagram type: ${type}`);
    console.log(`[AI Service] Original diagram nodes: ${diagram.nodes.length}, edges: ${diagram.edges.length}`);

    try {
      const startTime = Date.now();

      // 准备仓库信息
      const repoInfo = {
        name: diagram.metadata?.name || 'Unknown Repository',
        description: diagram.metadata?.description || '',
        language: diagram.metadata?.language || 'TypeScript',
        stars: diagram.metadata?.stars || 0,
        forks: diagram.metadata?.forks || 0,
        lastUpdated: diagram.metadata?.lastUpdated || new Date().toISOString(),
        license: diagram.metadata?.license || 'Unknown'
      };

      // 调用 AI 分析
      const response = await this.aiInteraction.analyzeArchitecture(
        repoInfo,
        diagram,
        `分析类型: ${type === 'functional' ? '功能架构' : '部署架构'}`
      );

      // 解析响应
      console.log('[AI Service] Parsing AI response...');
      const enhancedDiagram = this.parseAIResponse(response.content);

      const endTime = Date.now();
      console.log(`[AI Service] Enhancement completed in ${(endTime - startTime) / 1000}s`);
      console.log(`[AI Service] Enhanced diagram nodes: ${enhancedDiagram.nodes.length}, edges: ${enhancedDiagram.edges.length}`);

      return this.mergeDiagrams(diagram, enhancedDiagram);
    } catch (error) {
      console.error('[AI Service] Enhancement failed:', error);
      console.log('[AI Service] Returning original diagram due to enhancement failure');
      return diagram;
    }
  }

  private parseAIResponse(content: string): Diagram {
    try {
      // 尝试提取 JSON 内容
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/{[\s\S]*}/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      console.log('[AI Service] Extracted JSON:', jsonStr);
      
      const parsedData = JSON.parse(jsonStr);
      return this.validateDiagramFormat(parsedData);
    } catch (error) {
      console.error('[AI Service] Error parsing AI response:', error);
      throw new Error('Failed to parse JSON from response');
    }
  }

  private validateDiagramFormat(data: any): Diagram {
    console.log('[AI Service] Validating diagram format...');
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid diagram format: data is not an object');
    }

    if (!Array.isArray(data.nodes)) {
      throw new Error('Invalid diagram format: nodes is not an array');
    }

    if (!Array.isArray(data.edges)) {
      throw new Error('Invalid diagram format: edges is not an array');
    }

    // 验证节点格式
    for (const node of data.nodes) {
      if (!node.id || !node.label || !node.type) {
        throw new Error('Invalid node format: missing required fields');
      }
    }

    // 验证边格式
    for (const edge of data.edges) {
      if (!edge.id || !edge.source || !edge.target || !edge.type) {
        throw new Error('Invalid edge format: missing required fields');
      }
    }

    console.log('[AI Service] Diagram format validation passed');
    return data as Diagram;
  }

  private mergeDiagrams(original: Diagram, enhanced: Diagram): Diagram {
    console.log('[AI Service] Merging original and enhanced diagrams...');
    
    // 合并节点
    const mergedNodes = [...original.nodes];
    const existingNodeIds = new Set(original.nodes.map(n => n.id));
    
    for (const node of enhanced.nodes) {
      if (!existingNodeIds.has(node.id)) {
        mergedNodes.push(node);
      }
    }

    // 合并边
    const mergedEdges = [...original.edges];
    const existingEdgeIds = new Set(original.edges.map(e => e.id));
    
    for (const edge of enhanced.edges) {
      if (!existingEdgeIds.has(edge.id)) {
        mergedEdges.push(edge);
      }
    }

    console.log('[AI Service] Diagram merge completed');
    return {
      nodes: mergedNodes,
      edges: mergedEdges,
      metadata: {
        ...original.metadata,
        enhanced: true,
        enhancedAt: new Date().toISOString(),
        aiModel: this.config.type
      }
    };
  }
} 