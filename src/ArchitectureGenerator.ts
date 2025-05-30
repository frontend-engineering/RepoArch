import { Octokit } from '@octokit/rest';
import { Diagram, GeneratorOptions, ExportOptions, Node, Edge, NodeType, EdgeType, DiagramMetadata, Interface, Class, Function, Method, Property, Parameter, Dependency } from './types/index.js';
import { MermaidRenderer } from './renderers/MermaidRenderer.js';
import { JsonRenderer } from './renderers/JsonRenderer.js';
import { SvgRenderer } from './renderers/SvgRenderer.js';
import { PngRenderer } from './renderers/PngRenderer.js';
import { ExcalidrawRenderer } from './renderers/ExcalidrawRenderer.js';
import * as fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AIService } from './services/AIService.js';
import { existsSync, lstatSync } from 'fs';
import { resolve } from 'path';
import { promises as fsPromises } from 'fs';

interface GitHubFile {
  type: 'file' | 'dir' | 'submodule' | 'symlink';
  path: string;
  name: string;
  size: number;
  sha: string;
  url: string;
  git_url: string | null;
  html_url: string | null;
  download_url: string | null;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export class ArchitectureGenerator {
  private octokit: Octokit | null = null;
  private options: GeneratorOptions;
  private aiService?: AIService;
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private metadata: DiagramMetadata = {};

  constructor(options: GeneratorOptions = { type: 'functional' }) {
    this.options = options;
    if (options.token) {
      this.octokit = new Octokit({ auth: options.token });
    }
    if (options.enableAI && options.aiConfig) {
      this.aiService = new AIService(options.aiConfig);
    }
  }

  async generate(repo: string, type: 'functional' | 'deployment' = 'functional'): Promise<Diagram> {
    const isLocalRepo = this.isLocalRepository(repo);
    console.log('isLocal: ', isLocalRepo);
    let diagram: Diagram;

    if (isLocalRepo) {
      diagram = await this.generateFromLocal(repo, type);
    } else {
      if (!this.octokit) {
        throw new Error('GitHub token is required for remote repositories');
      }
      diagram = await this.generateFromGitHub(repo, 'main', type);
    }

    if (this.aiService) {
      try {
        const enhancedDiagram = await this.aiService.enhanceDiagram(diagram, type);
        return enhancedDiagram;
      } catch (error) {
        console.warn('AI enhancement failed:', error);
        return diagram;
      }
    }

    return diagram;
  }

  /**
   * Generate functional architecture diagram for a repository
   */
  async generateFunctionalArchitecture(repo: string): Promise<Diagram> {
    return this.generate(repo, 'functional');
  }

  /**
   * Generate deployment architecture diagram for a repository
   */
  async generateDeploymentArchitecture(repo: string): Promise<Diagram> {
    return this.generate(repo, 'deployment');
  }

  /**
   * Export diagram to specified format
   */
  async exportDiagram(diagram: Diagram, options: ExportOptions): Promise<string> {
    let content: string;
    
    switch (options.format) {
      case 'json':
        content = await new JsonRenderer().render(diagram);
        break;
      case 'mermaid':
        content = await new MermaidRenderer().render(diagram);
        break;
      case 'svg':
        content = await new SvgRenderer().render(diagram);
        break;
      case 'png':
        content = await new PngRenderer().render(diagram);
        break;
      case 'excalidraw':
      default:
        console.log('render excalidraw...', diagram);
        const excalidrawElements = new ExcalidrawRenderer().render(diagram);
        content = JSON.stringify({ 
          type: 'excalidraw', 
          version: 2, 
          source: 'https://excalidraw.com', 
          elements: excalidrawElements 
        }, null, 2);
        break;
    }

    // 如果指定了输出路径，则写入文件
    if (options.outputPath) {
      try {
        // 确保输出目录存在
        const outputDir = path.dirname(options.outputPath);
        await fsPromises.mkdir(outputDir, { recursive: true });
        
        // 写入文件
        await fsPromises.writeFile(options.outputPath, content, 'utf8');
        console.log(`Diagram exported to: ${options.outputPath}`);
      } catch (err) {
        const error = err as Error;
        console.error('Error writing diagram to file:', error);
        throw new Error(`Failed to write diagram to ${options.outputPath}: ${error.message}`);
      }
    }

    return content;
  }

  private isLocalRepository(repo: string | undefined): boolean {
    try {
      if (typeof repo !== 'string' || !repo.trim()) {
        console.error('Invalid repo path:', repo);
        return false;
      }
      
      const resolvedPath = resolve(repo);
      console.log('Resolved Path: ', resolvedPath);
      
      if (!existsSync(resolvedPath)) {
        return false;
      }
      
      const stats = lstatSync(resolvedPath);
      
      return stats.isDirectory() || 
          (stats.isSymbolicLink() && 
              existsSync(resolvedPath) && 
              lstatSync(resolvedPath).isDirectory());
    } catch (err) {
      console.error('Error checking path:', err);
      return false;
    }
  }

  private async generateFromLocal(repo: string, type: 'functional' | 'deployment'): Promise<Diagram> {
    const absolutePath = path.resolve(process.cwd(), repo);
    const files = await this.processLocalFiles(absolutePath);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const processedFiles = new Set<string>();

    for (const file of files) {
      if (this.shouldProcessFile(file)) {
        await this.processLocalFile(file, absolutePath, nodes, edges, processedFiles);
      }
    }

    const diagram = {
      nodes,
      edges,
      metadata: {
        type,
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        repository: absolutePath
      }
    };

    if (this.aiService) {
      try {
        const enhancedDiagram = await this.aiService.enhanceDiagram(diagram, type);
        return enhancedDiagram;
      } catch (error) {
        console.warn('AI enhancement failed:', error);
        return diagram;
      }
    }

    return diagram;
  }

  private async generateFromGitHub(repo: string, branch: string = 'main', type: 'functional' | 'deployment'): Promise<Diagram> {
    if (!this.octokit) {
      throw new Error('GitHub token is required for remote repositories');
    }

    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      throw new Error('Invalid repository format. Use owner/repo');
    }

    const { data: files } = await this.octokit.repos.getContent({
      owner,
      repo: repoName,
      ref: branch,
      path: '',
    });

    if (!Array.isArray(files)) {
      throw new Error('Unexpected response from GitHub API');
    }

    const diagram = await this.processFiles(files as GitHubFile[], owner, repoName, branch, type);
    
    if (this.aiService) {
      try {
        const enhancedDiagram = await this.aiService.enhanceDiagram(diagram, type);
        return enhancedDiagram;
      } catch (error) {
        console.warn('AI enhancement failed:', error);
        return diagram;
      }
    }

    return diagram;
  }

