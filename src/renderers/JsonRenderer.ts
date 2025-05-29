import { Diagram } from '../types/index.js';

export class JsonRenderer {
  render(diagram: Diagram): string {
    return JSON.stringify(diagram, null, 2);
  }
} 