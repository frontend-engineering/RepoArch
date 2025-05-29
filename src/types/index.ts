export interface Node {
  id: string;
  label: string;
  type: 'module' | 'service' | 'component' | 'database' | 'external';
  description?: string;
  metadata?: Record<string, any>;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: 'depends' | 'uses' | 'implements' | 'extends';
  metadata?: Record<string, any>;
}

export interface DiagramMetadata {
  type: 'functional' | 'deployment';
  version: string;
  generatedAt: string;
  repository: string;
  enhanced?: boolean;
  enhancedAt?: string;
  aiModel?: string;
}

export interface Diagram {
  nodes: Node[];
  edges: Edge[];
  metadata: DiagramMetadata;
}

export interface GeneratorOptions {
  token?: string;
  excludePatterns?: string[];
  includePatterns?: string[];
  customStyles?: {
    nodeColor?: string;
    edgeColor?: string;
    backgroundColor?: string;
  };
  aiModel?: string;
  aiApiKey?: string;
  enableAI?: boolean;
}

export interface ExportOptions {
  format: 'json' | 'mermaid' | 'svg' | 'png';
  style?: {
    theme?: 'default' | 'dark' | 'light';
    customCss?: string;
  };
}

export interface GitHubConfig {
  token: string;
  aiModel: string;
  aiApiKey: string;
  enableAI: boolean;
  diagramTypes: ('functional' | 'deployment')[];
  outputFormats: ('json' | 'mermaid' | 'svg' | 'png')[];
  excludePatterns: string[];
  customStyles: {
    nodeColor: string;
    edgeColor: string;
    backgroundColor: string;
  };
} 