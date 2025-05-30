// src/renderers/ExcalidrawRenderer.ts
import { Diagram, Node, Edge, NodeType, EdgeType } from '../types/index.js';
import { ExcalidrawElement, ExcalidrawTextElement, ExcalidrawLineElement } from '../types/excalidraw.js';

export class ExcalidrawRenderer {
  private readonly NODE_WIDTH = 200;
  private readonly NODE_HEIGHT = 100;
  private readonly NODE_PADDING = 50;
  private readonly LAYER_PADDING = 150;
  private readonly HORIZONTAL_PADDING = 100;

  // 节点类型到颜色的映射
  private readonly NODE_COLORS: Partial<Record<NodeType, string>> = {
    service: '#e6f3ff',
    controller: '#fff0e6',
    repository: '#f0ffe6',
    model: '#ffe6e6',
    util: '#f0e6ff',
    config: '#e6fff0',
    domain: '#e6f3ff',
    external: '#f5f5f5',
    database: '#ffe6e6',
    component: '#f0e6ff',
    module: '#e6fff0',
    interface: '#fff0e6',
    class: '#f0ffe6'
  };

  // 边类型到颜色的映射
  private readonly EDGE_COLORS: Partial<Record<EdgeType, string>> = {
    call: '#666666',
    dependency: '#999999',
    inheritance: '#666666',
    implementation: '#999999',
    data: '#4a90e2',
    event: '#50e3c2',
    depends: '#999999',
    uses: '#666666',
    implements: '#999999',
    extends: '#666666',
    contains: '#999999'
  };

  // 架构层次定义
  private readonly ARCHITECTURE_LAYERS = [
    'core',           // 核心业务层
    'application',    // 应用服务层
    'interface',      // 接口适配层
    'infrastructure', // 基础设施层
    'external'        // 外部依赖层
  ];

  // 节点类型到架构层次的映射
  private readonly NODE_TYPE_TO_LAYER: { [key: string]: string } = {
    'domain': 'core',
    'service': 'application',
    'controller': 'interface',
    'repository': 'infrastructure',
    'util': 'infrastructure',
    'config': 'infrastructure',
    'external': 'external'
  };

  render(diagram: Diagram): ExcalidrawElement[] {
    const elements: ExcalidrawElement[] = [];
    
    // 1. 对节点进行分层
    const layeredNodes = this.groupNodesByLayer(diagram.nodes);
    console.log('layer nodes: ', layeredNodes);
    
    // 2. 计算每层节点的位置
    const nodePositions = this.calculateLayeredPositions(layeredNodes);
    console.log('node positions: ', nodePositions);

    // 3. 渲染节点
    diagram.nodes.forEach(node => {
      const position = nodePositions.get(node.id);
      console.log('get position: ', position);
      if (position) {
        const nodeElements = this.createNodeElements(node, position);
        elements.push(...nodeElements);
      }
    });

    // 4. 渲染边
    diagram.edges.forEach(edge => {
      const sourcePosition = nodePositions.get(edge.source);
      const targetPosition = nodePositions.get(edge.target);
      
      if (sourcePosition && targetPosition) {
        const edgeElements = this.createEdgeElements(edge, sourcePosition, targetPosition);
        elements.push(...edgeElements);
      }
    });

    return elements;
  }

  private groupNodesByLayer(nodes: Node[]): Map<string, Node[]> {
    const layeredNodes = new Map<string, Node[]>();
    
    // 初始化层
    this.ARCHITECTURE_LAYERS.forEach(layer => {
      layeredNodes.set(layer, []);
    });

    // 将节点分配到对应的层
    nodes.forEach(node => {
      const layer = this.determineNodeLayer(node);
      const layerNodes = layeredNodes.get(layer) || [];
      layerNodes.push(node);
      layeredNodes.set(layer, layerNodes);
    });

    return layeredNodes;
  }

  private determineNodeLayer(node: Node): string {
    // 1. 首先检查节点的类型
    const typeBasedLayer = this.NODE_TYPE_TO_LAYER[node.type];
    if (typeBasedLayer) {
      return typeBasedLayer;
    }

    // 2. 检查节点的元数据
    if (node.metadata?.layer) {
      return node.metadata.layer;
    }

    // 3. 根据节点的依赖关系推断
    const hasExternalDependencies = node.metadata?.dependencies?.some(dep => 
      dep.type === 'external' || dep.source === 'external'
    );
    if (hasExternalDependencies) {
      return 'external';
    }

    // 4. 默认分配到应用服务层
    return 'application';
  }

