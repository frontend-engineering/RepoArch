import { Diagram, Node, Edge } from '../types/index.js';
import mermaid from 'mermaid';

export class SvgRenderer {
  async render(diagram: Diagram): Promise<string> {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });

    // Convert diagram to mermaid syntax
    const mermaidSyntax = this.convertToMermaid(diagram);

    // Generate SVG
    try {
      const { svg } = await mermaid.render('diagram', mermaidSyntax);
      return svg;
    } catch (error) {
      console.error('Error generating SVG:', error);
      throw error;
    }
  }

  private convertToMermaid(diagram: Diagram): string {
    const lines: string[] = ['graph TD'];
    
    // Add nodes
    diagram.nodes.forEach(node => {
      const style = this.getNodeStyle(node.type);
      lines.push(`    ${node.id}["${node.label}"]${style}`);
    });

    // Add edges
    diagram.edges.forEach(edge => {
      const style = this.getEdgeStyle(edge.type);
      lines.push(`    ${edge.source} -->|${edge.label || ''}| ${edge.target}${style}`);
    });

    return lines.join('\n');
  }

  private getNodeStyle(type: Node['type']): string {
    switch (type) {
      case 'service':
        return ':::service';
      case 'database':
        return ':::database';
      case 'component':
        return ':::component';
      case 'external':
        return ':::external';
      default:
        return '';
    }
  }

  private getEdgeStyle(type: Edge['type']): string {
    switch (type) {
      case 'depends':
        return ':::depends';
      case 'uses':
        return ':::uses';
      case 'implements':
        return ':::implements';
      case 'extends':
        return ':::extends';
      default:
        return '';
    }
  }
} 