  private async enhanceDiagramWithAI(diagram: Diagram, type: 'functional' | 'deployment'): Promise<Diagram> {
    // TODO: Implement AI model integration
    // This is a placeholder for the AI enhancement logic
    // You would typically:
    // 1. Convert the diagram to a format suitable for the AI model
    // 2. Send it to the AI model with appropriate prompts
    // 3. Process the AI response and update the diagram
    // 4. Return the enhanced diagram

    // For now, we'll just return the original diagram
    return diagram;
  }

  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      if (fs.statSync(fullPath).isDirectory()) {
        files.push(...this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private shouldExclude(path: string): boolean {
    if (!this.options.excludePatterns) return false;
    return this.options.excludePatterns.some(pattern => 
      new RegExp(pattern).test(path)
    );
  }

  private determineNodeType(filePath: string): NodeType {
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath, ext);

    if (fileName.includes('service')) return 'service';
    if (fileName.includes('controller')) return 'controller';
    if (fileName.includes('repository')) return 'repository';
    if (fileName.includes('model')) return 'model';
    if (fileName.includes('util')) return 'util';
    if (fileName.includes('config')) return 'config';
    if (fileName.includes('domain')) return 'domain';
    if (fileName.includes('external')) return 'external';
    if (fileName.includes('database')) return 'database';
    if (fileName.includes('component')) return 'component';
    if (fileName.includes('module')) return 'module';
    if (fileName.includes('interface')) return 'interface';
    if (fileName.includes('class')) return 'class';

    return 'service';
  }

  private async extractDependencies(owner: string, repo: string, path: string): Promise<string[]> {
    console.log('Extracting dependencies from', owner, repo, path);
    if (!this.octokit) {
      throw new Error('GitHub token is required for remote repositories');
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString();
        return this.extractDependenciesFromContent(content);
      }
    } catch (error) {
      console.warn(`Error extracting dependencies from ${path}:`, error);
    }

    return [];
  }

