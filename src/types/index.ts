export interface Node {
  id: string;
  label: string;
  type: NodeType;
  metadata: NodeMetadata;
  edges?: Edge[];
}

export type NodeType = 
  | 'service'
  | 'controller'
  | 'repository'
  | 'model'
  | 'util'
  | 'config'
  | 'domain'
  | 'external'
  | 'database'
  | 'component'
  | 'module'
  | 'interface'
  | 'class';

export interface NodeMetadata {
  path?: string;
  size?: number;
  lastModified?: string;
  sha?: string;
  interfaces?: Interface[];
  classes?: Class[];
  functions?: Function[];
  designPatterns?: string[];
  layer?: string;
  dependencies?: Array<{
    type: string;
    source: string;
  }>;
  methods?: Method[];
  parameters?: Parameter[];
  returnType?: string;
  isAsync?: boolean;
  isExported?: boolean;
  properties?: Property[];
  extends?: string[];
  implements?: string[];
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label: string;
  metadata?: EdgeMetadata;
}

export type EdgeType = 
  | 'call'
  | 'dependency'
  | 'inheritance'
  | 'implementation'
  | 'data'
  | 'event'
  | 'depends'
  | 'uses'
  | 'implements'
  | 'extends'
  | 'contains';

export interface EdgeMetadata {
  type?: string;
  source?: string;
  sourcePath?: string;
  targetPath?: string;
}

export interface DiagramMetadata {
  name?: string;
  description?: string;
  language?: string;
  stars?: number;
  forks?: number;
  lastUpdated?: string;
  license?: string;
  enhanced?: boolean;
  enhancedAt?: string;
  aiModel?: AIModelType;
  version?: string;
  analysisMethod?: string;
  analysisSummary?: string;
}

export interface Diagram {
  nodes: Node[];
  edges: Edge[];
  metadata: DiagramMetadata;
}

export type AIModelType = 'aliyun' | 'baidu' | 'gpt' | 'claude';

export interface AIConfig {
  type: AIModelType;
  apiKey: string;
  apiSecret?: string;  // 百度云需要
  endpoint?: string;   // 阿里云需要
}

export interface GeneratorOptions {
  type: 'functional' | 'deployment';
  token?: string;
  enableAI?: boolean;
  aiConfig?: AIConfig;
  includeTests?: boolean;
  includeNodeModules?: boolean;
  maxDepth?: number;
  customStyles?: Record<string, any>;
  excludePatterns?: string[];
}

export interface ExportOptions {
  format: 'mermaid' | 'json' | 'svg' | 'png' | 'excalidraw';
  outputPath?: string;
  customStyles?: Record<string, any>;
}

export interface Interface {
  name: string;
  extends: string[];
  implements: string[];
  methods: Method[];
  properties: Property[];
}

export interface Class {
  name: string;
  extends: string | null;
  implements: string[];
  methods: Method[];
  properties: Property[];
  designPatterns: string[];
}

export interface Function {
  name: string;
  parameters: Parameter[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
}

export interface Method {
  name: string;
  returnType: string;
  parameters: Array<{
    name: string;
    type: string;
  }>;
  visibility: 'public' | 'private' | 'protected';
  isAsync?: boolean;
}

export interface Property {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
}

export interface Parameter {
  name: string;
  type: string;
}

export interface Dependency {
  path: string;
  type: 'import' | 'require' | 'include';
} 