  private calculateLayeredPositions(layeredNodes: Map<string, Node[]>): Map<string, { x: number, y: number }> {
    const positions = new Map<string, { x: number, y: number }>();
    let currentY = 0;

    // 从上到下处理每一层
    this.ARCHITECTURE_LAYERS.forEach(layer => {
      const nodes = layeredNodes.get(layer) || [];
      if (nodes.length === 0) return;

      // 计算当前层的节点水平排列
      const totalWidth = nodes.length * (this.NODE_WIDTH + this.HORIZONTAL_PADDING) - this.HORIZONTAL_PADDING;
      let currentX = -totalWidth / 2;

      // 为当前层的每个节点分配位置
      nodes.forEach(node => {
        positions.set(node.id, {
          x: currentX,
          y: currentY
        });
        currentX += this.NODE_WIDTH + this.HORIZONTAL_PADDING;
      });

      // 移动到下一层
      currentY += this.NODE_HEIGHT + this.LAYER_PADDING;
    });

    return positions;
  }

  private createNodeElements(node: Node, position: { x: number, y: number }): ExcalidrawElement[] {
    const elements: ExcalidrawElement[] = [];
    const backgroundColor = this.getNodeColor(node);

    // 创建节点背景
    const background: ExcalidrawElement = {
      id: `node-${node.id}-bg`,
      type: 'rectangle',
      x: position.x,
      y: position.y,
      width: this.NODE_WIDTH,
      height: this.NODE_HEIGHT,
      angle: 0,
      backgroundColor,
      strokeColor: '#666666',
      strokeWidth: 1,
      fillStyle: 'solid',
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      strokeSharpness: 'sharp',
      seed: Math.random(),
      version: 1,
      versionNonce: 0,
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false
    };
    elements.push(background);

    // 创建节点文本
    const text: ExcalidrawTextElement = {
      ...background,
      id: `node-${node.id}-text`,
      type: 'text',
      text: node.label,
      fontSize: 16,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      baseline: 20
    };
    elements.push(text);

    return elements;
  }

  private createEdgeElements(edge: Edge, source: { x: number, y: number }, target: { x: number, y: number }): ExcalidrawElement[] {
    const elements: ExcalidrawElement[] = [];
    const color = this.getEdgeColor(edge);

    // 计算边的起点和终点
    const startX = source.x + this.NODE_WIDTH / 2;
    const startY = source.y + this.NODE_HEIGHT;
    const endX = target.x + this.NODE_WIDTH / 2;
    const endY = target.y;

    // 创建边线
    const line: ExcalidrawLineElement = {
      id: `edge-${edge.id}-line`,
      type: 'line',
      x: startX,
      y: startY,
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
      angle: 0,
      points: [[0, 0], [endX - startX, endY - startY]],
      lastCommittedPoint: [endX - startX, endY - startY],
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: 'arrow',
      strokeColor: color,
      backgroundColor: 'transparent',
      strokeWidth: 1,
      fillStyle: 'solid',
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      strokeSharpness: 'sharp',
      seed: Math.random(),
      version: 1,
      versionNonce: 0,
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false
    };
    elements.push(line);

    // 创建边标签
    if (edge.label) {
      const labelX = (startX + endX) / 2;
      const labelY = (startY + endY) / 2;
      const label: ExcalidrawTextElement = {
        id: `edge-${edge.id}-label`,
        type: 'text',
        x: labelX - 20,
        y: labelY - 10,
        width: 40,
        height: 20,
        angle: 0,
        text: edge.label,
        fontSize: 12,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseline: 12,
        strokeColor: color,
        backgroundColor: 'transparent',
        strokeWidth: 1,
        fillStyle: 'solid',
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        strokeSharpness: 'sharp',
        seed: Math.random(),
        version: 1,
        versionNonce: 0,
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false
      };
      elements.push(label);
    }

    return elements;
  }

  private getNodeColor(node: Node): string {
    return this.NODE_COLORS[node.type] || '#ffffff';
  }

  private getEdgeColor(edge: Edge): string {
    return this.EDGE_COLORS[edge.type] || '#666666';
  }

  private getDependencies(node: Node): string[] {
    return (node.metadata?.dependencies || []).map(dep => 
      typeof dep === 'string' ? dep : dep.source
    );
  }
}