  private extractDependenciesFromContent(content: string): string[] {
    const dependencies: string[] = [];
    const lines = content.split('\n');

    // Match import statements
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    const includeRegex = /#include\s+['"]([^'"]+)['"]/g;

    for (const line of lines) {
      // Match ES6 imports
      let match;
      while ((match = importRegex.exec(line)) !== null) {
        dependencies.push(match[1]);
      }

      // Match CommonJS requires
      while ((match = requireRegex.exec(line)) !== null) {
        dependencies.push(match[1]);
      }

      // Match C/C++ includes
      while ((match = includeRegex.exec(line)) !== null) {
        dependencies.push(match[1]);
      }
    }

    return dependencies;
  }

  private getLocalFiles(dirPath: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.relative(dirPath, fullPath);

      if (this.shouldProcessFile(relativePath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...this.getLocalFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private async processFiles(files: GitHubFile[], owner: string, repo: string, branch: string, type: 'functional' | 'deployment'): Promise<Diagram> {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const processedFiles = new Set<string>();

    for (const file of files) {
      if (this.shouldProcessFile(file.path)) {
        await this.processFile(file, owner, repo, branch, nodes, edges, processedFiles);
      }
    }

    return {
      nodes,
      edges,
      metadata: {
        version: '1.0.0',
      }
    };
  }

  private async processLocalFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.relative(dirPath, fullPath);

      if (this.shouldProcessFile(relativePath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...this.getLocalFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private shouldProcessFile(path: string): boolean {
    const excludePatterns = this.options.excludePatterns || ['node_modules', 'dist', '.git'];
    return !excludePatterns.some(pattern => path.includes(pattern));
  }

  private async processFile(file: GitHubFile, owner: string, repo: string, branch: string, nodes: Node[], edges: Edge[], processedFiles: Set<string>): Promise<void> {
    if (processedFiles.has(file.path)) return;
    processedFiles.add(file.path);

    if (file.type === 'file') {
      const nodeType = this.determineNodeType(file.path);
      const node: Node = {
        id: file.path,
        label: file.name,
        type: nodeType,
        metadata: {
          path: file.path,
          sha: file.sha,
          size: file.size
        }
      };
      nodes.push(node);

      // Extract dependencies
      const dependencies = await this.extractDependencies(owner, repo, file.path);
      for (const dep of dependencies) {
        const edge: Edge = {
          id: `${file.path}->${dep}`,
          source: file.path,
          target: dep,
          type: 'depends',
          label: 'depends',
          metadata: {
            sourcePath: file.path,
            targetPath: dep
          }
        };
        edges.push(edge);
      }
    }
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  private getNodeId(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private getNodeType(path: string): 'module' | 'service' | 'component' | 'database' | 'external' {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return 'module';
      case 'json':
        return 'database';
      case 'md':
        return 'external';
      default:
        return 'module';
    }
  }

  private resolveImportPath(importPath: string, currentDir: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const resolvedPath = path.resolve(currentDir, importPath);
      const ext = path.extname(resolvedPath);
      if (!ext) {
        // Try common extensions
        for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
          const pathWithExt = `${resolvedPath}${ext}`;
          if (fs.existsSync(pathWithExt)) {
            return pathWithExt;
          }
        }
      }
      return resolvedPath;
    }
    // Handle package imports
    return null;
  }

  private async processLocalFile(
    filePath: string,
    basePath: string,
    nodes: Node[],
    edges: Edge[],
    processedFiles: Set<string>
  ): Promise<void> {
    const relativePath = path.relative(basePath, filePath);
    if (processedFiles.has(relativePath)) {
      return;
    }

    processedFiles.add(relativePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 分析代码内容
    const analysis = await this.analyzeCodeContent(content, filePath);
    
    // 添加模块节点
    const moduleNode: Node = {
      id: this.getNodeId(relativePath),
      label: analysis.moduleName || path.basename(relativePath),
      type: this.determineModuleType(analysis),
      metadata: {
        path: relativePath,
        size: fs.statSync(filePath).size,
        lastModified: fs.statSync(filePath).mtime.toISOString(),
        interfaces: analysis.interfaces,
        classes: analysis.classes,
        functions: analysis.functions,
        designPatterns: analysis.designPatterns
      }
    };
    nodes.push(moduleNode);

    // 添加接口和类节点
    for (const interface_ of analysis.interfaces) {
      const interfaceNode: Node = {
        id: this.getNodeId(`${relativePath}#${interface_.name}`),
        label: interface_.name,
        type: 'interface',
        metadata: {
          methods: interface_.methods,
          properties: interface_.properties,
          extends: interface_.extends,
          implements: interface_.implements
        }
      };
      nodes.push(interfaceNode);
      edges.push({
        id: `${moduleNode.id}-${interfaceNode.id}`,
        source: moduleNode.id,
        target: interfaceNode.id,
        type: 'contains',
        label: 'defines'
      });
    }

    for (const class_ of analysis.classes) {
      const classNode: Node = {
        id: this.getNodeId(`${relativePath}#${class_.name}`),
        label: class_.name,
        type: 'class',
        metadata: {
          path: filePath,
          methods: class_.methods,
          properties: class_.properties,
          classes: [class_],
          designPatterns: class_.designPatterns,
          extends: class_.extends ? [class_.extends] : [],
          implements: class_.implements
        }
      };
      nodes.push(classNode);
      edges.push({
        id: `${moduleNode.id}-${classNode.id}`,
        source: moduleNode.id,
        target: classNode.id,
        type: 'contains',
        label: 'defines'
      });

      // 添加继承关系
      if (class_.extends) {
        edges.push({
          id: `${classNode.id}-extends-${this.getNodeId(class_.extends)}`,
          source: classNode.id,
          target: this.getNodeId(class_.extends),
          type: 'extends',
          label: 'extends'
        });
      }

      // 添加实现关系
      for (const interface_ of class_.implements) {
        edges.push({
          id: `${classNode.id}-implements-${this.getNodeId(interface_)}`,
          source: classNode.id,
          target: this.getNodeId(interface_),
          type: 'implements',
          label: 'implements'
        });
      }
    }

    // 添加函数节点
    for (const func of analysis.functions) {
      const functionNode = {
        id: this.getNodeId(`${relativePath}#${func.name}`),
        label: func.name,
        type: 'function' as NodeType,
        metadata: {
          parameters: func.parameters,
          returnType: func.returnType,
          isAsync: func.isAsync,
          isExported: func.isExported
        }
      };
      nodes.push(functionNode);
      edges.push({
        id: `${moduleNode.id}-${functionNode.id}`,
        source: moduleNode.id,
        target: functionNode.id,
        type: 'contains' as EdgeType,
        label: 'defines'
      });
    }

    // 添加依赖关系
    for (const dep of analysis.dependencies) {
      const targetPath = this.resolveImportPath(dep.path, path.dirname(relativePath));
      if (targetPath && !processedFiles.has(targetPath)) {
        const targetId = this.getNodeId(targetPath);
        edges.push({
          id: `${moduleNode.id}-${targetId}`,
          source: moduleNode.id,
          target: targetId,
          type: 'depends' as EdgeType,
          label: dep.type,
          metadata: {
            type: dep.type,
            source: dep.path
          }
        });
      }
    }
  }

  private async analyzeCodeContent(content: string, filePath: string): Promise<CodeAnalysis> {
    const analysis: CodeAnalysis = {
      moduleName: this.extractModuleName(content),
      interfaces: this.extractInterfaces(content),
      classes: this.extractClasses(content),
      functions: this.extractFunctions(content),
      dependencies: this.extractDependenciesFromContent(content).map(path => ({
        path,
        type: this.determineDependencyType(path)
      })),
      designPatterns: this.identifyDesignPatterns(content)
    };
    return analysis;
  }

  private extractModuleName(content: string): string | null {
    // 尝试从 export default 或 module.exports 中提取模块名
    const defaultExportMatch = content.match(/export\s+default\s+class\s+(\w+)/);
    if (defaultExportMatch) return defaultExportMatch[1];
    
    const moduleExportsMatch = content.match(/module\.exports\s*=\s*(\w+)/);
    if (moduleExportsMatch) return moduleExportsMatch[1];
    
    return null;
  }

  private extractInterfaces(content: string): Interface[] {
    const interfaces: Interface[] = [];
    const interfaceRegex = /interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*{([^}]*)}/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const [_, name, extends_, body] = match;
      const interface_: Interface = {
        name,
        extends: extends_ ? extends_.split(',').map(e => e.trim()) : [],
        implements: [],
        methods: this.extractMethods(body),
        properties: this.extractProperties(body)
      };
      interfaces.push(interface_);
    }

    return interfaces;
  }

  private extractClasses(content: string): Class[] {
    const classes: Class[] = [];
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*{([^}]*)}/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const [_, name, extends_, implements_, body] = match;
      const class_: Class = {
        name,
        extends: extends_ || null,
        implements: implements_ ? implements_.split(',').map(i => i.trim()) : [],
        methods: this.extractMethods(body),
        properties: this.extractProperties(body),
        designPatterns: []
      };
      classes.push(class_);
    }

    return classes;
  }

  private extractFunctions(content: string): Function[] {
    const functions: Function[] = [];
    const functionRegex = /(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*{/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const [_, name1, name2] = match;
      const name = name1 || name2;
      const func: Function = {
        name,
        parameters: this.extractParameters(match[0]),
        returnType: 'any',
        isAsync: match[0].includes('async'),
        isExported: match[0].includes('export')
      };
      functions.push(func);
    }

    return functions;
  }

  private extractMethods(body: string): Method[] {
    const methods: Method[] = [];
    const methodRegex = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*{/g;
    let match;

    while ((match = methodRegex.exec(body)) !== null) {
      const [_, name, params, returnType] = match;
      const method: Method = {
        name,
        parameters: this.extractParameters(params),
        returnType: returnType?.trim() || 'void',
        visibility: match[0].includes('private') ? 'private' : match[0].includes('protected') ? 'protected' : 'public',
        isAsync: match[0].includes('async') || false
      };
      methods.push(method);
    }

    return methods;
  }

  private extractProperties(body: string): Property[] {
    const properties: Property[] = [];
    const propertyRegex = /(?:public|private|protected)?\s*(\w+)(?:\s*:\s*([^;]+))?;/g;
    let match;

    while ((match = propertyRegex.exec(body)) !== null) {
      const [_, name, type] = match;
      const property: Property = {
        name,
        type: type?.trim() || 'any',
        visibility: match[0].includes('private') ? 'private' : match[0].includes('protected') ? 'protected' : 'public'
      };
      properties.push(property);
    }

    return properties;
  }

  private extractParameters(paramString: string): Parameter[] {
    return paramString.split(',')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        const [name, type] = p.split(':').map(s => s.trim());
        return {
          name,
          type: type || 'any'
        };
      });
  }

  private determineModuleType(analysis: CodeAnalysis): 'module' | 'service' | 'component' | 'database' | 'external' {
    // 根据代码分析结果确定模块类型
    if (analysis.classes.some(c => c.designPatterns.includes('singleton') || c.designPatterns.includes('factory'))) {
      return 'service';
    }
    if (analysis.classes.some(c => c.designPatterns.includes('observer') || c.designPatterns.includes('component'))) {
      return 'component';
    }
    if (analysis.classes.some(c => c.name.toLowerCase().includes('database') || c.name.toLowerCase().includes('db'))) {
      return 'database';
    }
    return 'module';
  }

  private determineDependencyType(path: string): 'import' | 'require' | 'include' {
    // 根据依赖路径特征确定依赖类型
    if (path.startsWith('.')) return 'import';
    if (path.startsWith('@')) return 'import';
    return 'require';
  }

  private identifyDesignPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // 单例模式
    if (content.includes('private static instance') || content.includes('getInstance()')) {
      patterns.push('singleton');
    }
    
    // 工厂模式
    if (content.includes('create') && content.includes('Factory')) {
      patterns.push('factory');
    }
    
    // 观察者模式
    if (content.includes('subscribe') && content.includes('notify')) {
      patterns.push('observer');
    }
    
    // 策略模式
    if (content.includes('strategy') || content.includes('algorithm')) {
      patterns.push('strategy');
    }
    
    // 装饰器模式
    if (content.includes('@') && content.includes('decorator')) {
      patterns.push('decorator');
    }
    
    return patterns;
  }

