import { Octokit } from '@octokit/rest';

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepositoryContent(owner: string, repo: string, path: string = "") {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching repository content:", error);
      throw error;
    }
  }

  async analyzeRepositoryStructure(owner: string, repo: string) {
    // 分析仓库结构，识别主要组件和依赖关系
    const rootContent = await this.getRepositoryContent(owner, repo);
    
    // 实现代码分析逻辑，识别项目类型、主要组件等
    // 这里只是一个示例，实际实现会更复杂
    const components = this.identifyComponents(rootContent as any[]);
    const dependencies = this.identifyDependencies(owner, repo);
    
    return { components, dependencies };
  }

  private identifyComponents(content: any[]) {
    // 识别项目组件的逻辑
    return content
      .filter(item => item.type === "dir")
      .map(dir => ({ name: dir.name, type: "module" }));
  }

  private async identifyDependencies(owner: string, repo: string) {
    // 识别项目依赖的逻辑
    const packageJsonContent = await this.getRepositoryContent(
      owner, 
      repo, 
      "package.json"
    );
    
    if (packageJsonContent && "content" in packageJsonContent) {
      const content = Buffer.from(
        packageJsonContent.content, 
        "base64"
      ).toString();
      const packageJson = JSON.parse(content);
      return packageJson.dependencies || {};
    }
    
    return {};
  }
}    