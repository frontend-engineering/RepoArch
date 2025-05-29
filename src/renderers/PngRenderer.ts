import { Diagram } from '../types/index.js';
import { SvgRenderer } from './SvgRenderer.js';
import sharp from 'sharp';

export class PngRenderer {
  private svgRenderer: SvgRenderer;

  constructor() {
    this.svgRenderer = new SvgRenderer();
  }

  async render(diagram: Diagram): Promise<string> {
    // First generate SVG
    const svg = await this.svgRenderer.render(diagram);

    // Convert SVG to PNG
    try {
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

      return pngBuffer.toString('base64');
    } catch (error) {
      console.error('Error converting SVG to PNG:', error);
      throw error;
    }
  }
} 