  private identifyClassDesignPattern(content: string): string | null {
    const patterns = this.identifyDesignPatterns(content);
    return patterns[0] || null;
  }

  private createNodeFromFile(file: any): Node {
    return {
      id: file.path,
      label: path.basename(file.path),
      type: this.determineNodeType(file.path),
      metadata: {
        path: file.path,
        size: file.size,
        lastModified: file.lastModified,
        sha: file.sha
      }
    };
  }

  private createNodeFromAnalysis(analysis: {
    moduleName: string | null;
    interfaces: Interface[];
    classes: Class[];
    functions: Function[];
    dependencies: Dependency[];
    designPatterns: string[];
  }, filePath: string): Node {
    const node: Node = {
      id: filePath,
      label: path.basename(filePath),
      type: this.determineNodeType(filePath),
      metadata: {
        path: filePath,
        interfaces: analysis.interfaces,
        classes: analysis.classes,
        functions: analysis.functions,
        designPatterns: analysis.designPatterns || []
      }
    };

    // Add interface nodes
    analysis.interfaces?.forEach((interface_: Interface) => {
      const interfaceNode: Node = {
        id: `${filePath}#${interface_.name}`,
        label: interface_.name,
        type: 'interface',
        metadata: {
          path: filePath,
          methods: interface_.methods,
          properties: interface_.properties,
          interfaces: [interface_],
          extends: interface_.extends,
          implements: interface_.implements
        }
      };
      this.nodes.push(interfaceNode);
    });

    // Add class nodes
    analysis.classes?.forEach((class_: Class) => {
      const classNode: Node = {
        id: `${filePath}#${class_.name}`,
        label: class_.name,
        type: 'class',
        metadata: {
          path: filePath,
          methods: class_.methods,
          properties: class_.properties,
          classes: [class_],
          designPatterns: class_.designPatterns,
          extends: class_.extends ? [class_.extends] : [],
          implements: class_.implements
        }
      };
      this.nodes.push(classNode);
    });

    // Add function nodes
    analysis.functions?.forEach((func: Function) => {
      const functionNode: Node = {
        id: `${filePath}#${func.name}`,
        label: func.name,
        type: 'util',
        metadata: {
          path: filePath,
          parameters: func.parameters,
          returnType: func.returnType,
          isAsync: func.isAsync,
          isExported: func.isExported,
          functions: [func]
        }
      };
      this.nodes.push(functionNode);
    });

    return node;
  }
}

interface CodeAnalysis {
  moduleName: string | null;
  interfaces: Interface[];
  classes: Class[];
  functions: Function[];
  dependencies: Dependency[];
  designPatterns: string[];
} 