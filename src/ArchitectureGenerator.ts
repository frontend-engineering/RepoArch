import { Octokit } from '@octokit/rest';
import { Diagram, GeneratorOptions, ExportOptions, Node, Edge } from './types/index.js';
import { MermaidRenderer } from './renderers/MermaidRenderer.js';
import { JsonRenderer } from './renderers/JsonRenderer.js';
import { SvgRenderer } from './renderers/SvgRenderer.js';
import { PngRenderer } from './renderers/PngRenderer.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { AIService } from './services/AIService.js';
import { existsSync, lstatSync } from 'fs';
import { resolve } from 'path';

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

  constructor(options: GeneratorOptions = {}) {
    this.options = options;
    if (options.token) {
      this.octokit = new Octokit({ auth: options.token });
    }
    if (options.enableAI && options.aiModel && options.aiApiKey) {
      this.aiService = new AIService(options.aiModel, options.aiApiKey);
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
    switch (options.format) {
      case 'json':
        return new JsonRenderer().render(diagram);
      case 'mermaid':
        return new MermaidRenderer().render(diagram);
      case 'svg':
        return new SvgRenderer().render(diagram);
      case 'png':
        return new PngRenderer().render(diagram);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

//   private isLocalRepository(repo: string): boolean {
//     try {
//       const absolutePath = path.resolve(process.cwd(), repo);
//       console.log('absolutePath: ', absolutePath);
//       const stats = fs.statSync(absolutePath);
//       return stats.isDirectory();
//     } catch(err) {
//         console.error('is local catch: ', err);
//       return false;
//     }
//   }
    private isLocalRepository(repo: string | undefined): boolean {
        try {
            // 增加参数类型检查
            if (typeof repo !== 'string' || !repo.trim()) {
                console.error('Invalid repo path:', repo);
                return false;
            }
            
            // 直接检查路径是否存在，不依赖错误处理
            const resolvedPath = resolve(repo);
            console.log('Resolved Path: ', resolvedPath);
            
            // 检查路径是否存在
            if (!existsSync(resolvedPath)) {
                return false;
            }
            
            // 获取路径状态（支持符号链接）
            const stats = lstatSync(resolvedPath);
            
            // 检查是否为目录或符号链接到目录
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
    const nodes: Diagram['nodes'] = [];
    const edges: Diagram['edges'] = [];
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

  private determineNodeType(path: string, type: string): Node['type'] {
    const ext = path.split('.').pop()?.toLowerCase();
    
    if (type === 'deployment') {
      if (path.includes('docker') || path.includes('container')) return 'service';
      if (path.includes('database') || path.includes('db')) return 'database';
      if (path.includes('api') || path.includes('service')) return 'service';
      if (path.includes('client') || path.includes('frontend')) return 'component';
      if (path.includes('external') || path.includes('third-party')) return 'external';
      return 'service';
    }

    // Functional architecture
    if (ext === 'ts' || ext === 'js' || ext === 'tsx' || ext === 'jsx') {
      if (path.includes('service') || path.includes('api')) return 'service';
      if (path.includes('component') || path.includes('ui')) return 'component';
      if (path.includes('database') || path.includes('db')) return 'database';
      if (path.includes('external') || path.includes('third-party')) return 'external';
      return 'module';
    }

    if (ext === 'json' || ext === 'yaml' || ext === 'yml') {
      if (path.includes('config') || path.includes('settings')) return 'module';
      if (path.includes('database') || path.includes('db')) return 'database';
      return 'module';
    }

    if (ext === 'md' || ext === 'txt') return 'module';
    if (ext === 'css' || ext === 'scss' || ext === 'less') return 'component';
    if (ext === 'html') return 'component';
    if (ext === 'sql') return 'database';
    if (ext === 'sh' || ext === 'bash') return 'service';

    return 'module';
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
    const nodes: Diagram['nodes'] = [];
    const edges: Diagram['edges'] = [];
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
        type,
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        repository: `${owner}/${repo}`
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

  private async processFile(file: GitHubFile, owner: string, repo: string, branch: string, nodes: Diagram['nodes'], edges: Diagram['edges'], processedFiles: Set<string>): Promise<void> {
    if (processedFiles.has(file.path)) return;
    processedFiles.add(file.path);

    if (file.type === 'file') {
      const nodeType = this.determineNodeType(file.path, 'functional');
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
    nodes: Diagram['nodes'],
    edges: Diagram['edges'],
    processedFiles: Set<string>
  ): Promise<void> {
    const relativePath = path.relative(basePath, filePath);
    if (processedFiles.has(relativePath)) {
      return;
    }

    processedFiles.add(relativePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = this.extractImports(content);
    const nodeId = this.getNodeId(relativePath);

    nodes.push({
      id: nodeId,
      label: path.basename(relativePath),
      type: this.getNodeType(relativePath),
      metadata: {
        path: relativePath,
        size: fs.statSync(filePath).size,
        lastModified: fs.statSync(filePath).mtime.toISOString()
      }
    });

    for (const imp of imports) {
      const targetPath = this.resolveImportPath(imp, path.dirname(relativePath));
      if (targetPath && !processedFiles.has(targetPath)) {
        const targetId = this.getNodeId(targetPath);
        edges.push({
          id: `${nodeId}-${targetId}`,
          source: nodeId,
          target: targetId,
          type: 'depends',
          label: 'imports',
          metadata: {
            type: 'import',
            source: imp
          }
        });
      }
    }
  }

  private async extractDependenciesFromFile(filePath: string): Promise<string[]> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.extractDependenciesFromContent(content);
    } catch (error) {
      console.warn(`Error extracting dependencies from ${filePath}:`, error);
      return [];
    }
  }
} 