// src/renderers/ExcalidrawRenderer.ts
import { Diagram, Node, Edge, NodeType, EdgeType } from '../types/index.js';
import { ExcalidrawElement, ExcalidrawTextElement, ExcalidrawLineElement } from '@excalidraw/excalidraw/types/element/types';

export class ExcalidrawRenderer {
  private readonly NODE_WIDTH = 200;
  private readonly NODE_HEIGHT = 100;
  private readonly NODE_PADDING = 20;
  private readonly LEVEL_HEIGHT = 200;
  private readonly NODE_COLORS: Record<NodeType, string> = {
    interface: '#FFB6C1', // LightPink
    class: '#98FB98',     // PaleGreen
    function: '#87CEEB',  // SkyBlue
    module: '#DDA0DD',    // Plum
    service: '#F0E68C',   // Khaki
    component: '#E6E6FA', // Lavender
    database: '#FFA07A',  // LightSalmon
    queue: '#B0E0E6',     // PowderBlue
    cache: '#FFE4B5',     // Moccasin
    api: '#D8BFD8',       // Thistle
    file: '#F5F5DC',      // Beige
    directory: '#E0FFFF', // LightCyan
    external: '#FFDAB9'   // PeachPuff
  };

  private readonly EDGE_COLORS: Record<EdgeType, string> = {
    depends: '#808080',   // Gray
    implements: '#4B0082', // Indigo
    extends: '#800080',   // Purple
    calls: '#008000',     // Green
    contains: '#000080',  // Navy
    uses: '#800000',      // Maroon
    belongs: '#008080',   // Teal
    connects: '#000000'   // Black
  };

  render(diagram: Diagram): ExcalidrawElement[] {
    const elements: ExcalidrawElement[] = [];
    const nodePositions = this.calculateNodePositions(diagram.nodes);

    // 渲染节点
    diagram.nodes.forEach((node, index) => {
      const position = nodePositions[index];
      if (position) {
        const nodeElements = this.createNodeElements(node, position);
        elements.push(...nodeElements);
      }
    });

    // 渲染边
    diagram.edges.forEach(edge => {
      const sourceIndex = diagram.nodes.findIndex(n => n.id === edge.source);
      const targetIndex = diagram.nodes.findIndex(n => n.id === edge.target);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const sourcePosition = nodePositions[sourceIndex];
        const targetPosition = nodePositions[targetIndex];
        
        if (sourcePosition && targetPosition) {
          const edgeElements = this.createEdgeElements(edge, sourcePosition, targetPosition);
          elements.push(...edgeElements);
        }
      }
    });

    return elements;
  }

  private calculateNodePositions(nodes: Node[]): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const levels = this.calculateNodeLevels(nodes);
    const maxNodesInLevel = Math.max(...Object.values(levels).map(nodes => nodes.length));

    Object.entries(levels).forEach(([level, levelNodes], levelIndex) => {
      const y = levelIndex * this.LEVEL_HEIGHT;
      const totalWidth = levelNodes.length * (this.NODE_WIDTH + this.NODE_PADDING);
      const startX = -totalWidth / 2;

      levelNodes.forEach((node, index) => {
        positions.push({
          x: startX + index * (this.NODE_WIDTH + this.NODE_PADDING),
          y
        });
      });
    });

    return positions;
  }

  private calculateNodeLevels(nodes: Node[]): Record<number, Node[]> {
    const levels: Record<number, Node[]> = {};
    const visited = new Set<string>();
    const queue: { node: Node; level: number }[] = [];

    // 找到所有没有入边的节点作为起始点
    const startNodes = nodes.filter(node => 
      !nodes.some(n => n.edges?.some((e: Edge) => e.target === node.id))
    );

    startNodes.forEach(node => {
      queue.push({ node, level: 0 });
      visited.add(node.id);
    });

    while (queue.length > 0) {
      const { node, level } = queue.shift()!;
      
      if (!levels[level]) {
        levels[level] = [];
      }
      levels[level].push(node);

      // 处理所有出边
      node.edges?.forEach((edge: Edge) => {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode && !visited.has(targetNode.id)) {
          queue.push({ node: targetNode, level: level + 1 });
          visited.add(targetNode.id);
        }
      });
    }

    return levels;
  }

  private createNodeElements(node: Node, position: { x: number; y: number }): ExcalidrawElement[] {
    const elements: ExcalidrawElement[] = [];

    // 创建节点背景
    const background: ExcalidrawElement = {
      type: 'rectangle',
      x: position.x,
      y: position.y,
      width: this.NODE_WIDTH,
      height: this.NODE_HEIGHT,
      backgroundColor: this.NODE_COLORS[node.type],
      strokeColor: '#000000',
      strokeWidth: 2,
      fillStyle: 'solid',
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [node.id],
      seed: Math.random(),
      version: 1,
      versionNonce: Math.random()
    };
    elements.push(background);

    // 创建节点标签
    const label: ExcalidrawTextElement = {
      type: 'text',
      x: position.x + this.NODE_PADDING,
      y: position.y + this.NODE_PADDING,
      width: this.NODE_WIDTH - 2 * this.NODE_PADDING,
      height: 20,
      text: node.label,
      fontSize: 16,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [node.id],
      seed: Math.random(),
      version: 1,
      versionNonce: Math.random()
    };
    elements.push(label);

    // 创建节点类型标签
    const typeLabel: ExcalidrawTextElement = {
      type: 'text',
      x: position.x + this.NODE_PADDING,
      y: position.y + this.NODE_HEIGHT - this.NODE_PADDING - 20,
      width: this.NODE_WIDTH - 2 * this.NODE_PADDING,
      height: 20,
      text: `[${node.type}]`,
      fontSize: 12,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [node.id],
      seed: Math.random(),
      version: 1,
      versionNonce: Math.random()
    };
    elements.push(typeLabel);

    return elements;
  }

  private createEdgeElements(
    edge: Edge,
    sourcePosition: { x: number; y: number },
    targetPosition: { x: number; y: number }
  ): ExcalidrawElement[] {
    const elements: ExcalidrawElement[] = [];

    // 计算边的起点和终点
    const startX = sourcePosition.x + this.NODE_WIDTH / 2;
    const startY = sourcePosition.y + this.NODE_HEIGHT;
    const endX = targetPosition.x + this.NODE_WIDTH / 2;
    const endY = targetPosition.y;

    // 创建边线
    const line: ExcalidrawLineElement = {
      type: 'line',
      x: startX,
      y: startY,
      width: endX - startX,
      height: endY - startY,
      strokeColor: this.EDGE_COLORS[edge.type],
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [edge.id],
      seed: Math.random(),
      version: 1,
      versionNonce: Math.random(),
      points: [
        [0, 0],
        [endX - startX, endY - startY]
      ]
    };
    elements.push(line);

    // 创建边标签
    const label: ExcalidrawTextElement = {
      type: 'text',
      x: (startX + endX) / 2 - 50,
      y: (startY + endY) / 2 - 10,
      width: 100,
      height: 20,
      text: edge.label,
      fontSize: 12,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [edge.id],
      seed: Math.random(),
      version: 1,
      versionNonce: Math.random()
    };
    elements.push(label);

    return elements;
  }
}