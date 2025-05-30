export const ARCHITECTURE_ANALYSIS_PROMPT = `
你是一位经验丰富的软件架构师，擅长从代码结构和类型定义中提取高质量的架构图。请根据以下提供的代码仓库信息，生成一个完整的软件架构图。

请仔细分析以下代码仓库信息，生成一个层次分明、结构清晰的软件架构图。在生成架构图时，请注意以下几点：

1. 层次结构：
   - 将系统分为核心层、服务层、接口层、实现层等清晰的层次
   - 每一层内的组件应该具有相似的功能和职责
   - 层与层之间应该有明确的依赖关系

2. 组件布局：
   - 核心组件应该位于架构图的中心位置
   - 服务组件应该围绕核心组件分布
   - 接口和实现应该分别位于不同的层次
   - 外部依赖应该位于架构图的外围

3. 关系表示：
   - 使用不同类型的边来表示不同的关系（依赖、继承、实现等）
   - 确保边的方向清晰，避免交叉
   - 为重要的关系添加说明标签

4. 视觉优化：
   - 相关的组件应该聚集在一起
   - 避免组件之间的重叠
   - 保持适当的间距，使图表清晰易读
   - 使用合适的颜色区分不同类型的组件

5. 元数据：
   - 为每个组件添加清晰的职责说明
   - 标注重要的设计模式和架构决策
   - 说明组件之间的交互方式

### 分析要求
1. 请以JSON格式返回结果，包含以下字段：
   - nodes: 节点列表，每个节点包含id、label、type和metadata字段
   - edges: 边列表，每个边包含id、source、target、type和label字段
   - metadata: 架构图的元数据，包含生成时间、版本、分析方法等信息

2. 节点应基于代码仓库的逻辑组件划分，包括但不限于：
   - 主要模块和类
   - 核心接口和抽象类
   - 设计模式实现
   - 关键数据结构
   - 服务和工厂类

3. 边应表示组件之间的关系，包括：
   - 依赖关系（import/require）
   - 继承关系（extends）
   - 实现关系（implements）
   - 调用关系（如果可从代码中推断）

4. 元数据应包含：
   - 生成时间（ISO格式）
   - 版本（设为"1.0.0"）
   - 分析方法（基于TypeScript类型定义和代码结构）
   - 分析目标的简要总结

### 代码仓库信息
{
    "name": "{repoName}",
    "description": "{repoDescription}",
    "language": "{repoLanguage}",
    "stars": {repoStars},
    "forks": {repoForks},
    "lastUpdated": "{repoLastUpdated}",
    "license": "{repoLicense}"
}

### 现有代码结构和类型信息
{existingDiagram}

### 附加说明
{additionalContext}

注意：
- 确保生成的 JSON 格式正确，不要包含任何额外的文本
- 节点和边的 ID 应该是唯一的
- 所有关系都应该有对应的边
- 布局应该反映系统的实际架构层次`;


export const ARCHITECTURE_OPTIMIZATION_PROMPT = `
你是一位经验丰富的软件架构师，擅长分析和优化软件架构。请根据以下提供的代码仓库信息和现有架构图，提供优化建议。

### 分析要求
1. 请以JSON格式返回结果，包含以下字段：
   - nodes: 优化后的节点列表，每个节点包含id、label、type和metadata字段
   - edges: 优化后的边列表，每个边包含id、source、target、type和label字段
   - suggestions: 优化建议列表，每个建议包含：
     - type: 建议类型（性能/可维护性/可扩展性/安全性等）
     - description: 具体建议内容
     - priority: 优先级（高/中/低）
     - impact: 预期影响
   - reasoning: 优化理由，包含：
     - analysis: 架构分析
     - problems: 发现的问题
     - benefits: 优化后的收益

2. 优化建议应关注：
   - 架构设计模式的应用
   - 代码组织和模块化
   - 性能优化
   - 可维护性提升
   - 可扩展性增强
   - 安全性改进

### 代码仓库信息
{
    "name": "{repoName}",
    "description": "{repoDescription}",
    "language": "{repoLanguage}",
    "stars": {repoStars},
    "forks": {repoForks},
    "lastUpdated": "{repoLastUpdated}",
    "license": "{repoLicense}"
}

### 现有架构图
{existingDiagram}

### 附加说明
{additionalContext}

请确保返回的是有效的JSON格式，不要包含任何其他文本。`; 